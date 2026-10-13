import {
  DataTransferJob,
  DataTransferJobProps,
  JobCounts,
  TransferStatus,
} from '../entities/data-transfer-job.entity';

export interface TransferJobRepository {
  create(job: DataTransferJob): Promise<DataTransferJob>;
  findById(jobId: string): Promise<DataTransferJob | null>;
  update(job: DataTransferJob): Promise<void>;
  updateStatus(
    jobId: string,
    status: TransferStatus,
    fields?: Partial<DataTransferJobProps>,
  ): Promise<void>;
  updateProgress(jobId: string, counts: Partial<JobCounts>): Promise<void>;
  updateHeartbeat(jobId: string): Promise<void>;
  requestCancel(jobId: string): Promise<void>;
  claimNextQueuedJob(): Promise<DataTransferJob | null>;
  markStaleJobsFailed(thresholdDate: Date): Promise<number>;
  findRecentJobs(
    entityType?: string,
    limit?: number,
    cursor?: string,
  ): Promise<{ jobs: DataTransferJob[]; nextCursor: string | null }>;
}
