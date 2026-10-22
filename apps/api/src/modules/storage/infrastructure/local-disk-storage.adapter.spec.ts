import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { LocalDiskStorageAdapter } from './local-disk-storage.adapter';

describe('LocalDiskStorageAdapter', () => {
  let tempDir: string;
  let adapter: LocalDiskStorageAdapter;
  const testSecret = '0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'));
    process.env.STORAGE_LOCAL_DIR = tempDir;
    process.env.FILE_URL_SECRET = testSecret;
    process.env.FILE_URL_TTL_SECONDS = '3600';

    adapter = new LocalDiskStorageAdapter();
    adapter.ensureDirectoriesWritable();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Signing and Verification', () => {
    const validKey = '0123456789abcdef0123456789abcdef.webp';

    it('generates a valid signed relative URL and verifies successfully', () => {
      const url = adapter.getSignedUrl(validKey, 300);
      expect(url).toMatch(new RegExp(`^/api/v1/files/profile-photos/${validKey}\\?exp=\\d+&sig=[a-f0-9]{64}$`));

      const parsed = new URL(`http://localhost${url}`);
      const exp = Number(parsed.searchParams.get('exp'));
      const sig = parsed.searchParams.get('sig')!;

      expect(adapter.verifySignedUrl(validKey, exp, sig)).toBe(true);
    });

    it('rejects tampered key', () => {
      const url = adapter.getSignedUrl(validKey, 300);
      const parsed = new URL(`http://localhost${url}`);
      const exp = Number(parsed.searchParams.get('exp'));
      const sig = parsed.searchParams.get('sig')!;

      const tamperedKey = 'fedcba9876543210fedcba9876543210.webp';
      expect(adapter.verifySignedUrl(tamperedKey, exp, sig)).toBe(false);
    });

    it('rejects tampered expiry timestamp', () => {
      const url = adapter.getSignedUrl(validKey, 300);
      const parsed = new URL(`http://localhost${url}`);
      const exp = Number(parsed.searchParams.get('exp'));
      const sig = parsed.searchParams.get('sig')!;

      // tampered exp
      expect(adapter.verifySignedUrl(validKey, exp + 100, sig)).toBe(false);
    });

    it('rejects expired timestamp', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 10;
      const sig = crypto
        .createHmac('sha256', testSecret)
        .update(`${validKey}:${pastExp}`)
        .digest('hex');

      expect(adapter.verifySignedUrl(validKey, pastExp, sig)).toBe(false);
    });

    it('rejects signature made with wrong secret', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 300;
      const wrongSig = crypto
        .createHmac('sha256', 'wrong-secret-key-at-least-32-chars-long')
        .update(`${validKey}:${futureExp}`)
        .digest('hex');

      expect(adapter.verifySignedUrl(validKey, futureExp, wrongSig)).toBe(false);
    });

    it('rejects invalid or missing arguments', () => {
      expect(adapter.verifySignedUrl('', 123456, 'sig')).toBe(false);
      expect(adapter.verifySignedUrl(validKey, NaN, 'sig')).toBe(false);
      expect(adapter.verifySignedUrl(validKey, 123456, '')).toBe(false);
      expect(adapter.verifySignedUrl('../hack.webp', 9999999999, 'sig')).toBe(false);
    });
  });

  describe('Path traversal guard', () => {
    it('throws when attempting to put or archive invalid traversal key', async () => {
      const traversalKey = '../../etc/passwd';
      await expect(adapter.put(traversalKey, Buffer.from('test'), 'image/webp')).rejects.toThrow();
      await expect(adapter.exists(traversalKey)).resolves.toBe(false);
      await expect(adapter.archive(traversalKey)).rejects.toThrow();
    });
  });

  describe('File operations and archiving', () => {
    const validKey = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp';

    it('stores a file and archives it on archive() without deleting', async () => {
      const content = Buffer.from('fake webp content');
      await adapter.put(validKey, content, 'image/webp');
      expect(await adapter.exists(validKey)).toBe(true);

      // Archive it
      await adapter.archive(validKey);

      // Should no longer exist at original path
      expect(await adapter.exists(validKey)).toBe(false);

      // But should exist in archive directory
      const archiveDir = path.join(tempDir, 'archive/profile-photos');
      const files = fs.readdirSync(archiveDir);
      expect(files.length).toBe(1);
      expect(files[0]).toContain(validKey);
      const archivedContent = fs.readFileSync(path.join(archiveDir, files[0]));
      expect(archivedContent.toString()).toBe('fake webp content');
    });
  });

  describe('Startup validation', () => {
    it('throws if FILE_URL_SECRET is less than 32 characters', () => {
      process.env.FILE_URL_SECRET = 'short';
      const shortAdapter = new LocalDiskStorageAdapter();
      expect(() => shortAdapter.ensureDirectoriesWritable()).toThrow(
        /FILE_URL_SECRET is missing or less than 32 characters/,
      );
    });
  });
});
