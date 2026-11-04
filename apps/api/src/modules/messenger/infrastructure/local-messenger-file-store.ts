import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { Readable } from 'stream';
import type { MessengerFileStorePort } from '../domain/ports/messenger-file-store.port';

/** Finds the workspace `storage` folder the same way no matter whether the API runs from src or dist. */
function storageRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 9; i++) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return path.join(dir, 'storage');
    dir = path.dirname(dir);
  }
  return path.resolve(process.cwd(), 'storage');
}

@Injectable()
export class LocalMessengerFileStore implements MessengerFileStorePort {
  private readonly root = path.join(storageRoot(), 'messenger');

  async save(conversationId: number, originalName: string, buffer: Buffer): Promise<string> {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';
    const relative = path.posix.join(String(conversationId), `${randomBytes(8).toString('hex')}_${safe}`);
    const target = path.join(this.root, relative);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, buffer);
    return relative;
  }

  open(relativePath: string): Readable | null {
    const target = path.resolve(this.root, relativePath);
    // Never leave the messenger folder, whatever the stored value says.
    if (!target.startsWith(this.root + path.sep) || !fs.existsSync(target)) return null;
    return fs.createReadStream(target);
  }
}
