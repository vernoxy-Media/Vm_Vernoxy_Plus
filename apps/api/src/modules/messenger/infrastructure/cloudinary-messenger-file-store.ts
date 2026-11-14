import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { randomBytes } from 'crypto';
import * as https from 'https';
import type { Readable } from 'stream';
import type { MessengerFileStorePort } from '../domain/ports/messenger-file-store.port';
import { LocalMessengerFileStore } from './local-messenger-file-store';

/** Marks a stored path as living in Cloudinary. Paths without it are older files on the local disk. */
const CLOUD_PREFIX = 'cld/';

/**
 * Chat files, kept where STORAGE_DRIVER says. On a host whose disk is wiped on every deploy (Render) the local disk
 * loses every picture and file, so with STORAGE_DRIVER=cloudinary they go to Cloudinary instead. They are stored as
 * private ("authenticated") files and only this server fetches them, after the usual check that the person is in the
 * conversation; nobody gets a link to Cloudinary.
 */
@Injectable()
export class CloudinaryMessengerFileStore implements MessengerFileStorePort {
  private readonly logger = new Logger(CloudinaryMessengerFileStore.name);
  private readonly useCloud: boolean;

  constructor(private readonly local: LocalMessengerFileStore) {
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
    this.useCloud = process.env.STORAGE_DRIVER === 'cloudinary' && Boolean(cloudName && apiKey && apiSecret);
    if (this.useCloud) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
      this.logger.log('Chat files are stored in Cloudinary.');
    } else {
      this.logger.warn('Chat files are stored on the local disk (STORAGE_DRIVER is not cloudinary, or its keys are missing).');
    }
  }

  async save(conversationId: number, originalName: string, buffer: Buffer): Promise<string> {
    if (!this.useCloud) return this.local.save(conversationId, originalName, buffer);

    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';
    // A raw file keeps its extension in the public id, so the file name's end (its extension) is kept above.
    const publicId = `pulse/messenger/${conversationId}/${randomBytes(8).toString('hex')}_${safe}`;
    await new Promise<void>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { public_id: publicId, resource_type: 'raw', type: 'authenticated', overwrite: false },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Could not upload a chat file to Cloudinary: ${error?.message ?? 'empty answer'}`);
            reject(error ?? new Error('Cloudinary returned no answer'));
          } else {
            resolve();
          }
        },
      );
      upload.end(buffer);
    });
    return `${CLOUD_PREFIX}${publicId}`;
  }

  async open(relativePath: string): Promise<Readable | null> {
    if (!relativePath.startsWith(CLOUD_PREFIX)) return this.local.open(relativePath);
    if (!this.useCloud) return null;

    const publicId = relativePath.slice(CLOUD_PREFIX.length);
    const url = cloudinary.url(publicId, { resource_type: 'raw', type: 'authenticated', sign_url: true, secure: true });
    return new Promise<Readable | null>((resolve) => {
      https
        .get(url, (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            res.resume();
            this.logger.warn(`Cloudinary answered ${res.statusCode} for a chat file.`);
            resolve(null);
          } else {
            resolve(res);
          }
        })
        .on('error', (err) => {
          this.logger.warn(`Could not read a chat file from Cloudinary: ${err.message}`);
          resolve(null);
        });
    });
  }
}
