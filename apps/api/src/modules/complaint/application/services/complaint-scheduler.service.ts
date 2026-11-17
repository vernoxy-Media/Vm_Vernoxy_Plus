import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { ComplaintNotifierService } from './complaint-notifier.service';
import { ComplaintsService } from './complaints.service';

const DAY = 86_400_000;
const todayIst = () => {
  const d = new Date();
  return new Date(d.getTime() + (330 + d.getTimezoneOffset()) * 60_000).toISOString().slice(0, 10);
};
const ymd = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

/**
 * The "System" of BFD 7, 13 and 14, run shortly after start-up and then hourly. Every step is
 * idempotent (each reminder is sent once per key), so running it often is safe:
 *  - New for N hours -> all Admins (daily while it waits)
 *  - Target Date N days away -> the handler
 *  - Overdue -> the handler and all Admins, then daily to the handler
 *  - 2 days before the Confirmation Window ends -> the employee
 *  - Window ended without a reply -> "No response", Admins told
 *  - Handler deactivated -> their active complaints move to the Admin, who is told
 */
@Injectable()
export class ComplaintSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ComplaintSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: ComplaintNotifierService,
    private readonly complaints: ComplaintsService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.COMPLAINT_JOBS_ENABLED === 'false') return;
    setTimeout(() => void this.run(), 40_000);
    this.timer = setInterval(() => void this.run(), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.step('handler hand-over', () => this.moveFromInactiveHandlers());
      await this.step('no response', () => this.markNoResponse());
      await this.step('reminders', () => this.reminders());
    } finally {
      this.running = false;
    }
  }

  private async step(name: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err: any) {
      this.logger.warn(`Complaint job "${name}" failed: ${err?.message}`);
    }
  }

  /** Sends once per recipient and key, through the service so the History records it. */
  private async once(c: any, recipients: number[], kind: string, key: string, title: string, body: string) {
    const todo = await this.notifier.notYetSent(kind, c.complaint_id, recipients.filter(Boolean), key);
    if (!todo.length) return;
    await this.complaints.deliver(c.complaint_id, c.complainant_id, null, { recipients: todo, kind, title, body: `${body} [#${key}]` });
  }

  private label(c: any) {
    return c.is_confidential ? `Confidential complaint ${c.complaint_no}` : `${c.complaint_no} "${String(c.subject || '').slice(0, 80)}"`;
  }

  private async moveFromInactiveHandlers() {
    const stuck = await this.prisma.complaints.findMany({
      where: {
        deleted_at: null,
        status: { in: ['Open', 'In Progress'] },
        employees_complaints_handlerToemployees: { OR: [{ status: { not: 'Active' } }, { deleted_at: { not: null } }] },
      },
      select: { complaint_id: true, complaint_no: true, subject: true, is_confidential: true, handler_id: true, complainant_id: true, row_version: true },
    });
    if (!stuck.length) return;
    const admins = await this.notifier.adminIds();
    const admin = admins.find((a) => true);
    if (!admin) return;
    for (const c of stuck) {
      const target = admins.find((a) => a !== c.complainant_id) ?? admin;
      const done = await this.prisma.complaints.updateMany({
        where: { complaint_id: c.complaint_id, row_version: c.row_version },
        data: { handler_id: target, reassign_reason: 'Handler deactivated', updated_at: new Date(), row_version: { increment: 1 } },
      });
      if (!done.count) continue;
      await this.prisma.activity_logs.create({
        data: {
          entity_type: 'COMPLAINT',
          entity_id: c.complaint_id,
          event: 'Reassigned',
          summary: 'Handler deactivated: moved to the Admin (System)',
          details: { old_value: String(c.handler_id), new_value: String(target), remarks: 'Handler deactivated', is_internal: false },
          performed_by: null,
        },
      });
      await this.complaints.deliver(c.complaint_id, c.complainant_id, null, {
        recipients: admins,
        kind: 'complaint_handler_inactive',
        title: `Reassign ${c.complaint_no}`,
        body: `The handler of ${this.label(c)} is deactivated. The complaint moved to the Admin; please reassign it.`,
      });
    }
  }

  private async markNoResponse() {
    const ended = await this.prisma.complaint_resolutions.findMany({
      where: { employee_confirmation_status: 'Pending', confirmation_window_ends_at: { lt: new Date() } },
      select: { resolution_id: true, complaint_id: true },
    });
    if (!ended.length) return;
    const admins = await this.notifier.adminIds();
    for (const r of ended) {
      const c = await this.prisma.complaints.findFirst({
        where: { complaint_id: r.complaint_id, deleted_at: null },
        select: { complaint_id: true, complaint_no: true, subject: true, is_confidential: true, status: true, complainant_id: true },
      });
      if (!c || c.status !== 'Resolved') continue;
      // only the latest resolution of the complaint counts
      const latest = await this.prisma.complaint_resolutions.findFirst({
        where: { complaint_id: r.complaint_id },
        orderBy: { resolved_at: 'desc' },
        select: { resolution_id: true },
      });
      if (latest?.resolution_id !== r.resolution_id) continue;
      await this.prisma.complaint_resolutions.update({
        where: { resolution_id: r.resolution_id },
        data: { employee_confirmation_status: 'No response' },
      });
      await this.prisma.activity_logs.create({
        data: {
          entity_type: 'COMPLAINT',
          entity_id: c.complaint_id,
          event: 'No response',
          summary: 'Confirmation window ended without a reply (System)',
          details: { old_value: 'Pending', new_value: 'No response', remarks: null, is_internal: false },
          performed_by: null,
        },
      });
      await this.complaints.deliver(c.complaint_id, c.complainant_id, null, {
        recipients: admins,
        kind: 'complaint_no_response',
        title: `${c.complaint_no} can be closed`,
        body: `The employee did not confirm or reopen ${this.label(c)}. It is marked "No response" and can be closed.`,
      });
    }
  }

  private async reminders() {
    const settings = await this.prisma.complaint_settings.findFirst();
    const reviewHours = settings?.review_reminder_hours ?? 24;
    const beforeTarget = settings?.reminder_before_target_days ?? 1;
    const today = todayIst();
    const admins = await this.notifier.adminIds();
    const base = { complaint_id: true, complaint_no: true, subject: true, is_confidential: true, complainant_id: true, handler_id: true, target_date: true, status: true, created_at: true } as const;

    // New for N hours -> all Admins, daily while it waits
    const waiting = await this.prisma.complaints.findMany({
      where: { deleted_at: null, status: 'New', created_at: { lte: new Date(Date.now() - reviewHours * 3_600_000) } },
      select: base,
    });
    for (const c of waiting) {
      await this.once(c, admins, 'complaint_review_reminder', `review-${today}`, `${c.complaint_no} waits for review`,
        `${this.label(c)} has been New for more than ${reviewHours} hours.`);
    }

    // Target Date reminder and Overdue
    const active = await this.prisma.complaints.findMany({
      where: { deleted_at: null, status: { in: ['Open', 'In Progress'] }, target_date: { not: null } },
      select: base,
    });
    for (const c of active) {
      const target = ymd(c.target_date)!;
      const left = daysBetween(today, target);
      if (left >= 0 && left <= beforeTarget && c.handler_id) {
        await this.once(c, [c.handler_id], 'complaint_target_reminder', `target-${target}`, `${c.complaint_no} is due on ${target.split('-').reverse().join('-')}`,
          `${this.label(c)} should be resolved by its Target Date.`);
      }
      if (left < 0) {
        // First time: the handler and all Admins. Then daily to the handler.
        await this.once(c, [c.handler_id ?? 0, ...admins], 'complaint_overdue', `overdue-${target}`, `${c.complaint_no} is overdue`,
          `${this.label(c)} passed its Target Date (${target.split('-').reverse().join('-')}).`);
        if (c.handler_id) {
          await this.once(c, [c.handler_id], 'complaint_overdue_daily', `overdue-${target}-${today}`, `${c.complaint_no} is still overdue`,
            `${this.label(c)} is overdue by ${-left} day${left === -1 ? '' : 's'}.`);
        }
      }
    }

    // 2 days before the Confirmation Window ends -> the employee
    const soon = await this.prisma.complaint_resolutions.findMany({
      where: {
        employee_confirmation_status: 'Pending',
        confirmation_window_ends_at: { gt: new Date(), lte: new Date(Date.now() + 2 * DAY) },
      },
      select: { resolution_id: true, complaint_id: true, confirmation_window_ends_at: true },
    });
    for (const r of soon) {
      const c = await this.prisma.complaints.findFirst({ where: { complaint_id: r.complaint_id, status: 'Resolved', deleted_at: null }, select: base });
      if (!c) continue;
      await this.once(c, [c.complainant_id], 'complaint_confirm_reminder', `confirm-${r.resolution_id}`, `Please confirm ${c.complaint_no}`,
        `The confirmation period for your complaint ${c.complaint_no} ends on ${ymd(r.confirmation_window_ends_at)!.split('-').reverse().join('-')}. Confirm the resolution or reopen it.`);
    }
  }
}
