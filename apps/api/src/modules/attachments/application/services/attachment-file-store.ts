import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { randomBytes } from 'crypto';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { uploadRoot } from './storage-root';

/** A stored path that starts with this lives in Cloudinary; every other path is a file on the local disk. */
export const CLOUD_URL_PREFIX = 'cld:';

/**
 * Uploaded files (discussion pictures, bug screenshots, documents), kept where STORAGE_DRIVER says.
 * Render's disk is wiped on every deploy and restart, so on Render the files must go to Cloudinary or they are gone
 * the next day. They are private ("authenticated") files and only this server reads them, through the download route.
 * Files saved earlier on the local disk keep working.
 */
@Injectable()
export class AttachmentFileStore {
  private readonly logger = new Logger(AttachmentFileStore.name);
  private readonly useCloud: boolean;

  constructor() {
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
    this.useCloud = process.env.STORAGE_DRIVER === 'cloudinary' && Boolean(cloudName && apiKey && apiSecret);
    if (this.useCloud) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
      this.logger.log('Attachments are stored in Cloudinary.');
    } else {
      this.logger.warn('Attachments are stored on the local disk (STORAGE_DRIVER is not cloudinary, or its keys are missing). On a host that wipes its disk they will disappear.');
    }
  }

  /** Saves the file and returns the value to keep in `attachments.file_url`. */
  async save(entityType: string, entityId: number, originalName: string, buffer: Buffer): Promise<string> {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';

    if (this.useCloud) {
      // A raw file keeps its extension in the public id, so the end of the name is kept.
      const publicId = `pulse/attachments/${entityType}/${entityId}/${randomBytes(8).toString('hex')}_${safe}`;
      await new Promise<void>((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { public_id: publicId, resource_type: 'raw', type: 'authenticated', overwrite: false },
          (error, result) => {
            if (error || !result) {
              this.logger.error(`Could not upload an attachment to Cloudinary: ${error?.message ?? 'empty answer'}`);
              reject(error ?? new Error('Cloudinary returned no answer'));
            } else {
              resolve();
            }
          },
        );
        upload.end(buffer);
      });
      return `${CLOUD_URL_PREFIX}${publicId}`;
    }

    const dir = path.resolve(uploadRoot(), 'attachments', entityType, String(entityId));
    await fs.promises.mkdir(dir, { recursive: true });
    const diskName = `${Date.now()}_${safe}`;
    await fs.promises.writeFile(path.resolve(dir, diskName), buffer);
    return `/files/attachments/${entityType}/${entityId}/${diskName}`;
  }

  /** The whole file when it is in Cloudinary, or null when it is not there (or Cloudinary is not set up). */
  async readCloud(fileUrl: string): Promise<Buffer | null> {
    if (!fileUrl.startsWith(CLOUD_URL_PREFIX) || !this.useCloud) return null;
    const url = cloudinary.url(fileUrl.slice(CLOUD_URL_PREFIX.length), { resource_type: 'raw', type: 'authenticated', sign_url: true, secure: true });
    return new Promise<Buffer | null>((resolve) => {
      https
        .get(url, (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            res.resume();
            this.logger.warn(`Cloudinary answered ${res.statusCode} for an attachment.`);
            resolve(null);
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', () => resolve(null));
        })
        .on('error', (err) => {
          this.logger.warn(`Could not read an attachment from Cloudinary: ${err.message}`);
          resolve(null);
        });
    });
  }
}
