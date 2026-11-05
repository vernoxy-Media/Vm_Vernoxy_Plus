import { StorageNamespace } from '../../domain/storage.validator';

export interface FileStoragePort {
  put(key: string, buffer: Buffer, contentType: string, namespace?: StorageNamespace): Promise<void>;
  exists(key: string, namespace?: StorageNamespace): Promise<boolean>;
  openReadStream(key: string, namespace?: StorageNamespace): Promise<NodeJS.ReadableStream>;
  archive(key: string, namespace?: StorageNamespace): Promise<void>; // Moves, never deletes
  getSignedUrl(key: string, ttlSeconds?: number): string; // profile-photos only
  /**
   * Like getSignedUrl, but null when the file is not in this storage (for example a photo uploaded on another
   * machine that shares the database). Callers show initials instead of a link that would answer 404.
   */
  getSignedUrlIfExists(key: string, ttlSeconds?: number): string | null;
  verifySignedUrl(key: string, expires: number, signature: string): boolean;
}
