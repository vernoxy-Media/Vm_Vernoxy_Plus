import { StorageValidator } from './storage.validator';

describe('StorageValidator', () => {
  describe('isValidStorageKey', () => {
    it('accepts valid 32-hex character webp keys', () => {
      const validKey = '0123456789abcdef0123456789abcdef.webp';
      expect(StorageValidator.isValidStorageKey(validKey)).toBe(true);
    });

    it('rejects path traversal attempts (../)', () => {
      expect(StorageValidator.isValidStorageKey('../0123456789abcdef0123456789abcdef.webp')).toBe(false);
      expect(StorageValidator.isValidStorageKey('..\\0123456789abcdef0123456789abcdef.webp')).toBe(false);
      expect(StorageValidator.isValidStorageKey('foo/../0123456789abcdef0123456789abcdef.webp')).toBe(false);
    });

    it('rejects absolute paths', () => {
      expect(StorageValidator.isValidStorageKey('/storage/0123456789abcdef0123456789abcdef.webp')).toBe(false);
      expect(StorageValidator.isValidStorageKey('C:\\storage\\0123456789abcdef0123456789abcdef.webp')).toBe(false);
    });

    it('rejects wrong extensions', () => {
      expect(StorageValidator.isValidStorageKey('0123456789abcdef0123456789abcdef.png')).toBe(false);
      expect(StorageValidator.isValidStorageKey('0123456789abcdef0123456789abcdef.jpg')).toBe(false);
      expect(StorageValidator.isValidStorageKey('0123456789abcdef0123456789abcdef.jpeg')).toBe(false);
      expect(StorageValidator.isValidStorageKey('0123456789abcdef0123456789abcdef')).toBe(false);
    });

    it('rejects uppercase characters', () => {
      expect(StorageValidator.isValidStorageKey('0123456789ABCDEF0123456789abcdef.webp')).toBe(false);
    });

    it('rejects wrong lengths', () => {
      // 31 hex characters
      expect(StorageValidator.isValidStorageKey('0123456789abcdef0123456789abcde.webp')).toBe(false);
      // 33 hex characters
      expect(StorageValidator.isValidStorageKey('0123456789abcdef0123456789abcdef0.webp')).toBe(false);
    });

    it('rejects empty or non-string values', () => {
      expect(StorageValidator.isValidStorageKey('')).toBe(false);
      expect(StorageValidator.isValidStorageKey(null as any)).toBe(false);
      expect(StorageValidator.isValidStorageKey(undefined as any)).toBe(false);
    });
  });

  describe('detectMagicBytes', () => {
    it('detects JPEG format from FF D8 FF', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      expect(StorageValidator.detectMagicBytes(jpegBuffer)).toBe('jpeg');
    });

    it('detects PNG format from 89 50 4E 47 0D 0A 1A 0A', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(StorageValidator.detectMagicBytes(pngBuffer)).toBe('png');
    });

    it('rejects GIF magic bytes', () => {
      const gifBuffer = Buffer.from('GIF89a123456');
      expect(StorageValidator.detectMagicBytes(gifBuffer)).toBeNull();
    });

    it('rejects WebP magic bytes', () => {
      const webpBuffer = Buffer.from('RIFF1234WEBP');
      expect(StorageValidator.detectMagicBytes(webpBuffer)).toBeNull();
    });

    it('rejects PDF magic bytes', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4....');
      expect(StorageValidator.detectMagicBytes(pdfBuffer)).toBeNull();
    });

    it('rejects plain text or SVG', () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">');
      expect(StorageValidator.detectMagicBytes(svgBuffer)).toBeNull();
      const txtBuffer = Buffer.from('Hello world');
      expect(StorageValidator.detectMagicBytes(txtBuffer)).toBeNull();
    });

    it('rejects short or empty buffers', () => {
      expect(StorageValidator.detectMagicBytes(Buffer.from([]))).toBeNull();
      expect(StorageValidator.detectMagicBytes(Buffer.from([0xff, 0xd8]))).toBeNull();
      expect(StorageValidator.detectMagicBytes(null as any)).toBeNull();
    });
  });
});
