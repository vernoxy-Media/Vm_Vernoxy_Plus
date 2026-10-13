import { TransferJobRepository } from '../../domain/ports/transfer-job.repository.port';
import { TransferJobNotFoundError } from '../../domain/errors/data-transfer.errors';

export interface GetTransferJobOutput {
  job_id: string;
  direction: 'import' | 'export';
  entity_type: string;
  format: 'xlsx' | 'csv';
  status: string;
  original_filename: string | null;
  counts: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
    processed: number;
    created: number;
    skipped: number;
    failed: number;
  };
  percentage: number;
  error_message: string | null;
  cancel_requested: boolean;
  has_report: boolean;
  started_at: Date | null;
  finished_at: Date | null;
  heartbeat_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
  created_by: number | null;
}

export class GetTransferJobUseCase {
  constructor(private readonly repository: TransferJobRepository) {}

  async execute(jobId: string): Promise<GetTransferJobOutput> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new TransferJobNotFoundError(jobId);
    }

    const percentage =
      job.totalRows > 0
        ? Math.min(100, Math.round((job.processedRows / job.totalRows) * 100))
        : job.status === 'completed' || job.status === 'completed_with_errors'
        ? 100
        : 0;

    return {
      job_id: job.jobId,
      direction: job.direction,
      entity_type: job.entityType,
      format: job.format,
      status: job.status,
      original_filename: job.originalFilename,
      counts: {
        total: job.totalRows,
        valid: job.validRows,
        warnings: job.warningRows,
        errors: job.errorRows,
        processed: job.processedRows,
        created: job.createdRows,
        skipped: job.skippedRows,
        failed: job.failedRows,
      },
      percentage,
      error_message: job.errorMessage,
      cancel_requested: job.cancelRequested,
      has_report: Boolean(job.reportKey),
      started_at: job.startedAt,
      finished_at: job.finishedAt,
      heartbeat_at: job.heartbeatAt,
      expires_at: job.expiresAt,
      created_at: job.createdAt,
      created_by: job.createdBy,
    };
  }
}
