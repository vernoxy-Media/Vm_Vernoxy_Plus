import { TransferJobRepository } from '../../domain/ports/transfer-job.repository.port';

export interface TransferJobSummary {
  job_id: string;
  direction: 'import' | 'export';
  entity_type: string;
  format: 'xlsx' | 'csv';
  status: string;
  original_filename: string | null;
  total_rows: number;
  processed_rows: number;
  created_rows: number;
  skipped_rows: number;
  failed_rows: number;
  has_report: boolean;
  created_at: Date;
  finished_at: Date | null;
  created_by: number | null;
}

export interface ListTransferJobsOutput {
  jobs: TransferJobSummary[];
  next_cursor: string | null;
}

export class ListTransferJobsUseCase {
  constructor(private readonly repository: TransferJobRepository) {}

  async execute(
    entityType?: string,
    limit = 50,
    cursor?: string,
  ): Promise<ListTransferJobsOutput> {
    const { jobs, nextCursor } = await this.repository.findRecentJobs(
      entityType,
      limit,
      cursor,
    );

    return {
      jobs: jobs.map((j) => ({
        job_id: j.jobId,
        direction: j.direction,
        entity_type: j.entityType,
        format: j.format,
        status: j.status,
        original_filename: j.originalFilename,
        total_rows: j.totalRows,
        processed_rows: j.processedRows,
        created_rows: j.createdRows,
        skipped_rows: j.skippedRows,
        failed_rows: j.failedRows,
        has_report: Boolean(j.reportKey),
        created_at: j.createdAt,
        finished_at: j.finishedAt,
        created_by: j.createdBy,
      })),
      next_cursor: nextCursor,
    };
  }
}
