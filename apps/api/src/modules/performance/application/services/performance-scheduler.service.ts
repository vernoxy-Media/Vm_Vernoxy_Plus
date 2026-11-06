import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';
import { cycleStatus, fmtDayMonth, periodLabel, toDateStr, todayStr } from '../../domain/perf-rules';
import { PerformanceAccessService } from './performance-access.service';
import { PerformanceReviewsService } from './performance-reviews.service';

/**
 * BFD Section 1 "System": opens forms on time, sends notifications and locks
 * forms after the window. Runs at startup and then every hour.
 * notifications.kind accepts only [a-z_], so day numbers are spelled out.
 */
@Injectable()
export class PerformanceSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PerformanceSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PerformanceAccessService,
    private readonly reviews: PerformanceReviewsService,
    @Optional() private readonly createNotificationUseCase?: CreateNotificationUseCase,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.PERF_JOBS_ENABLED === 'false') return;
    setTimeout(() => void this.runScheduledCycleChecks(), 15_000);
    this.timer = setInterval(() => void this.runScheduledCycleChecks(), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runScheduledCycleChecks(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const today = todayStr();
      const cycles = await this.prisma.perf_cycles.findMany();
      for (const cycle of cycles) {
        try {
          const status = cycleStatus(cycle.review_start_date, cycle.review_end_date, today);
          if (status === 'REVIEW_OPEN') {
            if (cycle.status !== 'REVIEW_OPEN') await this.openCycle(cycle);
            await this.reminders(cycle, today);
          } else if (status === 'CLOSED' && cycle.status !== 'CLOSED') {
            await this.closeCycle(cycle);
          } else if (status === 'UPCOMING' && cycle.status !== 'UPCOMING') {
            await this.prisma.perf_cycles.update({ where: { cycle_id: cycle.cycle_id }, data: { status: 'UPCOMING' } });
          }
        } catch (e: any) {
          this.logger.warn(`Performance cycle #${cycle.cycle_id} check failed: ${e?.message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  /** "Your review for Oct 2026 is open until 10 Nov." to Employees, Reporting Managers and Admin. */
  private async openCycle(cycle: any) {
    this.logger.log(`Opening review window for ${cycle.cycle_name}`);
    await this.prisma.perf_cycles.update({ where: { cycle_id: cycle.cycle_id }, data: { status: 'REVIEW_OPEN', updated_at: new Date() } });
    const people = await this.reviews.eligibleEmployees(cycle);
    const noForm = await this.reviews.ensureReviewsForCycle(cycle, people);
    const label = periodLabel(cycle);
    const until = fmtDayMonth(cycle.review_end_date);
    const admins = await this.access.getAdminIds();
    const recipients = new Set<number>([...people.map((p) => Number(p.emp_id)), ...admins]);
    for (const p of people) if (p.reporting_manager) recipients.add(Number(p.reporting_manager));
    await this.sendOnce(Array.from(recipients), {
      kind: 'perf_window_open',
      title: 'Performance review is open',
      body: `Your review for ${label} is open until ${until}.`,
      entityId: cycle.cycle_id,
    });

    const missing = people.filter((p) => !p.reporting_manager).map((p) => p.name);
    if (missing.length) {
      await this.sendOnce(admins, {
        kind: 'perf_missing_manager',
        title: 'Reporting Manager missing',
        body: `${missing.length} employee(s) have no Reporting Manager for ${label}: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}. Please set one in Employee Details.`,
        entityId: cycle.cycle_id,
      });
    }
    if (noForm.length) {
      await this.sendOnce(admins, {
        kind: 'perf_form_missing',
        title: 'Review form missing',
        body: `No form is available for these departments: ${noForm.join(', ')}. Add a form or choose All departments.`,
        entityId: cycle.cycle_id,
      });
    }
  }

  /** Reminder on the 5th and the 9th to anyone who has not submitted. */
  private async reminders(cycle: any, today: string) {
    const start = Date.parse(`${toDateStr(cycle.review_start_date)}T00:00:00Z`);
    const day = Math.round((Date.parse(`${today}T00:00:00Z`) - start) / 86400000) + 1;
    if (day !== 5 && day !== 9) return;
    const rows = await this.prisma.perf_reviews.findMany({
      where: { cycle_id: cycle.cycle_id },
      select: { emp_id: true, manager_emp_id: true, self_status: true, manager_status: true, admin_status: true },
    });
    const recipients = new Set<number>();
    let adminPending = false;
    for (const r of rows) {
      if (r.self_status !== 'SUBMITTED') recipients.add(r.emp_id);
      if (r.manager_status !== 'SUBMITTED' && r.manager_emp_id) recipients.add(r.manager_emp_id);
      if (r.admin_status !== 'SUBMITTED') adminPending = true;
    }
    if (adminPending) for (const id of await this.access.getAdminIds()) recipients.add(id);
    await this.sendOnce(Array.from(recipients), {
      kind: day === 5 ? 'perf_reminder_day_five' : 'perf_reminder_day_nine',
      title: 'Performance review reminder',
      body: `Your review closes on ${fmtDayMonth(cycle.review_end_date)}. Please submit.`,
      entityId: cycle.cycle_id,
    });
  }

  /** Window closes: forms lock; "7 reviews are still pending for Oct 2026." to Admin. */
  private async closeCycle(cycle: any) {
    this.logger.log(`Closing review window for ${cycle.cycle_name}`);
    await this.prisma.perf_cycles.update({ where: { cycle_id: cycle.cycle_id }, data: { status: 'CLOSED', updated_at: new Date() } });
    const people = await this.reviews.eligibleEmployees(cycle);
    const rows = await this.prisma.perf_reviews.findMany({
      where: { cycle_id: cycle.cycle_id },
      select: { emp_id: true, self_status: true, manager_status: true, admin_status: true },
    });
    const done = new Set(
      rows
        .filter((r) => r.self_status === 'SUBMITTED' && r.manager_status === 'SUBMITTED' && r.admin_status === 'SUBMITTED')
        .map((r) => r.emp_id),
    );
    const pending = people.filter((p) => !done.has(Number(p.emp_id))).length;
    if (pending > 0) {
      await this.sendOnce(await this.access.getAdminIds(), {
        kind: 'perf_window_closed',
        title: 'Reviews still pending',
        body: `${pending} review${pending === 1 ? ' is' : 's are'} still pending for ${periodLabel(cycle)}.`,
        entityId: cycle.cycle_id,
      });
    }
  }

  private async sendOnce(recipients: number[], n: { kind: string; title: string; body: string; entityId: number }) {
    if (!this.createNotificationUseCase || !recipients.length) return;
    const already = await this.prisma.notifications.findMany({
      where: { kind: n.kind, entity_type: 'perf_cycles', entity_id: n.entityId, recipient_id: { in: recipients } },
      select: { recipient_id: true },
    });
    const sent = new Set(already.map((a) => a.recipient_id));
    const todo = recipients.filter((id) => !sent.has(id));
    if (!todo.length) return;
    try {
      await this.createNotificationUseCase.executeMany(
        todo.map((id) => ({
          recipient_id: id,
          kind: n.kind,
          title: n.title,
          body: n.body,
          entity_type: 'perf_cycles',
          entity_id: n.entityId,
        })) as any,
      );
    } catch (e: any) {
      this.logger.warn(`Performance notification "${n.kind}" failed: ${e?.message}`);
    }
  }
}
