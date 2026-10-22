import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { FileStoragePort } from '../application/ports/file-storage.port';
import { StorageValidator, StorageNamespace } from '../domain/storage.validator';

@Injectable()
export class LocalDiskStorageAdapter implements FileStoragePort, OnModuleInit {
  private readonly storageRootDir: string;
  private readonly dirMap: Record<StorageNamespace, string>;
  private readonly archiveDirMap: Record<StorageNamespace, string>;
  private readonly fileUrlSecret: string;
  private readonly defaultTtlSeconds: number;
  private readonly isServerless: boolean;

  constructor() {
    this.isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_BUILDER);
    // Resolve storage root directory from repository root or serverless tmpdir
    const repoRoot = path.resolve(__dirname, '../../../../../../');
    const defaultDir = this.isServerless ? path.join(os.tmpdir(), 'vernoxy-pulse-storage') : 'storage';
    const configuredDir = process.env.STORAGE_LOCAL_DIR || defaultDir;
    this.storageRootDir = path.isAbsolute(configuredDir)
      ? configuredDir
      : path.resolve(repoRoot, configuredDir);

    this.dirMap = {
      'profile-photos': path.resolve(this.storageRootDir, 'profile-photos'),
      'imports': path.resolve(this.storageRootDir, 'imports'),
      'import-reports': path.resolve(this.storageRootDir, 'import-reports'),
    };

    this.archiveDirMap = {
      'profile-photos': path.resolve(this.storageRootDir, 'archive/profile-photos'),
      'imports': path.resolve(this.storageRootDir, 'archive/imports'),
      'import-reports': path.resolve(this.storageRootDir, 'archive/import-reports'),
    };

    this.fileUrlSecret = process.env.FILE_URL_SECRET || 'vernoxy-pulse-file-url-secret-minimum-32-chars-long';
    this.defaultTtlSeconds = Number(process.env.FILE_URL_TTL_SECONDS) || 3600;
  }

  onModuleInit() {
    this.ensureDirectoriesWritable();
  }

  public ensureDirectoriesWritable(): void {
    if (!this.fileUrlSecret || this.fileUrlSecret.length < 32) {
      throw new Error(
        'Startup failure: FILE_URL_SECRET is missing or less than 32 characters in configuration.',
      );
    }

    const namespaces: StorageNamespace[] = ['profile-photos', 'imports', 'import-reports'];

    try {
      for (const ns of namespaces) {
        const dir = this.dirMap[ns];
        const archiveDir = this.archiveDirMap[ns];

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true });
        }

        fs.accessSync(dir, fs.constants.W_OK);
        fs.accessSync(archiveDir, fs.constants.W_OK);
      }
    } catch (err: any) {
      if (this.isServerless) {
        console.warn(`[LocalDiskStorageAdapter] Serverless storage warning: ${err.message}`);
        return;
      }
      throw new Error(
        `Startup failure: Storage directory is not writable or cannot be created: ${err.message}`,
      );
    }
  }

  private resolveKeyPath(key: string, namespace: StorageNamespace = 'profile-photos'): string {
    if (!StorageValidator.isValidStorageKey(key, namespace)) {
      throw new Error(`Invalid storage key format for namespace '${namespace}': ${key}`);
    }

    const targetDir = this.dirMap[namespace];
    const resolved = path.resolve(targetDir, key);
    // Path traversal guard
    if (!resolved.startsWith(targetDir + path.sep)) {
      throw new Error(`Path traversal detected for key: ${key}`);
    }

    return resolved;
  }

  async put(key: string, buffer: Buffer, contentType: string, namespace: StorageNamespace = 'profile-photos'): Promise<void> {
    const filePath = this.resolveKeyPath(key, namespace);
    await fs.promises.writeFile(filePath, buffer);
  }

  async exists(key: string, namespace: StorageNamespace = 'profile-photos'): Promise<boolean> {
    try {
      const filePath = this.resolveKeyPath(key, namespace);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  async openReadStream(key: string, namespace: StorageNamespace = 'profile-photos'): Promise<NodeJS.ReadableStream> {
    const filePath = this.resolveKeyPath(key, namespace);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in storage');
    }
    return fs.createReadStream(filePath);
  }

  async archive(key: string, namespace: StorageNamespace = 'profile-photos'): Promise<void> {
    try {
      const sourcePath = this.resolveKeyPath(key, namespace);
      if (!fs.existsSync(sourcePath)) {
        return;
      }
      const timestamp = Date.now();
      const archiveFileName = `${timestamp}-${key}`;
      const targetArchiveDir = this.archiveDirMap[namespace];
      const destPath = path.resolve(targetArchiveDir, archiveFileName);

      // Verify destPath stays within archive dir
      if (!destPath.startsWith(targetArchiveDir + path.sep)) {
        throw new Error('Path traversal guard failed for archive destination');
      }

      await fs.promises.rename(sourcePath, destPath);
    } catch (err: any) {
      throw err;
    }
  }

  getSignedUrl(key: string, ttlSeconds?: number): string {
    // Only profile-photos are served via signed URLs
    if (!StorageValidator.isValidStorageKey(key, 'profile-photos')) {
      throw new Error(`Cannot sign invalid storage key or non-profile-photo key: ${key}`);
    }
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const expires = Math.floor(Date.now() / 1000) + ttl;
    const signature = crypto
      .createHmac('sha256', this.fileUrlSecret)
      .update(`${key}:${expires}`)
      .digest('hex');

    return `/api/v1/files/profile-photos/${key}?exp=${expires}&sig=${signature}`;
  }

  verifySignedUrl(key: string, expires: number, signature: string): boolean {
    if (!StorageValidator.isValidStorageKey(key, 'profile-photos')) {
      return false;
    }

    if (typeof expires !== 'number' || isNaN(expires) || expires <= Math.floor(Date.now() / 1000)) {
      return false;
    }

    if (!signature || typeof signature !== 'string' || signature.length !== 64) {
      return false;
    }

    const expectedSig = crypto
      .createHmac('sha256', this.fileUrlSecret)
      .update(`${key}:${expires}`)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      const actualBuf = Buffer.from(signature, 'hex');
      if (expectedBuf.length !== actualBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }
}
