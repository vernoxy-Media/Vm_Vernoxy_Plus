import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { PayrollAccessService } from './payroll-access.service';
import { PayrollNotifierService } from './payroll-notifier.service';
import { monthLabel } from './payroll.service';

/**
 * BFD Section 15 reminders, checked at startup and then every hour:
 *  - Pay day is 3 days away and last month's run is not locked → Accounts, Admin.
 *  - OT entries waiting for approval → the approver, once a day while pending.
 */
@Injectable()
export class PayrollSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PayrollSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PayrollAccessService,
    private readonly notifier: PayrollNotifierService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.PAYROLL_JOBS_ENABLED === 'false') return;
    setTimeout(() => void this.run(), 25_000);
    this.timer = setInterval(() => void this.run(), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.step('pay day', () => this.payDayReminder());
      await this.step('ot pending', () => this.otReminders());
    } finally {
      this.running = false;
    }
  }

  private async step(name: string, fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (err: any) {
      this.logger.warn(`Payroll job "${name}" failed: ${err?.message}`);
    }
  }

  private today() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  }

  private async payDayReminder() {
    const [s] = await this.prisma.$queryRaw<any[]>`SELECT pay_day FROM payroll_settings ORDER BY settings_id LIMIT 1;`;
    const payDay = Number(s?.pay_day) || 7;
    const today = this.today();
    const y = Number(today.slice(0, 4));
    const m = Number(today.slice(5, 7));
    const payDate = new Date(Date.UTC(y, m - 1, payDay));
    const days = Math.round((payDate.getTime() - Date.parse(`${today}T00:00:00Z`)) / 86400000);
    if (days !== 3) return;
    const prev = new Date(Date.UTC(y, m - 2, 1));
    const py = prev.getUTCFullYear();
    const pm = prev.getUTCMonth() + 1;
    const [run] = await this.prisma.$queryRaw<any[]>`SELECT status::text AS status FROM payroll_runs WHERE payroll_year = ${py} AND payroll_month = ${pm};`;
    if (run && (run.status === 'LOCKED' || run.status === 'PAID')) return;
    const label = monthLabel(py, pm);
    await this.notifier.notifyOnce({
      recipients: [...(await this.access.accountsIds()), ...(await this.access.adminIds())],
      kind: 'payroll_pay_day_reminder',
      title: `Pay day in 3 days: ${label} payroll not locked`,
      body: `Pay day is ${payDate.toISOString().slice(0, 10)}. Payroll for ${label} is ${run ? 'still a Draft' : 'not started'}.`,
      dedupeKey: label,
      link: '/admin/payroll',
    });
  }

  private async otReminders() {
    const today = this.today();
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(e.reporting_manager, 0) AS approver, count(*)::int AS n
      FROM payroll_ot_entries o JOIN payroll_runs pr ON pr.payroll_run_id = o.payroll_run_id JOIN employees e ON e.emp_id = o.emp_id
      WHERE o.status = 'PENDING' AND pr.status = 'DRAFT'
      GROUP BY 1;
    `;
    if (!rows.length) return;
    const admins = await this.access.adminIds();
    for (const r of rows) {
      const approver = Number(r.approver);
      await this.notifier.notifyOnce({
        recipients: approver ? [approver] : admins,
        kind: 'payroll_ot_pending',
        title: 'OT entries waiting for approval',
        body: `${r.n} OT entr${r.n === 1 ? 'y is' : 'ies are'} waiting for your approval (${today}).`,
        dedupeKey: `(${today})`,
        link: '/payroll/ot-approvals',
      });
    }
  }
}
