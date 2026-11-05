import { Injectable, Logger, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface ExpenseNotice {
  recipients: Array<number | null | undefined>;
  kind: string;
  title: string;
  body: string;
  /** BFD 13 "How": in-app and email, or in-app only. */
  email?: boolean;
  claimId?: number | null;
  actorId?: number | null;
}

/**
 * BFD 13 Messages and Notifications. In-app is the bell; email goes to the
 * office email in the Employee Master. notifications.kind accepts only [a-z_].
 */
@Injectable()
export class ExpenseNotifierService {
  private readonly logger = new Logger(ExpenseNotifierService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from = process.env.MAIL_FROM || 'Vernoxy Pulse <no-reply@vernoxy.com>';

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly createNotification?: CreateNotificationUseCase,
  ) {}

  /**
   * Starts delivery and returns at once: the request that triggered it never
   * waits for the bell or for SMTP. Failures are logged, never thrown.
   */
  async notify(n: ExpenseNotice): Promise<void> {
    void this.deliver(n).catch((err) => this.logger.warn(`Expense notification failed: ${err?.message}`));
  }

  private async deliver(n: ExpenseNotice): Promise<void> {
    const ids = Array.from(new Set(n.recipients.filter((r): r is number => typeof r === 'number' && r > 0)));
    if (!ids.length) return;
    try {
      if (this.createNotification) {
        await this.createNotification.executeMany(
          ids.map((id) => ({
            recipient_id: id,
            kind: n.kind.slice(0, 50),
            title: n.title.slice(0, 150),
            body: n.body.slice(0, 300),
            entity_type: 'EXPENSE_CLAIM',
            entity_id: n.claimId ?? null,
            created_by: n.actorId ?? null,
          })) as any,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Expense in-app notification failed: ${err?.message}`);
    }
    if (!n.email) return;
    const people = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, name, COALESCE(office_email, email) AS email FROM employees WHERE emp_id = ANY(${ids}::int[]);
    `;
    await Promise.all(people.map((p) => this.sendEmail(p.email, n.title, n.body, p.name)));
  }

  /** Sent once per recipient, kind and claim (used by the reminders). */
  async notifyOnce(n: ExpenseNotice & { dedupeKey?: string }): Promise<void> {
    const ids = Array.from(new Set(n.recipients.filter((r): r is number => typeof r === 'number' && r > 0)));
    if (!ids.length) return;
    const sent = await this.prisma.$queryRaw<Array<{ recipient_id: number }>>`
      SELECT recipient_id FROM notifications
      WHERE kind = ${n.kind} AND entity_type = 'EXPENSE_CLAIM'
        AND entity_id IS NOT DISTINCT FROM ${n.claimId ?? null}::int
        AND recipient_id = ANY(${ids}::int[])
        AND (${n.dedupeKey ?? null}::text IS NULL OR body LIKE ${'%' + (n.dedupeKey ?? '') + '%'});
    `;
    const done = new Set(sent.map((s) => Number(s.recipient_id)));
    await this.notify({ ...n, recipients: ids.filter((id) => !done.has(id)) });
  }

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST;
    if (!host) return null;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = (process.env.SMTP_USER || '').trim();
    const rawPass = (process.env.SMTP_PASS || '').trim();
    const pass = host.includes('gmail.com') ? rawPass.replace(/\s+/g, '') : rawPass;
    this.transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass } : undefined });
    return this.transporter;
  }

  private async sendEmail(to: string | null, subject: string, body: string, name: string) {
    if (!to) return;
    const transporter = this.getTransporter();
    if (!transporter) return;
    const webUrl = process.env.WEB_ORIGIN || 'http://localhost:5173';
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
        <h2 style="color:#0f172a;margin-top:0;">Vernoxy Pulse · Expenses</h2>
        <p style="color:#334155;font-size:14px;">Hello ${esc(name)},</p>
        <p style="color:#334155;font-size:14px;white-space:pre-line;">${esc(body)}</p>
        <p style="margin:24px 0;"><a href="${webUrl}/expense" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Open Expenses</a></p>
      </div>`;
    try {
      await transporter.sendMail({ from: this.from, to, subject: `Expenses: ${subject}`, text: body, html });
    } catch (err: any) {
      this.logger.warn(`Expense email to ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')} failed: ${err?.message}`);
    }
  }
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
