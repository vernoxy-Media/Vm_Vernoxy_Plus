import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { EmployeePhotoStoragePort } from '../../application/ports/employee-photo-storage.port';
import {
  FileStoragePort,
  ImageProcessorPort,
  STORAGE_TOKENS,
  StorageValidator,
} from '../../../storage/public-api';
import { UnprocessableDomainError } from '../../domain/errors/organization.errors';

@Injectable()
export class EmployeePhotoStorageAdapter implements EmployeePhotoStoragePort {
  constructor(
    @Inject(STORAGE_TOKENS.FileStoragePort)
    private readonly fileStorage: FileStoragePort,
    @Inject(STORAGE_TOKENS.ImageProcessorPort)
    private readonly imageProcessor: ImageProcessorPort,
  ) {}

  async putPhoto(buffer: Buffer): Promise<{ key: string }> {
    // 1. Magic bytes detection
    const format = StorageValidator.detectMagicBytes(buffer);
    if (!format) {
      throw new UnprocessableDomainError(
        'UNSUPPORTED_MEDIA_TYPE',
        'Unsupported image format. Only JPEG and PNG are allowed.',
        'file',
      );
    }

    // 2. Process with Sharp
    const processed = await this.imageProcessor.processProfilePhoto(buffer);

    // 3. Generate key: 16 random bytes hex + .webp
    const key = `${crypto.randomBytes(16).toString('hex')}.webp`;

    // 4. Save to storage
    await this.fileStorage.put(key, processed.buffer, 'image/webp');

    return { key };
  }

  async archivePhoto(key: string): Promise<void> {
    if (!StorageValidator.isValidStorageKey(key)) {
      return;
    }
    await this.fileStorage.archive(key);
  }

  getSignedPhotoUrl(key: string): string {
    return this.fileStorage.getSignedUrl(key);
  }
}
