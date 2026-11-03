import { Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

@Injectable()
export class PerformanceSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PerformanceSchedulerService.name);
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly createNotificationUseCase?: CreateNotificationUseCase,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Performance Scheduler initialized. Running startup cycle audit...');
    try {
      await this.runScheduledCycleChecks();
    } catch (err: any) {
      this.logger.error(`Error running cycle audit on bootstrap: ${err?.message}`);
    }

    // Schedule hourly check
    this.checkInterval = setInterval(async () => {
      try {
        await this.runScheduledCycleChecks();
      } catch (err: any) {
        this.logger.error(`Hourly performance check error: ${err?.message}`);
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Main lifecycle runner:
   * 1. Auto-open cycles when review_start_date is reached.
   * 2. Auto-close cycles when review_end_date has passed.
   * 3. Send 5th and 9th day reminders to pending employees and managers.
   * 4. Send window close summary alert to Admins.
   */
  async runScheduledCycleChecks(): Promise<void> {
    const now = new Date();

    // 1. Check upcoming cycles that should open
    const upcomingCycles = await this.prisma.perf_cycles.findMany({
      where: {
        status: 'UPCOMING',
        review_start_date: { lte: now },
        review_end_date: { gte: now },
      },
    });

    for (const cycle of upcomingCycles) {
      await this.openCycle(cycle);
    }

    // 2. Check active cycles that should close
    const expiredCycles = await this.prisma.perf_cycles.findMany({
      where: {
        status: 'REVIEW_OPEN',
        review_end_date: { lt: now },
      },
    });

    for (const cycle of expiredCycles) {
      await this.closeCycle(cycle);
    }

    // 3. Check open cycles for Day 5 and Day 9 reminders
    const openCycles = await this.prisma.perf_cycles.findMany({
      where: { status: 'REVIEW_OPEN' },
    });

    for (const cycle of openCycles) {
      await this.sendMidWindowReminders(cycle, now);
    }
  }

  /**
   * Transition cycle to REVIEW_OPEN and send launch notifications
   */
  private async openCycle(cycle: any): Promise<void> {
    this.logger.log(`Opening review cycle #${cycle.cycle_id} (${cycle.cycle_name})`);

    await this.prisma.perf_cycles.update({
      where: { cycle_id: cycle.cycle_id },
      data: { status: 'REVIEW_OPEN', updated_at: new Date() },
    });

    if (!this.createNotificationUseCase) return;

    // A. Notify Active Employees
    const activeEmployees = await this.prisma.employees.findMany({
      where: {
        status: 'Active',
        deleted_at: null,
        OR: [
          { joining_date: { lte: new Date(cycle.end_date) } },
        ],
      },
      select: { emp_id: true, name: true, reporting_manager: true },
    });

    const endDateStr = new Date(cycle.review_end_date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    for (const emp of activeEmployees) {
      await this.sendNotificationIfNotSent({
        recipient_id: emp.emp_id,
        kind: 'PERF_WINDOW_OPEN',
        title: 'Performance Review Window Open',
        body: `The review window for ${cycle.cycle_name} is now open. Please submit your self-review by ${endDateStr}.`,
        entity_type: 'perf_cycles',
        entity_id: cycle.cycle_id,
      });
    }

    // B. Notify Reporting Managers
    const managerIds = Array.from(
      new Set(activeEmployees.map((e) => e.reporting_manager).filter(Boolean) as number[]),
    );

    for (const mgrId of managerIds) {
      await this.sendNotificationIfNotSent({
        recipient_id: mgrId,
        kind: 'PERF_WINDOW_OPEN_MGR',
        title: 'Performance Review Window Open - Team Reviews',
        body: `The review window for ${cycle.cycle_name} is now open. Team members can now submit self-evaluations for your review.`,
        entity_type: 'perf_cycles',
        entity_id: cycle.cycle_id,
      });
    }

    // C. Notify Admins
    const admins = await this.prisma.employees.findMany({
      where: {
        status: 'Active',
        deleted_at: null,
        OR: [
          { roles_employees_role_idToroles: { role_name: { contains: 'Admin', mode: 'insensitive' } } },
          { emp_id: 1 },
        ],
      },
      select: { emp_id: true },
    });

    for (const admin of admins) {
      await this.sendNotificationIfNotSent({
        recipient_id: admin.emp_id,
        kind: 'PERF_WINDOW_OPEN_ADMIN',
        title: 'Performance Cycle Open',
        body: `Performance review window for ${cycle.cycle_name} is now officially open until ${endDateStr}.`,
        entity_type: 'perf_cycles',
        entity_id: cycle.cycle_id,
      });
    }
  }

  /**
   * Transition cycle to CLOSED, lock reviews, and notify admins with summary tally
   */
  private async closeCycle(cycle: any): Promise<void> {
    this.logger.log(`Closing review cycle #${cycle.cycle_id} (${cycle.cycle_name})`);

    await this.prisma.perf_cycles.update({
      where: { cycle_id: cycle.cycle_id },
      data: { status: 'CLOSED', updated_at: new Date() },
    });

    // Lock all reviews
    await this.prisma.perf_reviews.updateMany({
      where: { cycle_id: cycle.cycle_id, is_locked: false },
      data: { is_locked: true, updated_at: new Date() },
    });

    if (!this.createNotificationUseCase) return;

    // Review counts
    const totalReviews = await this.prisma.perf_reviews.count({
      where: { cycle_id: cycle.cycle_id },
    });
    const submittedSelf = await this.prisma.perf_reviews.count({
      where: { cycle_id: cycle.cycle_id, self_status: 'SUBMITTED' },
    });
    const submittedManager = await this.prisma.perf_reviews.count({
      where: { cycle_id: cycle.cycle_id, manager_status: 'SUBMITTED' },
    });
    const finalized = await this.prisma.perf_reviews.count({
      where: { cycle_id: cycle.cycle_id, final_rating: { not: null } },
    });

    const pendingSelf = totalReviews - submittedSelf;

    const admins = await this.prisma.employees.findMany({
      where: {
        status: 'Active',
        deleted_at: null,
        OR: [
          { roles_employees_role_idToroles: { role_name: { contains: 'Admin', mode: 'insensitive' } } },
          { emp_id: 1 },
        ],
      },
      select: { emp_id: true },
    });

    for (const admin of admins) {
      await this.sendNotificationIfNotSent({
        recipient_id: admin.emp_id,
        kind: 'PERF_WINDOW_CLOSED_ADMIN',
        title: 'Performance Review Window Closed',
        body: `${cycle.cycle_name} has closed. Summary: ${submittedSelf}/${totalReviews} self-reviews submitted (${pendingSelf} pending), ${submittedManager} manager reviews completed, ${finalized} finalized.`,
        entity_type: 'perf_cycles',
        entity_id: cycle.cycle_id,
      });
    }
  }

  /**
   * Mid-window reminders on 5th and 9th day
   */
  private async sendMidWindowReminders(cycle: any, now: Date): Promise<void> {
    if (!cycle.review_start_date || !this.createNotificationUseCase) return;

    const startDate = new Date(cycle.review_start_date);
    const msDiff = now.getTime() - startDate.getTime();
    const daysElapsed = Math.floor(msDiff / (1000 * 60 * 60 * 24)) + 1;

    // Check if day is 5 or 9
    if (daysElapsed !== 5 && daysElapsed !== 9) return;

    const reminderKind = `PERF_REMINDER_DAY_${daysElapsed}`;

    // Find pending self reviews
    const pendingReviews = await this.prisma.perf_reviews.findMany({
      where: {
        cycle_id: cycle.cycle_id,
        self_status: 'PENDING',
      },
      select: {
        review_id: true,
        emp_id: true,
        manager_emp_id: true,
      },
    });

    for (const rev of pendingReviews) {
      await this.sendNotificationIfNotSent({
        recipient_id: rev.emp_id,
        kind: `${reminderKind}_SELF`,
        title: `Reminder: Performance Self-Review Pending (Day ${daysElapsed})`,
        body: `You have not yet submitted your self-evaluation for ${cycle.cycle_name}. The review window closes soon.`,
        entity_type: 'perf_reviews',
        entity_id: rev.review_id,
      });
    }

    // Remind managers who have pending direct report reviews
    const pendingMgrReviews = await this.prisma.perf_reviews.findMany({
      where: {
        cycle_id: cycle.cycle_id,
        manager_status: 'PENDING',
        manager_emp_id: { not: null },
      },
      select: {
        manager_emp_id: true,
      },
    });

    const pendingMgrIds = Array.from(
      new Set(pendingMgrReviews.map((r) => r.manager_emp_id).filter(Boolean) as number[]),
    );

    for (const mgrId of pendingMgrIds) {
      await this.sendNotificationIfNotSent({
        recipient_id: mgrId,
        kind: `${reminderKind}_MGR`,
        title: `Reminder: Team Performance Reviews Pending (Day ${daysElapsed})`,
        body: `You have team members waiting for manager evaluation in ${cycle.cycle_name}. Please complete them before the window closes.`,
        entity_type: 'perf_cycles',
        entity_id: cycle.cycle_id,
      });
    }
  }

  private async sendNotificationIfNotSent(payload: {
    recipient_id: number;
    kind: string;
    title: string;
    body: string;
    entity_type: string;
    entity_id: number;
  }): Promise<void> {
    const existing = await this.prisma.notifications.findFirst({
      where: {
        recipient_id: payload.recipient_id,
        kind: payload.kind,
        entity_id: payload.entity_id,
      },
    });

    if (!existing && this.createNotificationUseCase) {
      try {
        await this.createNotificationUseCase.execute(payload);
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch notification to emp #${payload.recipient_id}: ${err?.message}`);
      }
    }
  }
}
