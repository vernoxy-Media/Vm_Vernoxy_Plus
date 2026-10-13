import { Stream } from 'stream';

export interface DropdownValidation {
  column: string;
  values: string[];
}

export interface SheetDefinition {
  name: string;
  headers: { key: string; header: string; width?: number; isPhone?: boolean }[];
  dropdowns?: DropdownValidation[];
  instructionsRows?: (string | null)[][];
}

export interface SpreadsheetWriterPort {
  writeWorkbookStream(
    sheets: SheetDefinition[],
    dataFetchers: Map<string, (chunkSize: number) => AsyncIterable<Record<string, any>[]>>,
    format: 'xlsx' | 'csv',
    outputStream: Stream.Writable,
  ): Promise<{ rowCounts: Record<string, number> }>;

  buildTemplateBuffer(
    sheets: SheetDefinition[],
    format: 'xlsx' | 'csv',
  ): Promise<Buffer>;
}
