import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { LeaveCoreService } from './leave-core.service';
import { LeaveBalanceService } from './leave-balance.service';
import { LeaveNotifierService } from './leave-notifier.service';
import { LeaveService } from './leave.service';
import {
  addDays,
  diffDays,
  fmtDate,
  fmtDayMonth,
  leaveYearOf,
  num,
  round2,
  toDateStr,
  todayStr,
} from '../../domain/leave-dates';

/**
 * Scheduled Leave work (BFD Sections 10 and 15):
 *  - monthly / yearly / pro-rata credits, Comp-off credit and expiry
 *  - automatic year-end processing
 *  - deactivated employees (withdraw Pending, cancel future Approved, freeze)
 *  - Holiday / shift changes (recalculate Leave Days in open months)
 *  - reminders (Pending 24h, first day reached, day before leave, Comp-off expiring)
 * Every step is idempotent, so the job can run hourly and after restarts.
 */
@Injectable()
export class LeaveJobsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(LeaveJobsService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: LeaveCoreService,
    private readonly balances: LeaveBalanceService,
    private readonly notifier: LeaveNotifierService,
    private readonly leave: LeaveService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.LEAVE_JOBS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return;
    setTimeout(() => this.tick().catch(() => undefined), 20_000);
    this.timer = setInterval(() => this.tick().catch(() => undefined), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const steps: Array<[string, () => Promise<any>]> = [
      ['year end', () => this.runAutomaticYearEnd()],
      ['credits', () => this.runCredits()],
      ['comp-off credit', () => this.runCompOff()],
      ['comp-off expiry', () => this.balances.runCompOffExpiry()],
      ['deactivations', () => this.processDeactivations()],
      ['recalculation', () => this.recalculateOpenRequests()],
      ['reminders', () => this.sendReminders()],
    ];
    try {
      for (const [name, fn] of steps) {
        try {
          await fn();
        } catch (err: any) {
          this.logger.warn(`Leave job "${name}" failed: ${err?.message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async claim(key: string, type = 'REMINDER'): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<any[]>`
      INSERT INTO leave_credit_runs (run_key, run_type) VALUES (${key.slice(0, 80)}, ${type})
      ON CONFLICT (run_key) DO NOTHING RETURNING run_key;
    `;
    return rows.length > 0;
  }

  // ---------------------------------------------------------------------------
  // Credits
  // ---------------------------------------------------------------------------

  private async runCredits() {
    const credited = await this.balances.runCreditsForAll();
    for (const c of credited) {
      await this.notifier.notify({
        recipients: [c.emp_id],
        title: 'Leave balance credited',
        body: `New leave days were credited to your balance (${c.credits} credit${c.credits === 1 ? '' : 's'}). See My Leave > Leave Ledger.`,
        kind: 'leave_balance',
      });
    }
  }

  private async runCompOff() {
    const grants = await this.balances.runCompOffCredits();
    for (const g of grants) {
      await this.notifier.notify({
        recipients: [g.emp_id],
        title: 'Comp-off credited',
        body: `${g.days} day${g.days === 1 ? '' : 's'} of Comp-off credited for ${g.hours} hours of OT on ${fmtDate(g.ot_date)}. Use it by ${fmtDate(g.expiry)}.`,
        kind: 'leave_balance',
      });
    }
  }

  private async runAutomaticYearEnd() {
    const settings = await this.core.getSettings();
    if (settings.year_end_processing !== 'AUTOMATIC') return;
    const current = leaveYearOf(todayStr(), settings.start_month);
    const previous = current - 1;
    if (await this.balances.isYearEndDone(previous)) return;
    const [has] = await this.prisma.$queryRaw<any[]>`SELECT 1 FROM leave_balances WHERE leave_year = ${previous} LIMIT 1`;
    if (!has) {
      await this.claim(`YEAR_END:${previous}`, 'YEAR_END');
      return;
    }
    const r = await this.balances.runYearEnd(previous, null);
    this.logger.log(`Leave year end ${previous}: ${r.processed} balances processed`);
    const emps = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT emp_id FROM leave_ledger WHERE leave_year IN (${previous}, ${current})
        AND entry_type IN ('CARRIED_FORWARD','LAPSED') AND performed_at > now() - interval '1 day';
    `;
    for (const e of emps) {
      await this.notifier.notify({
        recipients: [e.emp_id],
        title: 'Leave year closed',
        body: 'Unused leave was carried forward or lapsed at year end. See My Leave > Leave Ledger for details.',
        kind: 'leave_balance',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Deactivated employees (BFD 10.2)
  // ---------------------------------------------------------------------------

  async processDeactivations() {
    const today = todayStr();
    const emps = await this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, e.status::text AS status, e.termination_date
      FROM employees e
      WHERE e.deleted_at IS NULL
        AND (e.status = 'Inactive' OR (e.termination_date IS NOT NULL AND e.termination_date <= ${today}::date))
        AND NOT EXISTS (SELECT 1 FROM leave_credit_runs c WHERE c.run_key = 'DEACT:' || e.emp_id::text);
    `;
    for (const e of emps) {
      const term = e.termination_date ? toDateStr(e.termination_date) : today;
      try {
        const pending = await this.prisma.$queryRaw<any[]>`
          SELECT request_id FROM leave_requests WHERE emp_id = ${e.emp_id} AND status = 'PENDING';
        `;
        for (const r of pending) {
          await this.leave.withdrawLeave(r.request_id, e.emp_id, { reason: 'Employee deactivated' }, true);
        }
        const future = await this.prisma.$queryRaw<any[]>`
          SELECT request_id FROM leave_requests
          WHERE emp_id = ${e.emp_id} AND status IN ('APPROVED','CANCELLATION_REQUESTED') AND from_date > ${term}::date;
        `;
        for (const r of future) {
          await this.leave.adminCancelLeave(r.request_id, 0, { reason: `Leave after the Termination Date (${fmtDate(term)})` }, true);
        }
        await this.balances.freezeEmployee(this.prisma, e.emp_id);
        await this.claim(`DEACT:${e.emp_id}`, 'SYSTEM');
      } catch (err: any) {
        this.logger.warn(`Leave deactivation for emp #${e.emp_id} failed: ${err?.message}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Holiday / shift changes (BFD 16)
  // ---------------------------------------------------------------------------

  async recalculateOpenRequests() {
    const settings = await this.core.getSettings();
    const today = todayStr();
    const since = addDays(today, -62);
    const reqs = await this.prisma.$queryRaw<any[]>`
      -- Explicit columns: a cached r.* plan breaks on pooled connections after leave_requests changes.
      SELECT r.request_id, r.request_no, r.emp_id, r.leave_type_id, r.status, r.duration, r.from_date, r.to_date,
             r.leave_days, r.leave_year, r.applied_at,
             t.name AS leave_type_name, t.code, t.balance_tracked
      FROM leave_requests r JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE r.status IN ('PENDING','APPROVED','CANCELLATION_REQUESTED') AND r.to_date >= ${since}::date;
    `;
    for (const r of reqs) {
      try {
        const from = toDateStr(r.from_date);
        const to = toDateStr(r.to_date);
        const calc = await this.core.countLeaveDays(r.emp_id, from, to, r.duration, settings);
        const stored = await this.prisma.$queryRaw<any[]>`
          SELECT leave_date, day_fraction FROM leave_request_days WHERE request_id = ${r.request_id} ORDER BY leave_date;
        `;
        const a = stored.map((d) => `${toDateStr(d.leave_date)}:${num(d.day_fraction)}`).join(',');
        const b = calc.counted.map((d) => `${d.date}:${d.day_count}`).join(',');
        if (a === b) continue;
        const locked = await this.core.findLockedMonth(calc.days.map((d) => d.date));
        if (locked) continue;

        const oldDays = num(r.leave_days);
        const newDays = calc.leave_days;
        const diff = round2(newDays - oldDays);
        const year = Number(r.leave_year || from.slice(0, 4));

        if (newDays <= 0) {
          if (r.status === 'PENDING') {
            await this.leave.withdrawLeave(r.request_id, r.emp_id, { reason: 'All dates are now Holidays or Weekly Offs' }, true);
          } else {
            await this.leave.adminCancelLeave(r.request_id, 0, { reason: 'All dates are now Holidays or Weekly Offs' }, true);
          }
          await this.notifyRecalc(r, oldDays, 0);
          continue;
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`DELETE FROM leave_request_days WHERE request_id = ${r.request_id}`;
          for (const d of calc.counted) {
            await tx.$executeRaw`
              INSERT INTO leave_request_days (request_id, emp_id, leave_date, day_part, day_fraction)
              VALUES (${r.request_id}, ${r.emp_id}, ${d.date}::date, ${d.part}, ${d.day_count});
            `;
          }
          await tx.$executeRaw`
            UPDATE leave_requests SET leave_days = ${newDays}, updated_at = clock_timestamp() WHERE request_id = ${r.request_id};
          `;
          if (Math.abs(diff) > 0.001 && r.balance_tracked) {
            if (r.status === 'PENDING') {
              await this.balances.change(tx, r.emp_id, r.leave_type_id, year, { days_booked: diff });
            } else {
              const row = await this.balances.ensureRow(tx, r.emp_id, r.leave_type_id, year, true);
              await this.balances.ledger(tx, {
                empId: r.emp_id, typeId: r.leave_type_id, year,
                entryType: diff < 0 ? 'RETURNED' : 'TAKEN',
                days: -diff, balanceAfter: row.available - diff,
                note: `${r.request_no} leave days recalculated (${oldDays} → ${newDays}) after a Holiday or shift change`,
                requestId: r.request_id,
              });
              await this.balances.change(tx, r.emp_id, r.leave_type_id, year, { days_taken: diff });
            }
          }
          await this.core.logHistory(tx, r.request_id, 'Leave days recalculated',
            `Leave Days changed from ${oldDays} to ${newDays} after a Holiday or shift change`, null,
            { old_days: oldDays, new_days: newDays, dates: calc.counted.map((d) => d.date) });
        });
        await this.notifyRecalc(r, oldDays, newDays);

        if (diff > 0 && r.balance_tracked && r.status !== 'PENDING') {
          const row = await this.balances.ensureRow(this.prisma, r.emp_id, r.leave_type_id, year);
          if (row.available < 0) {
            await this.notifier.notify({
              recipients: await this.core.getAdminIds(),
              title: `Balance not enough for ${r.request_no}`,
              body: `After a shift change, ${r.request_no} needs ${newDays} days of ${r.leave_type_name}, and the balance is now ${row.available}. Please review the request.`,
              requestId: r.request_id, kind: 'leave_review',
            });
          }
        }
      } catch (err: any) {
        this.logger.debug?.(`Recalc skipped for ${r.request_no}: ${err?.message}`);
      }
    }
  }

  private async notifyRecalc(r: any, oldDays: number, newDays: number) {
    await this.notifier.notify({
      recipients: [r.emp_id],
      title: `Leave days of ${r.request_no} changed`,
      body: newDays > 0
        ? `A Holiday or shift change updated ${r.request_no}: ${oldDays} → ${newDays} leave days. The balance was updated.`
        : `All dates of ${r.request_no} are now Holidays or Weekly Offs, so the request was closed and the days went back.`,
      requestId: r.request_id, kind: 'leave_recalculated', employeeId: r.emp_id,
    });
  }

  // ---------------------------------------------------------------------------
  // Reminders (BFD 15)
  // ---------------------------------------------------------------------------

  async sendReminders() {
    const settings = await this.core.getSettings();
    const today = todayStr();
    const admins = await this.core.getAdminIds();

    // 1. Pending for 24 hours (daily while it waits) - all Admins, in-app
    const pending = await this.prisma.$queryRaw<any[]>`
      SELECT r.request_id, r.request_no, r.from_date, r.to_date, r.applied_at, e.name, t.name AS leave_type_name
      FROM leave_requests r JOIN employees e ON e.emp_id = r.emp_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE r.status = 'PENDING'
        AND r.applied_at <= now() - (${Number(settings.pending_reminder_hours)}::int * interval '1 hour');
    `;
    for (const r of pending) {
      if (!(await this.claim(`REM:${r.request_id}:${today}`))) continue;
      const hours = Math.floor((Date.now() - new Date(r.applied_at).getTime()) / 3600000);
      await this.notifier.notify({
        recipients: admins,
        title: `Waiting for you: ${r.request_no}`,
        body: `${r.name}'s ${r.leave_type_name} request (${fmtDayMonth(toDateStr(r.from_date))}) has been Pending for ${hours} hours.`,
        requestId: r.request_id, kind: 'leave_reminder',
      });
    }

    // 2. A Pending request's first day has come - all Admins, in-app and email
    const started = await this.prisma.$queryRaw<any[]>`
      SELECT r.request_id, r.request_no, r.from_date, e.name, t.name AS leave_type_name
      FROM leave_requests r JOIN employees e ON e.emp_id = r.emp_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE r.status = 'PENDING' AND r.from_date <= ${today}::date;
    `;
    for (const r of started) {
      if (!(await this.claim(`REMFIRST:${r.request_id}`))) continue;
      await this.notifier.notify({
        recipients: admins,
        title: `Leave started without a decision: ${r.request_no}`,
        body: `${r.name}'s ${r.leave_type_name} request starts on ${fmtDate(toDateStr(r.from_date))} and is still Pending. The day shows Absent until it is decided.`,
        email: true, requestId: r.request_id, kind: 'leave_reminder',
      });
    }

    // 3. The day before an approved leave starts - employee and Reporting Manager, in-app
    const tomorrow = addDays(today, 1);
    const upcoming = await this.prisma.$queryRaw<any[]>`
      SELECT r.request_id, r.request_no, r.emp_id, r.from_date, r.to_date, r.duration, e.name, e.reporting_manager,
             t.name AS leave_type_name
      FROM leave_requests r JOIN employees e ON e.emp_id = r.emp_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE r.status IN ('APPROVED','CANCELLATION_REQUESTED') AND r.from_date = ${tomorrow}::date;
    `;
    for (const r of upcoming) {
      if (!(await this.claim(`PRE:${r.request_id}`))) continue;
      await this.notifier.notify({
        recipients: [r.emp_id, r.reporting_manager],
        title: `Leave starts tomorrow: ${r.request_no}`,
        body: `${r.name} is on ${r.leave_type_name} from ${fmtDate(toDateStr(r.from_date))} to ${fmtDate(toDateStr(r.to_date))}.`,
        requestId: r.request_id, kind: 'leave_reminder', employeeId: r.emp_id,
      });
    }

    // 4. Comp-off will expire in 7 days - employee, in-app
    const expiring = await this.prisma.$queryRaw<any[]>`
      SELECT grant_id, emp_id, expiry_date, days_credited, days_used FROM leave_comp_off_grants
      WHERE is_lapsed = false AND days_used < days_credited
        AND expiry_date BETWEEN ${today}::date AND ${addDays(today, 7)}::date;
    `;
    for (const g of expiring) {
      if (!(await this.claim(`COEXP:${g.grant_id}`))) continue;
      const left = round2(num(g.days_credited) - num(g.days_used));
      const exp = toDateStr(g.expiry_date);
      await this.notifier.notify({
        recipients: [g.emp_id],
        title: 'Comp-off expiring soon',
        body: `${left} day${left === 1 ? '' : 's'} of Comp-off will expire on ${fmtDate(exp)} (${diffDays(today, exp)} days left).`,
        kind: 'leave_balance',
      });
    }
  }
}
