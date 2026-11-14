import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { LicenseService } from './license.service';

/**
 * The "System" check of BFD Section 2 / 7 Part 1, run shortly after start-up and then hourly:
 *  - Active / Expiring Soon / Expired from the Expiry Date;
 *  - seats of deactivated employees flagged to recover;
 *  - discontinuations whose Effective Date has come;
 *  - software whose owner left moves to the Admin.
 * Every step is idempotent, so running it more than once a day is safe.
 */
@Injectable()
export class LicenseSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(LicenseSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly licenses: LicenseService) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.LICENSE_JOBS_ENABLED === 'false') return;
    setTimeout(() => void this.run(), 30_000);
    this.timer = setInterval(() => void this.run(), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const r = await this.licenses.syncStatusesAndRecovery();
      if (r.discontinuedCount || r.ownersMoved || r.flaggedAssignmentsCount) {
        this.logger.log(
          `License check: ${r.discontinuedCount} discontinued, ${r.ownersMoved} owner(s) moved, ${r.flaggedAssignmentsCount} seat(s) flagged to recover`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`License check failed: ${err?.message}`);
    } finally {
      this.running = false;
    }
  }
}
