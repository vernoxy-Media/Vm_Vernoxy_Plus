import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { JobQueuePort } from '../../domain/ports/job-queue.port';
import { TransferJobRepository } from '../../domain/ports/transfer-job.repository.port';
import { UserAuthorizationPort } from '../../domain/ports/user-authorization.port';
import { DATA_TRANSFER_TOKENS } from '../../domain/ports/tokens';
import { DataTransferRegistry } from '../../domain/services/data-transfer-registry';
import {
  FileStoragePort,
  STORAGE_TOKENS,
  StorageValidator,
} from '../../../storage/public-api';
import { RowReportItem } from '../../domain/ports/import-handler.port';
import { Readable } from 'stream';

@Injectable()
export class DbJobQueue implements JobQueuePort, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbJobQueue.name);
  private pollIntervalTimer: NodeJS.Timeout | null = null;
  private sweeperIntervalTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isRunning = false;

  constructor(
    @Inject(DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY)
    private readonly repository: TransferJobRepository,
    @Inject(DATA_TRANSFER_TOKENS.USER_AUTHORIZATION)
    private readonly userAuth: UserAuthorizationPort,
    @Inject(STORAGE_TOKENS.FileStoragePort)
    private readonly fileStorage: FileStoragePort,
    @Inject(DataTransferRegistry)
    private readonly registry: DataTransferRegistry,
  ) {}

  onModuleInit() {
    if (process.env.JOBS_WORKER_ENABLED === 'true') {
      this.startWorker();
    }
  }

  async onModuleDestroy() {
    await this.stopWorker();
  }

  async enqueue(jobId: string): Promise<void> {
    // When enqueued, trigger an immediate pickup if idle
    if (this.isRunning && !this.isProcessing) {
      setImmediate(() => this.processNextJob());
    }
  }

  async startWorker(): Promise<void> {
    if (this.isRunning) return;
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      this.logger.log('Running on serverless/Vercel: background continuous polling worker disabled.');
      return;
    }
    this.isRunning = true;
    this.logger.log('Data Transfer background worker started (polling interval: 2s)');

    this.pollIntervalTimer = setInterval(() => {
      if (!this.isProcessing && this.isRunning) {
        this.processNextJob();
      }
    }, 2000);
    this.pollIntervalTimer.unref();

    // Stale heartbeat sweeper runs every 30s
    this.sweeperIntervalTimer = setInterval(() => {
      this.runStaleHeartbeatSweeper();
    }, 30000);
    this.sweeperIntervalTimer.unref();
  }

  async stopWorker(): Promise<void> {
    this.isRunning = false;
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }
    if (this.sweeperIntervalTimer) {
      clearInterval(this.sweeperIntervalTimer);
      this.sweeperIntervalTimer = null;
    }
    // Wait briefly if currently in the middle of a chunk
    let checks = 0;
    while (this.isProcessing && checks < 20) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      checks++;
    }
    this.logger.log('Data Transfer background worker stopped');
  }

  isWorkerRunning(): boolean {
    return this.isRunning;
  }

  async runStaleHeartbeatSweeper(): Promise<number> {
    try {
      // Jobs running with heartbeat older than 2 minutes are marked failed with 'Interrupted'
      const twoMinutesAgo = new Date(Date.now() - 120000);
      const failedCount = await this.repository.markStaleJobsFailed(twoMinutesAgo);
      if (failedCount > 0) {
        this.logger.warn(`Stale heartbeat sweeper marked ${failedCount} job(s) as Interrupted`);
      }
      return failedCount;
    } catch (err: any) {
      this.logger.error(`Error in stale heartbeat sweeper: ${err.message}`);
      return 0;
    }
  }

  async processNextJob(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const job = await this.repository.claimNextQueuedJob();
      if (!job) {
        return;
      }

      this.logger.log(`Processing data transfer job ${job.jobId} (entity: ${job.entityType})`);

      if (!job.fileKey) {
        await this.repository.updateStatus(job.jobId, 'failed', {
          errorMessage: 'Import file key is missing',
          finishedAt: new Date(),
        });
        return;
      }

      // Check user authorization at start
      if (!job.createdBy) {
        await this.repository.updateStatus(job.jobId, 'failed', {
          errorMessage: 'User no longer authorized',
          finishedAt: new Date(),
        });
        return;
      }

      const isAuthorized = await this.userAuth.isUserAuthorizedToManage(
        job.createdBy,
        job.entityType,
      );
      if (!isAuthorized) {
        await this.repository.updateStatus(job.jobId, 'failed', {
          errorMessage: 'User no longer authorized',
          finishedAt: new Date(),
        });
        return;
      }

      // Stream file from storage into buffer
      const fileStream = await this.fileStorage.openReadStream(job.fileKey, 'imports');
      const fileBuffer = await this.streamToBuffer(fileStream);

      const handler = this.registry.getImportHandler(job.entityType);
      const allRowResults: RowReportItem[] = [];

      let createdCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      let processedCount = 0;
      let stopReason: 'cancelled' | 'unauthorized' | null = null;

      for await (const chunk of handler.getChunks(job, fileBuffer)) {
        // Re-check cancellation between chunks
        const currentJobState = await this.repository.findById(job.jobId);
        if (currentJobState?.cancelRequested) {
          stopReason = 'cancelled';
          break;
        }

        // Re-check authorization before every chunk
        const stillAuthorized = await this.userAuth.isUserAuthorizedToManage(
          job.createdBy,
          job.entityType,
        );
        if (!stillAuthorized) {
          stopReason = 'unauthorized';
          break;
        }

        // Update heartbeat
        await this.repository.updateHeartbeat(job.jobId);

        // Commit chunk (250 companies)
        const chunkResult = await handler.commitChunk(job, chunk, job.createdBy);

        createdCount += chunkResult.createdCount;
        skippedCount += chunkResult.skippedCount;
        failedCount += chunkResult.failedCount;
        processedCount += chunk.length;

        allRowResults.push(...chunkResult.rowResults);

        await this.repository.updateProgress(job.jobId, {
          processedRows: processedCount,
          createdRows: createdCount,
          skippedRows: skippedCount,
          failedRows: failedCount,
        });
      }

      // Generate result report CSV
      const reportCsv = await handler.generateReportCsv(job, allRowResults);
      const reportKey = StorageValidator.generateStorageKey('csv');
      await this.fileStorage.put(
        reportKey,
        Buffer.from(reportCsv, 'utf8'),
        'text/csv',
        'import-reports',
      );

      const now = new Date();
      if (stopReason === 'cancelled') {
        await this.repository.updateStatus(job.jobId, 'cancelled', {
          reportKey,
          finishedAt: now,
          errorMessage: 'Import cancelled by user',
        });
      } else if (stopReason === 'unauthorized') {
        await this.repository.updateStatus(job.jobId, 'failed', {
          reportKey,
          finishedAt: now,
          errorMessage: 'User no longer authorized',
        });
      } else {
        let finalStatus: 'completed' | 'completed_with_errors' | 'failed' = 'completed';
        if (failedCount > 0) {
          if (createdCount === 0 && skippedCount === 0) {
            finalStatus = 'failed';
          } else {
            finalStatus = 'completed_with_errors';
          }
        }

        await this.repository.updateStatus(job.jobId, finalStatus, {
          reportKey,
          finishedAt: now,
        });
      }

      this.logger.log(`Job ${job.jobId} finished: ${createdCount} created, ${skippedCount} skipped, ${failedCount} failed`);
    } catch (err: any) {
      this.logger.error(`Error processing data transfer job: ${err.message}`, err.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
