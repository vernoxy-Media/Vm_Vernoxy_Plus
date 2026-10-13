import {
  DuplicatePolicy,
  JobQueuePort,
  TransferJobRepository,
} from '../../../data-transfer/public-api';
import {
  TransferJobNotFoundError,
  JobExpiredError,
  JobStateInvalidError,
} from '../../domain/errors/crm-transfer.errors';

export interface ConfirmCompanyImportInput {
  jobId: string;
  duplicatePolicy?: DuplicatePolicy;
  skipInvalidRows?: boolean;
  adminEmpId: number;
}

export interface ConfirmCompanyImportOutput {
  job_id: string;
  status: 'queued';
}

export class ConfirmCompanyImportUseCase {
  constructor(
    private readonly jobRepository: TransferJobRepository,
    private readonly jobQueue: JobQueuePort,
  ) {}

  async execute(input: ConfirmCompanyImportInput): Promise<ConfirmCompanyImportOutput> {
    const job = await this.jobRepository.findById(input.jobId);
    if (!job) {
      throw new TransferJobNotFoundError(input.jobId);
    }

    if (job.isExpired()) {
      throw new JobExpiredError(`Import preview for job '${input.jobId}' has expired`);
    }

    if (job.status !== 'previewed') {
      throw new JobStateInvalidError(
        `Job '${input.jobId}' cannot be confirmed in state '${job.status}' (must be 'previewed')`,
      );
    }

    if (input.duplicatePolicy) {
      job.options.duplicate_policy = input.duplicatePolicy;
    }
    if (input.skipInvalidRows !== undefined) {
      job.options.skip_invalid_rows = input.skipInvalidRows;
    }

    if (!job.canConfirm()) {
      throw new JobStateInvalidError(
        `Job cannot be confirmed due to unhandled row errors or missing 'skip_invalid_rows' option`,
      );
    }

    // Atomically transition from previewed to queued
    await this.jobRepository.updateStatus(job.jobId, 'queued', {
      options: job.options,
      updatedBy: input.adminEmpId,
    });

    // Enqueue to background worker
    await this.jobQueue.enqueue(job.jobId);

    return {
      job_id: job.jobId,
      status: 'queued',
    };
  }
}
