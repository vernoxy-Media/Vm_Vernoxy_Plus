import * as crypto from 'crypto';

export type SupportedImageFormat = 'jpeg' | 'png';
export type StorageNamespace = 'profile-photos' | 'imports' | 'import-reports';

export class StorageValidator {
  private static readonly PROFILE_PHOTO_KEY_REGEX = /^[a-f0-9]{32}\.webp$/;
  private static readonly DATA_TRANSFER_KEY_REGEX = /^[a-f0-9]{32}\.(xlsx|csv)$/;

  /**
   * Validates storage key format per namespace:
   * - profile-photos: exactly 16 random bytes in hex (32 hex chars) + ".webp"
   * - imports / import-reports: exactly 16 random bytes in hex (32 hex chars) + ".xlsx" or ".csv"
   * Rejects path traversals, wrong extensions, uppercase characters, or invalid lengths.
   */
  static isValidStorageKey(key: string, namespace: StorageNamespace = 'profile-photos'): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }
    if (namespace === 'profile-photos') {
      return this.PROFILE_PHOTO_KEY_REGEX.test(key);
    }
    if (namespace === 'imports' || namespace === 'import-reports') {
      return this.DATA_TRANSFER_KEY_REGEX.test(key);
    }
    return false;
  }

  /**
   * Generates a random storage key: 16 random bytes hex (32 chars) + extension
   */
  static generateStorageKey(extension: 'xlsx' | 'csv' | 'webp'): string {
    return `${crypto.randomBytes(16).toString('hex')}.${extension}`;
  }

  /**
   * Detects image format from magic bytes:
   * - JPEG: FF D8 FF
   * - PNG: 89 50 4E 47 0D 0A 1A 0A
   * Returns 'jpeg' | 'png' | null (if unsupported, such as SVG, GIF, WebP, HEIC, PDF).
   */
  static detectMagicBytes(buffer: Buffer): SupportedImageFormat | null {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 8) {
      return null;
    }

    // JPEG check: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpeg';
    }

    // PNG check: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'png';
    }

    return null;
  }
}
