import { StorageNamespace } from '../../domain/storage.validator';

export interface FileStoragePort {
  put(key: string, buffer: Buffer, contentType: string, namespace?: StorageNamespace): Promise<void>;
  exists(key: string, namespace?: StorageNamespace): Promise<boolean>;
  openReadStream(key: string, namespace?: StorageNamespace): Promise<NodeJS.ReadableStream>;
  archive(key: string, namespace?: StorageNamespace): Promise<void>; // Moves, never deletes
  getSignedUrl(key: string, ttlSeconds?: number): string; // profile-photos only
  verifySignedUrl(key: string, expires: number, signature: string): boolean;
}
