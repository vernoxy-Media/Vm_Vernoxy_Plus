import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify';
import { Stream } from 'stream';
import {
  ParsedRow,
  ParsedWorkbook,
  SpreadsheetReaderPort,
} from '../../domain/ports/spreadsheet-reader.port';
import {
  SheetDefinition,
  SpreadsheetWriterPort,
} from '../../domain/ports/spreadsheet-writer.port';
import { SpreadsheetCellNormalizer } from './spreadsheet-cell-normalizer';
import { FileInspectionError } from '../security/file-inspection.service';

@Injectable()
export class CsvSpreadsheetAdapter
  implements SpreadsheetReaderPort, SpreadsheetWriterPort
{
  private static readonly MAX_COLUMNS = 50;
  private static readonly MAX_CELL_LENGTH = 1000;

  async parseWorkbook(
    buffer: Buffer,
    format: 'xlsx' | 'csv',
    options?: {
      phoneColumns?: string[];
      requiredSheets?: string[];
      requiredColumnsBySheet?: Record<string, string[]>;
      maxRowsBySheet?: Record<string, number>;
      maxColumns?: number;
      maxCellLength?: number;
    },
  ): Promise<ParsedWorkbook> {
    // Strip UTF-8 BOM if present
    let content = buffer;
    if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      content = buffer.subarray(3);
    }

    const text = content.toString('utf8');
    // Detect delimiter from first non-empty line
    const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolons > commas && semicolons > 0 ? ';' : ',';

    let rawRecords: string[][];
    try {
      rawRecords = parse(text, {
        delimiter,
        relax_quotes: true,
        skip_empty_lines: true,
        trim: false,
      });
    } catch (err: any) {
      throw new FileInspectionError(
        `Failed to parse CSV file: ${err.message}`,
        422,
        'FILE_INVALID',
      );
    }

    const sheets = new Map<string, ParsedRow[]>();
    const fileErrors: { code: string; message: string }[] = [];
    const fileWarnings: { code: string; message: string }[] = [];

    if (rawRecords.length === 0) {
      sheets.set('Companies', []);
      return { sheets, fileErrors, fileWarnings };
    }

    const headerRow = rawRecords[0];
    const maxColumns = options?.maxColumns ?? CsvSpreadsheetAdapter.MAX_COLUMNS;
    const maxCellLength = options?.maxCellLength ?? CsvSpreadsheetAdapter.MAX_CELL_LENGTH;
    const phoneCols = new Set((options?.phoneColumns || []).map(SpreadsheetCellNormalizer.normalizeHeader));

    if (headerRow.length > maxColumns) {
      throw new FileInspectionError(
        `CSV exceeds maximum of ${maxColumns} columns (${headerRow.length} found)`,
        422,
        'LIMIT_EXCEEDED',
      );
    }

    const headerMap: { original: string; normalized: string }[] = headerRow.map((raw) => ({
      original: raw.trim(),
      normalized: SpreadsheetCellNormalizer.normalizeHeader(raw),
    }));

    const normalizedHeaderSet = new Set(headerMap.map((h) => h.normalized));

    // Required columns validation
    const requiredCols = options?.requiredColumnsBySheet?.['companies'] || [];
    const missingCols = requiredCols.filter(
      (req) => !normalizedHeaderSet.has(SpreadsheetCellNormalizer.normalizeHeader(req)),
    );
    if (missingCols.length > 0) {
      fileErrors.push({
        code: 'MISSING_COLUMNS',
        message: `CSV is missing required columns: ${missingCols.join(', ')}`,
      });
    }

    // Row limits check
    const maxRows = options?.maxRowsBySheet?.['companies'];
    const dataRowCount = rawRecords.length - 1;
    if (maxRows && dataRowCount > maxRows) {
      throw new FileInspectionError(
        `CSV exceeds row limit of ${maxRows} (${dataRowCount} rows found)`,
        422,
        'LIMIT_EXCEEDED',
      );
    }

    const parsedRows: ParsedRow[] = [];

    for (let i = 1; i < rawRecords.length; i++) {
      const rowNumber = i + 1; // 1-indexed (header is row 1)
      const record = rawRecords[i];
      const cells: Record<string, string> = {};
      const rowWarnings: { code: string; message: string; field?: string }[] = [];
      let isEmpty = true;

      for (let c = 0; c < headerMap.length; c++) {
        const { original, normalized } = headerMap[c];
        let cellVal = record[c] !== undefined ? record[c] : '';

        // Strip injection quote if next char is = + - @
        cellVal = SpreadsheetCellNormalizer.stripInjectionPrefix(cellVal);
        cellVal = SpreadsheetCellNormalizer.normalizeText(cellVal);

        if (cellVal.length > maxCellLength) {
          rowWarnings.push({
            code: 'CELL_TOO_LONG',
            message: `Cell in column '${original}' exceeds length limit of ${maxCellLength} characters`,
            field: normalized,
          });
        }

        if (cellVal) {
          isEmpty = false;
        }

        cells[normalized] = cellVal;
      }

      if (!isEmpty) {
        parsedRows.push({
          rowNumber,
          cells,
          warnings: rowWarnings,
        });
      }
    }

    sheets.set('Companies', parsedRows);
    return { sheets, fileErrors, fileWarnings };
  }

  async buildTemplateBuffer(
    sheets: SheetDefinition[],
    format: 'xlsx' | 'csv',
  ): Promise<Buffer> {
    const companiesDef = sheets.find((s) => s.name.toLowerCase() === 'companies') || sheets[0];
    const headers = companiesDef ? companiesDef.headers.map((h) => h.header) : [];

    // UTF-8 BOM
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const csvContent = headers.join(',') + '\r\n';
    return Buffer.concat([bom, Buffer.from(csvContent, 'utf8')]);
  }

  async writeWorkbookStream(
    sheets: SheetDefinition[],
    dataFetchers: Map<string, (chunkSize: number) => AsyncIterable<Record<string, any>[]>>,
    format: 'xlsx' | 'csv',
    outputStream: Stream.Writable,
  ): Promise<{ rowCounts: Record<string, number> }> {
    const companiesDef = sheets.find((s) => s.name.toLowerCase() === 'companies') || sheets[0];
    const headers = companiesDef ? companiesDef.headers : [];

    // Write UTF-8 BOM
    outputStream.write(Buffer.from([0xef, 0xbb, 0xbf]));

    const stringifier = stringify({
      header: true,
      columns: headers.map((h) => ({ key: h.key, header: h.header })),
      record_delimiter: 'windows',
      quoted: true,
    });

    stringifier.pipe(outputStream);

    let rowCount = 0;
    const fetcher = dataFetchers.get('Companies');
    if (fetcher) {
      for await (const chunk of fetcher(1000)) {
        for (const item of chunk) {
          rowCount++;
          const rowObj: Record<string, any> = {};
          for (const h of headers) {
            let val = item[h.key];
            if (val !== undefined && val !== null) {
              if (typeof val === 'string') {
                val = SpreadsheetCellNormalizer.applyInjectionPrefix(val);
              }
            } else {
              val = '';
            }
            rowObj[h.key] = val;
          }
          stringifier.write(rowObj);
        }
      }
    }

    stringifier.end();

    await new Promise<void>((resolve, reject) => {
      stringifier.on('finish', () => resolve());
      stringifier.on('error', reject);
    });

    return { rowCounts: { Companies: rowCount } };
  }
}
