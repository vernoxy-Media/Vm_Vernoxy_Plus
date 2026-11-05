import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { FollowUpJobs } from '../../application/use-cases/follow-up-jobs.use-case';

const INTERVAL_MS = 60_000;

/**
 * Runs the follow-up jobs every minute on a normal long-running server.
 * It stays off where a timer cannot work or is not wanted:
 *   - tests (NODE_ENV=test)
 *   - Vercel / serverless (VERCEL is set): call GET /api/v1/sales/jobs/follow-ups from a scheduler instead
 *   - SALES_JOBS_IN_PROCESS=false
 * Running on several servers is safe: the jobs claim their rows atomically.
 */
@Injectable()
export class FollowUpJobRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FollowUpJobRunner.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly jobs: FollowUpJobs) {}

  static enabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.NODE_ENV !== 'test' && !env.VERCEL && env.SALES_JOBS_IN_PROCESS !== 'false';
  }

  onModuleInit(): void {
    if (!FollowUpJobRunner.enabled()) return;
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref?.();
    this.logger.log('Follow-up jobs run every minute in this process.');
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return; // never overlap with a run that is still going
    this.running = true;
    try {
      const report = await this.jobs.run();
      if (report.errors.length > 0) this.logger.warn(`Follow-up jobs finished with errors: ${report.errors.join(' | ')}`);
    } catch (err) {
      this.logger.error(`Follow-up jobs failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.running = false;
    }
  }
}
