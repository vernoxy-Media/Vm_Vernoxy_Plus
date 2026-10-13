import { TransferJobRepository } from '../../domain/ports/transfer-job.repository.port';
import {
  TransferJobNotFoundError,
  TransferJobConflictError,
} from '../../domain/errors/data-transfer.errors';

export class CancelTransferJobUseCase {
  constructor(private readonly repository: TransferJobRepository) {}

  async execute(jobId: string): Promise<{ success: boolean; status: string }> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new TransferJobNotFoundError(jobId);
    }

    if (
      job.status === 'completed' ||
      job.status === 'completed_with_errors' ||
      job.status === 'failed' ||
      job.status === 'cancelled' ||
      job.status === 'expired'
    ) {
      throw new TransferJobConflictError(
        `Job cannot be cancelled in state '${job.status}'`,
      );
    }

    if (job.status === 'previewed' || job.status === 'queued') {
      await this.repository.updateStatus(job.jobId, 'cancelled', {
        errorMessage: 'Cancelled by user',
        finishedAt: new Date(),
      });
      return { success: true, status: 'cancelled' };
    }

    // If running, set cancel_requested so the worker stops at the next chunk
    await this.repository.requestCancel(job.jobId);
    return { success: true, status: 'running' };
  }
}
