import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
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
export class ExcelJsSpreadsheetAdapter
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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const maxColumns = options?.maxColumns ?? ExcelJsSpreadsheetAdapter.MAX_COLUMNS;
    const maxCellLength = options?.maxCellLength ?? ExcelJsSpreadsheetAdapter.MAX_CELL_LENGTH;
    const phoneCols = new Set((options?.phoneColumns || []).map(SpreadsheetCellNormalizer.normalizeHeader));

    const sheets = new Map<string, ParsedRow[]>();
    const fileErrors: { code: string; message: string }[] = [];
    const fileWarnings: { code: string; message: string }[] = [];

    // Check required sheets
    if (options?.requiredSheets) {
      for (const reqSheet of options.requiredSheets) {
        const found = workbook.worksheets.find(
          (ws) => ws.name.trim().toLowerCase() === reqSheet.toLowerCase(),
        );
        if (!found) {
          fileErrors.push({
            code: 'MISSING_SHEET',
            message: `Required sheet '${reqSheet}' is missing from the workbook`,
          });
        }
      }
    }

    if (fileErrors.length > 0) {
      return { sheets, fileErrors, fileWarnings };
    }

    for (const worksheet of workbook.worksheets) {
      const sheetName = worksheet.name.trim();
      const lowerSheetName = sheetName.toLowerCase();

      // Skip instructions or lists sheets
      if (lowerSheetName === 'instructions' || lowerSheetName === 'lists') {
        continue;
      }

      const rows: ParsedRow[] = [];
      const headerRow = worksheet.getRow(1);
      if (!headerRow || headerRow.cellCount === 0) {
        sheets.set(sheetName, []);
        continue;
      }

      // Map headers: columnIndex (1-based) -> normalizedHeader
      const headerMap = new Map<number, { original: string; normalized: string }>();
      const normalizedHeaderSet = new Set<string>();

      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const rawHeader = cell.text ? cell.text.trim() : '';
        if (rawHeader) {
          const norm = SpreadsheetCellNormalizer.normalizeHeader(rawHeader);
          headerMap.set(colNumber, { original: rawHeader, normalized: norm });
          normalizedHeaderSet.add(norm);
        }
      });

      if (headerMap.size > maxColumns) {
        throw new FileInspectionError(
          `Sheet '${sheetName}' exceeds maximum of ${maxColumns} columns (${headerMap.size} found)`,
          422,
          'LIMIT_EXCEEDED',
        );
      }

      // Validate required columns
      const requiredCols = options?.requiredColumnsBySheet?.[lowerSheetName] || [];
      const missingCols = requiredCols.filter(
        (req) => !normalizedHeaderSet.has(SpreadsheetCellNormalizer.normalizeHeader(req)),
      );
      if (missingCols.length > 0) {
        fileErrors.push({
          code: 'MISSING_COLUMNS',
          message: `Sheet '${sheetName}' is missing required columns: ${missingCols.join(', ')}`,
        });
      }

      // Known columns check for warnings
      const knownCols = new Set(
        (options?.requiredColumnsBySheet?.[lowerSheetName] || []).map(SpreadsheetCellNormalizer.normalizeHeader),
      );

      // Check max rows limit
      const maxRows = options?.maxRowsBySheet?.[lowerSheetName];
      const dataRowCount = Math.max(0, worksheet.rowCount - 1);
      if (maxRows && dataRowCount > maxRows) {
        throw new FileInspectionError(
          `Sheet '${sheetName}' exceeds row limit of ${maxRows} (${dataRowCount} rows found)`,
          422,
          'LIMIT_EXCEEDED',
        );
      }

      // Parse data rows (starting row 2)
      for (let rowIdx = 2; rowIdx <= worksheet.rowCount; rowIdx++) {
        const row = worksheet.getRow(rowIdx);
        // Check if empty row
        let isEmpty = true;
        const cells: Record<string, string> = {};
        const rowWarnings: { code: string; message: string; field?: string }[] = [];

        headerMap.forEach(({ normalized, original }, colNum) => {
          const cell = row.getCell(colNum);
          let cellValue = '';
          const isFormula = cell.type === ExcelJS.ValueType.Formula;
          const isNumber = cell.type === ExcelJS.ValueType.Number;

          if (isFormula) {
            rowWarnings.push({
              code: 'FORMULA_IGNORED',
              message: `Formula in column '${original}' was ignored; cached value used`,
              field: normalized,
            });
            const resultVal = (cell as any).result;
            cellValue = resultVal !== undefined && resultVal !== null ? String(resultVal) : '';
          } else {
            cellValue = cell.text !== undefined && cell.text !== null ? cell.text : '';
          }

          if (isNumber && phoneCols.has(normalized) && cellValue) {
            rowWarnings.push({
              code: 'NUMERIC_PHONE_CELL',
              message: `Phone number stored as numeric in column '${original}'`,
              field: normalized,
            });
            // If phone was read as numeric e.g. 9876543210 and lost leading plus
            if (/^\d{10,15}$/.test(cellValue) && !cellValue.startsWith('+')) {
              // Can retain as digits or restore +
            }
          }

          // Strip injection quote if next char is = + - @
          cellValue = SpreadsheetCellNormalizer.stripInjectionPrefix(cellValue);
          cellValue = SpreadsheetCellNormalizer.normalizeText(cellValue);

          if (cellValue.length > maxCellLength) {
            rowWarnings.push({
              code: 'CELL_TOO_LONG',
              message: `Cell in column '${original}' exceeds length limit of ${maxCellLength} characters`,
              field: normalized,
            });
          }

          if (cellValue) {
            isEmpty = false;
          }

          cells[normalized] = cellValue;
        });

        if (!isEmpty) {
          rows.push({
            rowNumber: rowIdx,
            cells,
            warnings: rowWarnings,
          });
        }
      }

      sheets.set(sheetName, rows);
    }

    return { sheets, fileErrors, fileWarnings };
  }

  async buildTemplateBuffer(
    sheets: SheetDefinition[],
    format: 'xlsx' | 'csv',
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vernoxy Pulse';
    workbook.created = new Date();

    for (const def of sheets) {
      const ws = workbook.addWorksheet(def.name);

      if (def.instructionsRows) {
        // Instructions sheet formatting
        def.instructionsRows.forEach((rowVals) => {
          ws.addRow(rowVals);
        });
        ws.getColumn(1).width = 25;
        ws.getColumn(2).width = 80;
        ws.getRow(1).font = { bold: true, size: 14 };
        continue;
      }

      // Standard data sheet
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      };

      def.headers.forEach((h, idx) => {
        const col = ws.getColumn(idx + 1);
        col.header = h.header;
        col.key = h.key;
        col.width = h.width || 20;
        if (h.isPhone) {
          col.numFmt = '@'; // Text format
        }
      });

      // Data validations
      if (def.dropdowns) {
        for (const dd of def.dropdowns) {
          const colIdx = def.headers.findIndex((h) => h.key === dd.column);
          if (colIdx !== -1) {
            const colLetter = ws.getColumn(colIdx + 1).letter;
            // Apply dropdown validation for rows 2 to 1000
            for (let r = 2; r <= 1000; r++) {
              ws.getCell(`${colLetter}${r}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${dd.values.join(',')}"`],
              };
            }
          }
        }
      }
    }

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async writeWorkbookStream(
    sheets: SheetDefinition[],
    dataFetchers: Map<string, (chunkSize: number) => AsyncIterable<Record<string, any>[]>>,
    format: 'xlsx' | 'csv',
    outputStream: Stream.Writable,
  ): Promise<{ rowCounts: Record<string, number> }> {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: outputStream,
      useStyles: true,
      useSharedStrings: false,
    });

    const rowCounts: Record<string, number> = {};

    for (const def of sheets) {
      const ws = workbook.addWorksheet(def.name, {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      // Headers
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      def.headers.forEach((h, idx) => {
        headerRow.getCell(idx + 1).value = h.header;
      });
      headerRow.commit();

      let sheetRowCount = 0;
      const fetcher = dataFetchers.get(def.name);
      if (fetcher) {
        for await (const chunk of fetcher(1000)) {
          for (const item of chunk) {
            sheetRowCount++;
            const rowValues: any[] = [];
            for (const h of def.headers) {
              let val = item[h.key];
              if (val !== undefined && val !== null) {
                if (typeof val === 'string') {
                  val = SpreadsheetCellNormalizer.applyInjectionPrefix(val);
                }
              } else {
                val = '';
              }
              rowValues.push(val);
            }
            const row = ws.addRow(rowValues);
            row.commit();
          }
        }
      }

      rowCounts[def.name] = sheetRowCount;
      ws.commit();
    }

    await workbook.commit();
    return { rowCounts };
  }
}
