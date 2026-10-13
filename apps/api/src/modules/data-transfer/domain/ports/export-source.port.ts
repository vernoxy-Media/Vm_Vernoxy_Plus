import { DataTransferJob } from '../entities/data-transfer-job.entity';

export interface ExportSource {
  readonly entityType: string;

  countMatching(filters: Record<string, any>): Promise<number>;

  streamExport(
    job: DataTransferJob,
    format: 'xlsx' | 'csv',
    filters: Record<string, any>,
    outputStream: NodeJS.WritableStream,
  ): Promise<{ totalRows: number }>;
}
