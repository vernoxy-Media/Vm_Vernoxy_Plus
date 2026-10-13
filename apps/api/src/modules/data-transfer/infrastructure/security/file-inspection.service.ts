import { Injectable } from '@nestjs/common';

export interface ZipInspectionResult {
  entryCount: number;
  totalUncompressedSize: number;
  entries: string[];
}

export class FileInspectionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 413 | 415 | 422 = 422,
    public readonly code: string = 'FILE_INVALID',
  ) {
    super(message);
    this.name = 'FileInspectionError';
  }
}

@Injectable()
export class FileInspectionService {
  private static readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
  private static readonly MAX_ZIP_ENTRIES = 200;
  private static readonly MAX_UNCOMPRESSED_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
  private static readonly MAX_COMPRESSION_RATIO = 100; // 100:1

  /**
   * Validates file size and detects format by content.
   */
  inspectAndDetectFormat(buffer: Buffer, originalFilename?: string): 'xlsx' | 'csv' {
    if (!buffer || buffer.length === 0) {
      throw new FileInspectionError('File is empty', 422, 'FILE_EMPTY');
    }

    if (buffer.length > FileInspectionService.MAX_FILE_SIZE_BYTES) {
      throw new FileInspectionError(
        `File exceeds maximum allowed size of 10 MB (${buffer.length} bytes)`,
        413,
        'FILE_TOO_LARGE',
      );
    }

    // Check for XLSX magic bytes (ZIP: 50 4B 03 04)
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      this.inspectXlsxZip(buffer);
      return 'xlsx';
    }

    // If it starts with other PK headers or is not zip, check if it's CSV
    if (this.isLikelyCsv(buffer)) {
      this.inspectCsvContent(buffer);
      return 'csv';
    }

