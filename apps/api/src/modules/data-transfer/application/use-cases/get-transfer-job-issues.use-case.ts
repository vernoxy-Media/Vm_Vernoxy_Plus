import { TransferJobRepository } from '../../domain/ports/transfer-job.repository.port';
import { JobIssue } from '../../domain/entities/data-transfer-job.entity';
import { TransferJobNotFoundError } from '../../domain/errors/data-transfer.errors';

export interface GetTransferJobIssuesOutput {
  issues: JobIssue[];
  next_cursor: string | null;
  total: number;
}

export class GetTransferJobIssuesUseCase {
  constructor(private readonly repository: TransferJobRepository) {}

  async execute(
    jobId: string,
    cursor?: string,
    limit = 50,
  ): Promise<GetTransferJobIssuesOutput> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new TransferJobNotFoundError(jobId);
    }

    const allIssues: JobIssue[] = (job.options.issues as JobIssue[]) || [];
    const startIndex = cursor ? parseInt(cursor, 10) : 0;
    const safeLimit = Math.max(1, Math.min(limit, 200));

    const paged = allIssues.slice(startIndex, startIndex + safeLimit);
    const nextIndex =
      startIndex + safeLimit < allIssues.length ? String(startIndex + safeLimit) : null;

    return {
      issues: paged,
      next_cursor: nextIndex,
      total: allIssues.length,
    };
  }
}
