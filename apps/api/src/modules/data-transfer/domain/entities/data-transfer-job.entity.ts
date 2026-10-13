export type TransferDirection = 'import' | 'export';

export type TransferStatus =
  | 'previewed'
  | 'queued'
  | 'running'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type DuplicatePolicy = 'skip_duplicates' | 'import_anyway';

export type IssueSeverity = 'warning' | 'error';

export interface JobIssue {
  row: number;
  sheet: string;
  severity: IssueSeverity;
  code: string;
  message: string;
  field?: string;
}

export interface JobTotals {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  duplicates: number;
}

export interface JobOptions {
  duplicate_policy?: DuplicatePolicy;
  skip_invalid_rows?: boolean;
  filters?: Record<string, any>;
  issues?: JobIssue[];
  duplicates_count?: number;
  [key: string]: any;
}

export interface JobCounts {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  processedRows: number;
  createdRows: number;
  skippedRows: number;
  failedRows: number;
}

export interface DataTransferJobProps {
  jobId: string;
  direction: TransferDirection;
  entityType: string;
  format: 'xlsx' | 'csv';
  status: TransferStatus;
  originalFilename?: string | null;
  fileKey?: string | null;
  fileSha256?: string | null;
  fileSizeBytes?: number | null;
  reportKey?: string | null;
  options?: JobOptions;
  totalRows?: number;
  validRows?: number;
  warningRows?: number;
  errorRows?: number;
  processedRows?: number;
  createdRows?: number;
  skippedRows?: number;
  failedRows?: number;
  errorMessage?: string | null;
  cancelRequested?: boolean;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  heartbeatAt?: Date | null;
  expiresAt?: Date | null;
  createdAt?: Date;
  createdBy?: number | null;
  updatedAt?: Date;
  updatedBy?: number | null;
  deletedAt?: Date | null;
  deletedBy?: number | null;
}

export class DataTransferJob {
  readonly jobId: string;
  readonly direction: TransferDirection;
  readonly entityType: string;
  readonly format: 'xlsx' | 'csv';
  status: TransferStatus;
  originalFilename: string | null;
  fileKey: string | null;
  fileSha256: string | null;
  fileSizeBytes: number | null;
  reportKey: string | null;
  options: JobOptions;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  processedRows: number;
  createdRows: number;
  skippedRows: number;
  failedRows: number;
  errorMessage: string | null;
  cancelRequested: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
  heartbeatAt: Date | null;
  expiresAt: Date | null;
  readonly createdAt: Date;
  readonly createdBy: number | null;
  updatedAt: Date;
  updatedBy: number | null;
  deletedAt: Date | null;
  deletedBy: number | null;

  constructor(props: DataTransferJobProps) {
    this.jobId = props.jobId;
    this.direction = props.direction;
    this.entityType = props.entityType;
    this.format = props.format;
    this.status = props.status;
    this.originalFilename = props.originalFilename ?? null;
    this.fileKey = props.fileKey ?? null;
    this.fileSha256 = props.fileSha256 ?? null;
    this.fileSizeBytes = props.fileSizeBytes ?? null;
    this.reportKey = props.reportKey ?? null;
    this.options = props.options ?? {};
    this.totalRows = props.totalRows ?? 0;
    this.validRows = props.validRows ?? 0;
    this.warningRows = props.warningRows ?? 0;
    this.errorRows = props.errorRows ?? 0;
    this.processedRows = props.processedRows ?? 0;
    this.createdRows = props.createdRows ?? 0;
    this.skippedRows = props.skippedRows ?? 0;
    this.failedRows = props.failedRows ?? 0;
    this.errorMessage = props.errorMessage ?? null;
    this.cancelRequested = props.cancelRequested ?? false;
    this.startedAt = props.startedAt ?? null;
    this.finishedAt = props.finishedAt ?? null;
    this.heartbeatAt = props.heartbeatAt ?? null;
    this.expiresAt = props.expiresAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.createdBy = props.createdBy ?? null;
    this.updatedAt = props.updatedAt ?? new Date();
    this.updatedBy = props.updatedBy ?? null;
    this.deletedAt = props.deletedAt ?? null;
    this.deletedBy = props.deletedBy ?? null;
  }

  isExpired(): boolean {
    if (this.status === 'expired') return true;
    if (this.expiresAt && this.expiresAt.getTime() <= Date.now()) {
      return true;
    }
    return false;
  }

  canConfirm(): boolean {
    if (this.status !== 'previewed' || this.isExpired()) {
      return false;
    }
    const hasFileErrors = this.options.has_file_errors === true;
    if (hasFileErrors) return false;
    if (this.errorRows > 0 && !this.options.skip_invalid_rows) {
      return false;
    }
    return true;
  }
}