    throw new FileInspectionError(
      'Unsupported file format. Please upload a valid .xlsx or .csv file.',
      415,
      'UNSUPPORTED_FILE',
    );
  }

  /**
   * Inspects a ZIP/XLSX file without full extraction to prevent zip bombs, macros, encryption, etc.
   */
  inspectXlsxZip(buffer: Buffer): ZipInspectionResult {
    // Locate End of Central Directory Record (EOCD) from the end of the buffer
    // EOCD signature is 0x06054b50 (PK\x05\x06)
    let eocdOffset = -1;
    const maxSearch = Math.min(buffer.length, 65535 + 22);
    for (let i = buffer.length - 22; i >= buffer.length - maxSearch; i--) {
      if (
        buffer[i] === 0x50 &&
        buffer[i + 1] === 0x4b &&
        buffer[i + 2] === 0x05 &&
        buffer[i + 3] === 0x06
      ) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new FileInspectionError(
        'Invalid XLSX file: Corrupted or truncated ZIP archive',
        422,
        'FILE_INVALID',
      );
    }

    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const cdSize = buffer.readUInt32LE(eocdOffset + 12);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

    if (totalEntries > FileInspectionService.MAX_ZIP_ENTRIES) {
      throw new FileInspectionError(
        `XLSX file contains too many entries (${totalEntries} > ${FileInspectionService.MAX_ZIP_ENTRIES})`,
        422,
        'LIMIT_EXCEEDED',
      );
    }

    if (cdOffset + cdSize > buffer.length) {
      throw new FileInspectionError('Invalid XLSX file: Invalid central directory offset', 422, 'FILE_INVALID');
    }

    let currentPos = cdOffset;
    let totalUncompressedSize = 0;
    const entries: string[] = [];
    let hasContentTypes = false;
    let hasWorkbook = false;

    for (let i = 0; i < totalEntries; i++) {
      if (currentPos + 46 > buffer.length) {
        throw new FileInspectionError('Invalid XLSX file: Truncated central directory', 422, 'FILE_INVALID');
      }

      // Central directory header signature: 0x02014b50 (PK\x01\x02)
      if (
        buffer[currentPos] !== 0x50 ||
        buffer[currentPos + 1] !== 0x4b ||
        buffer[currentPos + 2] !== 0x01 ||
        buffer[currentPos + 3] !== 0x02
      ) {
        throw new FileInspectionError('Invalid XLSX file: Corrupted central directory header', 422, 'FILE_INVALID');
      }

      const flags = buffer.readUInt16LE(currentPos + 8);
      // Bit 0: Encrypted file
      if ((flags & 0x0001) !== 0) {
        throw new FileInspectionError(
          'Password-protected or encrypted XLSX files are not supported',
          422,
          'FILE_ENCRYPTED',
        );
      }

      const compressedSize = buffer.readUInt32LE(currentPos + 20);
      const uncompressedSize = buffer.readUInt32LE(currentPos + 24);
      const fileNameLength = buffer.readUInt16LE(currentPos + 28);
      const extraFieldLength = buffer.readUInt16LE(currentPos + 30);
      const fileCommentLength = buffer.readUInt16LE(currentPos + 32);

      const fileNamePos = currentPos + 46;
      if (fileNamePos + fileNameLength > buffer.length) {
        throw new FileInspectionError('Invalid XLSX file: Truncated entry name', 422, 'FILE_INVALID');
      }

      const fileName = buffer.toString('utf8', fileNamePos, fileNamePos + fileNameLength);
      entries.push(fileName);

      // Check for macros (e.g. vbaProject.bin)
      if (fileName.toLowerCase().includes('vbaproject.bin')) {
        throw new FileInspectionError(
          'Macro-enabled files (containing vbaProject.bin) are not permitted',
          422,
          'MACRO_NOT_ALLOWED',
        );
      }

      // Check for external links or connections
      if (
        fileName.toLowerCase().includes('externallinks') ||
        fileName.toLowerCase().includes('connections.xml')
      ) {
        throw new FileInspectionError(
          'Files containing external data connections or external links are not permitted',
          422,
          'EXTERNAL_LINKS_NOT_ALLOWED',
        );
      }

      if (fileName === '[Content_Types].xml') {
        hasContentTypes = true;
      }
      if (fileName.toLowerCase() === 'xl/workbook.xml') {
        hasWorkbook = true;
      }

      // Zip bomb protection: uncompressed size limit
      totalUncompressedSize += uncompressedSize;
      if (totalUncompressedSize > FileInspectionService.MAX_UNCOMPRESSED_SIZE_BYTES) {
        throw new FileInspectionError(
          `Total uncompressed size exceeds limit of 50 MB (Zip bomb protection)`,
          422,
          'LIMIT_EXCEEDED',
        );
      }

      // Zip bomb protection: compression ratio limit
      if (compressedSize > 0 && uncompressedSize / compressedSize > FileInspectionService.MAX_COMPRESSION_RATIO) {
        throw new FileInspectionError(
          `Compression ratio exceeds 100:1 (Zip bomb protection)`,
          422,
          'LIMIT_EXCEEDED',
        );
      }

      currentPos += 46 + fileNameLength + extraFieldLength + fileCommentLength;
    }

    if (!hasContentTypes || !hasWorkbook) {
      throw new FileInspectionError(
        'Invalid XLSX structure: Missing [Content_Types].xml or xl/workbook.xml',
        422,
        'FILE_INVALID',
      );
    }

    return {
      entryCount: totalEntries,
      totalUncompressedSize,
      entries,
    };
  }

  /**
   * Inspects CSV content: rejects NUL bytes, checks encoding (UTF-8 required, UTF-16 rejected).
   */
  inspectCsvContent(buffer: Buffer): { delimiter: ',' | ';'; hasBom: boolean } {
    // Reject NUL bytes
    if (buffer.includes(0x00)) {
      throw new FileInspectionError(
        'File contains binary or NUL bytes. Save the file as CSV UTF-8',
        422,
        'FILE_INVALID',
      );
    }

    // Check UTF-16 BOMs
    if (
      (buffer[0] === 0xff && buffer[1] === 0xfe) ||
      (buffer[0] === 0xfe && buffer[1] === 0xff)
    ) {
      throw new FileInspectionError('Save the file as CSV UTF-8', 422, 'UNSUPPORTED_ENCODING');
    }

    // Check for UTF-8 BOM
    let hasBom = false;
    let offset = 0;
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      hasBom = true;
      offset = 3;
    }

    // Extract first line to detect delimiter
    const sample = buffer.subarray(offset, Math.min(buffer.length, offset + 4096)).toString('utf8');
    const firstLine = sample.split(/\r?\n/)[0] || '';

    let delimiter: ',' | ';' = ',';
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;

    if (semicolonCount > commaCount && semicolonCount > 0) {
      delimiter = ';';
    }

    return { delimiter, hasBom };
  }

  private isLikelyCsv(buffer: Buffer): boolean {
    // UTF-16 BOMs: reject as unsupported encoding
    if (
      (buffer[0] === 0xff && buffer[1] === 0xfe) ||
      (buffer[0] === 0xfe && buffer[1] === 0xff)
    ) {
      return true; // Will be inspected and throw "Save the file as CSV UTF-8"
    }

    // Check if mostly printable ASCII/UTF-8
    const checkLength = Math.min(buffer.length, 1024);
    let printable = 0;
    for (let i = 0; i < checkLength; i++) {
      const b = buffer[i];
      if (b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e) || b >= 0x80) {
        printable++;
      }
    }
    return printable / checkLength > 0.85;
  }
}
