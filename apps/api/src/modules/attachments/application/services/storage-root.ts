import * as fs from 'fs';
import * as path from 'path';

/**
 * Where uploaded files live on disk. Upload and download must agree on this, so both ask here.
 * The first folder is where new files are written (STORAGE_ROOT if set, otherwise <repo>/storage); download also
 * looks in the other folders so a file saved by an older build is still found.
 */
export function storageRoots(): string[] {
  const repoRoot = path.resolve(__dirname, '../../../../../../..');
  const roots = [
    process.env.STORAGE_ROOT ? path.resolve(process.env.STORAGE_ROOT) : null,
    path.resolve(repoRoot, 'storage'),
    path.resolve(process.cwd(), 'storage'),
    path.resolve(repoRoot, 'apps', 'storage'),
  ].filter((r): r is string => Boolean(r));
  return Array.from(new Set(roots));
}

/** The folder new uploads go to. */
export const uploadRoot = (): string => storageRoots()[0];

/** The file on disk for a path relative to a storage root, or null when it is in none of them. */
export function findStoredFile(relativePath: string): string | null {
  for (const root of storageRoots()) {
    const candidate = path.resolve(root, relativePath);
    // Never leave the storage folder, whatever the saved path says
    if (!candidate.startsWith(root + path.sep)) continue;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
