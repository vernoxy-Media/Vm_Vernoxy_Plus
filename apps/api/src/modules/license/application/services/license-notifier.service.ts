import { Injectable, Logger, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface LicenseNotice {
  recipients: Array<number | null | undefined>;
  /** notifications.kind accepts only [a-z_]. */
  kind: string;
  title: string;
  body: string;
  /** BFD 14 "How": in-app and email, or in-app only. */
  email?: boolean;
  softwareId?: number | null;
  actorId?: number | null;
}

/**
 * BFD Section 14 Messages and Notifications. In-app is the bell; email goes to the
 * office email in the Employee Master. License keys and costs are never put in a message.
 */
@Injectable()
export class LicenseNotifierService {
  private readonly logger = new Logger(LicenseNotifierService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from = process.env.MAIL_FROM || 'Vernoxy Pulse <no-reply@vernoxy.com>';

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly createNotification?: CreateNotificationUseCase,
  ) {}

  /** Starts delivery and returns at once; failures are logged, never thrown. */
  notify(n: LicenseNotice): void {
    void this.deliver(n).catch((err) => this.logger.warn(`License notification failed: ${err?.message}`));
  }

  /**
   * Sent once per recipient for the same kind, software and dedupe key (used by reminders,
   * so the hourly job never repeats a message). The key is stored at the end of the body.
   */
  async notifyOnce(n: LicenseNotice & { dedupeKey: string }): Promise<number[]> {
    const ids = this.ids(n.recipients);
    if (!ids.length) return [];
    const tag = `[#${n.dedupeKey}]`;
    const sent = await this.prisma.$queryRaw<Array<{ recipient_id: number }>>`
      SELECT recipient_id FROM notifications
      WHERE kind = ${n.kind} AND entity_type = 'SOFTWARE_LICENSE'
        AND entity_id IS NOT DISTINCT FROM ${n.softwareId ?? null}::int
        AND recipient_id = ANY(${ids}::int[])
        AND body LIKE ${'%' + tag};
    `;
    const done = new Set(sent.map((s) => Number(s.recipient_id)));
    const todo = ids.filter((id) => !done.has(id));
    if (todo.length) await this.deliver({ ...n, recipients: todo, body: `${n.body.slice(0, 290 - tag.length)} ${tag}` });
    return todo;
  }

  async adminIds(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Array<{ emp_id: number }>>`
      SELECT e.emp_id FROM employees e JOIN roles r ON r.role_id = e.role_id
      WHERE r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL ORDER BY e.emp_id;
    `;
    return rows.map((r) => Number(r.emp_id));
  }

  async managerIds(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Array<{ emp_id: number }>>`
      SELECT m.emp_id FROM software_license_managers m JOIN employees e ON e.emp_id = m.emp_id
      WHERE e.status = 'Active' AND e.deleted_at IS NULL;
    `;
    return rows.map((r) => Number(r.emp_id));
  }

  /** Accounts named in Expense or Payroll settings (safe if the payroll migration is not applied). */
  async accountsIds(): Promise<number[]> {
    const out = new Set<number>();
    const add = (rows: Array<{ emp_id: number }>) => rows.forEach((r) => out.add(Number(r.emp_id)));
    try {
      add(await this.prisma.$queryRaw<Array<{ emp_id: number }>>`
        SELECT e.emp_id FROM expense_general_settings s JOIN employees e ON e.emp_id = ANY(s.accounts_emp_ids)
        WHERE e.status = 'Active' AND e.deleted_at IS NULL;`);
    } catch {
      /* table not there */
    }
    try {
      add(await this.prisma.$queryRaw<Array<{ emp_id: number }>>`
        SELECT e.emp_id FROM payroll_settings s JOIN employees e ON e.emp_id = ANY(s.accounts_emp_ids)
        WHERE e.status = 'Active' AND e.deleted_at IS NULL;`);
    } catch {
      /* column not there */
    }
    return Array.from(out);
  }

  private ids(list: Array<number | null | undefined>): number[] {
    return Array.from(new Set(list.filter((r): r is number => typeof r === 'number' && r > 0)));
  }

  private async deliver(n: LicenseNotice): Promise<void> {
    const ids = this.ids(n.recipients);
    if (!ids.length) return;
    const rows = ids.map((id) => ({
      recipient_id: id,
      kind: n.kind.slice(0, 50),
      title: n.title.slice(0, 150),
      body: n.body.slice(0, 300),
      entity_type: 'SOFTWARE_LICENSE',
      entity_id: n.softwareId ?? null,
      created_by: n.actorId ?? null,
    }));
    try {
      if (this.createNotification) await this.createNotification.executeMany(rows as any);
      else await this.prisma.notifications.createMany({ data: rows });
    } catch (err: any) {
      this.logger.warn(`License in-app notification failed: ${err?.message}`);
    }
    if (!n.email) return;
    const people = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, name, COALESCE(office_email, email) AS email FROM employees WHERE emp_id = ANY(${ids}::int[]);
    `;
    const body = n.body.replace(/\s*\[#[^\]]*\]$/, '');
    await Promise.all(people.map((p) => this.sendEmail(p.email, n.title, body, p.name)));
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
        <h2 style="color:#0f172a;margin-top:0;">Vernoxy Pulse · Software Licenses</h2>
        <p style="color:#334155;font-size:14px;">Hello ${esc(name)},</p>
        <p style="color:#334155;font-size:14px;white-space:pre-line;">${esc(body)}</p>
        <p style="margin:24px 0;"><a href="${webUrl}/licenses" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Open Licenses</a></p>
      </div>`;
    try {
      await transporter.sendMail({ from: this.from, to, subject: `Licenses: ${subject}`, text: body, html });
    } catch (err: any) {
      this.logger.warn(`License email to ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')} failed: ${err?.message}`);
    }
  }
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
