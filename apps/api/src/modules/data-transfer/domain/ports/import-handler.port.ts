import {
  DataTransferJob,
  DuplicatePolicy,
  JobIssue,
  JobTotals,
} from '../entities/data-transfer-job.entity';

export interface PreviewResult {
  totals: JobTotals;
  willCreate: number;
  willSkip: number;
  issues: JobIssue[];
  issuesTruncated: boolean;
  canConfirm: boolean;
  hasFileErrors: boolean;
}

export interface RowReportItem {
  rowNumber: number;
  sheet: string;
  status: 'created' | 'skipped' | 'failed';
  code?: string;
  message?: string;
  createdId?: string | number;
}

export interface ChunkCommitResult {
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  rowResults: RowReportItem[];
}

export interface ImportHandler<T = any> {
  readonly entityType: string;

  preview(
    job: DataTransferJob,
    fileBuffer: Buffer,
    duplicatePolicy: DuplicatePolicy,
    skipInvalidRows: boolean,
  ): Promise<PreviewResult>;

  getChunks(job: DataTransferJob, fileBuffer: Buffer): AsyncIterable<T[]>;

  commitChunk(
    job: DataTransferJob,
    chunk: T[],
    adminEmpId: number,
  ): Promise<ChunkCommitResult>;

  generateReportCsv(
    job: DataTransferJob,
    allRowResults: RowReportItem[],
  ): Promise<string>;
}
