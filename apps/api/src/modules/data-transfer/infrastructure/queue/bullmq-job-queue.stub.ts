import { Injectable, Logger } from '@nestjs/common';
import { JobQueuePort } from '../../domain/ports/job-queue.port';

/**
 * BullMQ Job Queue Adapter Stub
 * 
 * Provides a production-ready interface stub for migrating background jobs
 * from DbJobQueue (polling PostgreSQL) to BullMQ backed by Redis.
 *
 * Migration Plan & Architecture:
 * 1. Redis Cluster Connection:
 *    - Configure IORedis connection options with TLS and sentinel / cluster support.
 * 2. BullMQ Queue:
 *    - const queue = new Queue('data-transfer', { connection: redisOptions });
 *    - Enqueue jobs with jobId as custom job ID to prevent duplicate job processing.
 * 3. BullMQ Worker:
 *    - const worker = new Worker('data-transfer', async (job) => { ... }, {
 *        connection: redisOptions,
 *        concurrency: 5, // Horizontally scalable worker pods
 *        limiter: { max: 10, duration: 1000 },
 *      });
 * 4. Progress & Heartbeats:
 *    - job.updateProgress({ processed, total });
 *    - Built-in stall interval and lock extension replaces manual heartbeat queries.
 * 5. Dead Letter Queue & Retries:
 *    - Automatic exponential backoff retries for transient database disconnections.
 */
@Injectable()
export class BullMqJobQueueStub implements JobQueuePort {
  private readonly logger = new Logger(BullMqJobQueueStub.name);

  async enqueue(jobId: string): Promise<void> {
    this.logger.log(`[BullMQ Stub] Job ${jobId} would be enqueued to Redis 'data-transfer' queue`);
  }

  async startWorker(): Promise<void> {
    this.logger.log(`[BullMQ Stub] Worker started listening to Redis 'data-transfer' queue`);
  }

  async stopWorker(): Promise<void> {
    this.logger.log(`[BullMQ Stub] Worker stopped gracefully`);
  }

  isWorkerRunning(): boolean {
    return false;
  }
}
