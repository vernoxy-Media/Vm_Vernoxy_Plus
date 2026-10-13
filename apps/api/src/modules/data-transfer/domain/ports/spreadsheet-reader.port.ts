export interface ParsedRow {
  rowNumber: number;
  cells: Record<string, string>;
  warnings: { code: string; message: string; field?: string }[];
}

export interface ParsedWorkbook {
  sheets: Map<string, ParsedRow[]>;
  fileErrors: { code: string; message: string }[];
  fileWarnings: { code: string; message: string }[];
}

export interface SpreadsheetReaderPort {
  parseWorkbook(
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
  ): Promise<ParsedWorkbook>;
}
