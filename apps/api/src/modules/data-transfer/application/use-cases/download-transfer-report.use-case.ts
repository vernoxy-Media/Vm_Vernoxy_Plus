import { TransferJobRepository } from '../../domain/ports/transfer-job.repository.port';
import { TransferReportStoragePort } from '../../domain/ports/transfer-report-storage.port';
import { TransferJobNotFoundError } from '../../domain/errors/data-transfer.errors';

export interface DownloadTransferReportOutput {
  stream: NodeJS.ReadableStream;
  filename: string;
}

export class DownloadTransferReportUseCase {
  constructor(
    private readonly repository: TransferJobRepository,
    private readonly reportStorage: TransferReportStoragePort,
  ) {}

  async execute(jobId: string): Promise<DownloadTransferReportOutput> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      throw new TransferJobNotFoundError(jobId);
    }

    if (!job.reportKey) {
      throw new TransferJobNotFoundError(
        `Report has not been generated for job '${jobId}'`,
      );
    }

    const stream = await this.reportStorage.openReportStream(job.reportKey);
    const safeName = `import-report-${job.jobId.slice(0, 8)}.csv`;

    return {
      stream,
      filename: safeName,
    };
  }
}
