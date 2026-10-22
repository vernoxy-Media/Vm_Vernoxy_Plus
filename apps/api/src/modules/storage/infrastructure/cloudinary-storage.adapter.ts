import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import * as https from 'https';
import * as http from 'http';
import { FileStoragePort } from '../application/ports/file-storage.port';
import { StorageNamespace } from '../domain/storage.validator';
import { LocalDiskStorageAdapter } from './local-disk-storage.adapter';

@Injectable()
export class CloudinaryStorageAdapter implements FileStoragePort {
  private readonly logger = new Logger(CloudinaryStorageAdapter.name);
  private readonly isConfigured: boolean;

  constructor(private readonly localFallback: LocalDiskStorageAdapter) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary storage driver initialized successfully.');
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) not provided. Falling back to local/tmp disk storage until configured.',
      );
    }
  }

  async put(key: string, buffer: Buffer, contentType: string, namespace: StorageNamespace = 'profile-photos'): Promise<void> {
    if (!this.isConfigured) {
      return this.localFallback.put(key, buffer, contentType, namespace);
    }

    const folder = `pulse/${namespace}`;
    const publicId = key.replace(/\.[^/.]+$/, ''); // Remove extension for Cloudinary public_id

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'auto',
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Failed to upload to Cloudinary: ${error?.message || 'Unknown error'}`);
            reject(error || new Error('Cloudinary upload returned empty response'));
          } else {
            resolve();
          }
        },
      );
      uploadStream.end(buffer);
    });
  }

  async exists(key: string, namespace: StorageNamespace = 'profile-photos'): Promise<boolean> {
    if (!this.isConfigured) {
      return this.localFallback.exists(key, namespace);
    }

    const publicId = `pulse/${namespace}/${key.replace(/\.[^/.]+$/, '')}`;
    try {
      await cloudinary.api.resource(publicId);
      return true;
    } catch (err: any) {
      if (err?.error?.http_code === 404 || err?.http_code === 404) {
        return false;
      }
      throw err;
    }
  }

  async openReadStream(key: string, namespace: StorageNamespace = 'profile-photos'): Promise<NodeJS.ReadableStream> {
    if (!this.isConfigured) {
      return this.localFallback.openReadStream(key, namespace);
    }

    const publicId = `pulse/${namespace}/${key.replace(/\.[^/.]+$/, '')}`;
    const url = cloudinary.url(publicId, { secure: true });

    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Failed to stream from Cloudinary: HTTP ${res.statusCode}`));
        } else {
          resolve(res);
        }
      }).on('error', reject);
    });
  }

  async archive(key: string, namespace: StorageNamespace = 'profile-photos'): Promise<void> {
    if (!this.isConfigured) {
      return this.localFallback.archive(key, namespace);
    }

    const fromPublicId = `pulse/${namespace}/${key.replace(/\.[^/.]+$/, '')}`;
    const toPublicId = `pulse/archive/${namespace}/${key.replace(/\.[^/.]+$/, '')}`;

    try {
      await cloudinary.uploader.rename(fromPublicId, toPublicId, { overwrite: true });
    } catch (err: any) {
      this.logger.warn(`Cloudinary archive rename failed: ${err.message}`);
    }
  }

  getSignedUrl(key: string, ttlSeconds: number = 3600): string {
    if (!this.isConfigured) {
      return this.localFallback.getSignedUrl(key, ttlSeconds);
    }

    const publicId = `pulse/profile-photos/${key.replace(/\.[^/.]+$/, '')}`;
    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
    });
  }

  verifySignedUrl(key: string, expires: number, signature: string): boolean {
    if (!this.isConfigured) {
      return this.localFallback.verifySignedUrl(key, expires, signature);
    }

    if (Date.now() / 1000 > expires) {
      return false;
    }
    return true;
  }
}
