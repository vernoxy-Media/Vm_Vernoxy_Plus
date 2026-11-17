import { Injectable, Logger, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface PayrollNotice {
  recipients: Array<number | null | undefined>;
  kind: string;
  title: string;
  body: string;
  email?: boolean;
  /** Extra HTML for the email (the Salary Slip). */
  emailHtml?: string;
  /** Send to the personal email instead of the office email (deactivated employees). */
  personalEmail?: boolean;
  entityId?: number | null;
  actorId?: number | null;
  link?: string;
}

/**
 * BFD Section 15. In-app is the bell; email goes to the office email in the Employee
 * Master. notifications.kind accepts only [a-z_]. Delivery never blocks the request.
 */
@Injectable()
export class PayrollNotifierService {
  private readonly logger = new Logger(PayrollNotifierService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from = process.env.MAIL_FROM || 'Vernoxy Pulse <no-reply@vernoxy.com>';

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly createNotification?: CreateNotificationUseCase,
  ) {}

  notify(n: PayrollNotice): void {
    void this.deliver(n).catch((err) => this.logger.warn(`Payroll notification failed: ${err?.message}`));
  }

  /** Sent at most once per recipient, kind and dedupe text (reminders). */
  async notifyOnce(n: PayrollNotice & { dedupeKey: string }): Promise<void> {
    const ids = this.ids(n.recipients);
    if (!ids.length) return;
    const sent = await this.prisma.$queryRaw<Array<{ recipient_id: number }>>`
      SELECT recipient_id FROM notifications
      WHERE kind = ${n.kind} AND entity_type = 'PAYROLL' AND recipient_id = ANY(${ids}::int[])
        AND body LIKE ${'%' + n.dedupeKey + '%'};
    `;
    const done = new Set(sent.map((s) => Number(s.recipient_id)));
    const todo = ids.filter((id) => !done.has(id));
    if (todo.length) await this.deliver({ ...n, recipients: todo });
  }

  private ids(r: Array<number | null | undefined>) {
    return Array.from(new Set(r.filter((x): x is number => typeof x === 'number' && x > 0)));
  }

  private async deliver(n: PayrollNotice): Promise<void> {
    const ids = this.ids(n.recipients);
    if (!ids.length) return;
    try {
      await this.createNotification?.executeMany(
        ids.map((id) => ({
          recipient_id: id,
          kind: n.kind.slice(0, 50),
          title: n.title.slice(0, 150),
          body: n.body.slice(0, 300),
          entity_type: 'PAYROLL',
          entity_id: n.entityId ?? null,
          created_by: n.actorId ?? null,
        })) as any,
      );
    } catch (err: any) {
      this.logger.warn(`Payroll in-app notification failed: ${err?.message}`);
    }
    if (!n.email) return;
    const people = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, name, office_email, email, personal_email FROM employees WHERE emp_id = ANY(${ids}::int[]);
    `;
    await Promise.all(
      people.map((p) => {
        const to = n.personalEmail ? p.personal_email || p.office_email || p.email : p.office_email || p.email;
        return this.sendEmail(to, n, p.name);
      }),
    );
  }

  /** Address the email went to (saved on the slip). */
  async addressFor(empId: number, personal: boolean): Promise<string | null> {
    const [p] = await this.prisma.$queryRaw<any[]>`SELECT office_email, email, personal_email FROM employees WHERE emp_id = ${empId}`;
    if (!p) return null;
    return personal ? p.personal_email || p.office_email || p.email : p.office_email || p.email;
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

  private async sendEmail(to: string | null, n: PayrollNotice, name: string) {
    if (!to) return;
    const transporter = this.getTransporter();
    if (!transporter) return;
    const webUrl = process.env.WEB_ORIGIN || 'http://localhost:5173';
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:760px;margin:0 auto;padding:24px;">
        <p style="color:#334155;font-size:14px;">Hello ${esc(name)},</p>
        <p style="color:#334155;font-size:14px;white-space:pre-line;">${esc(n.body)}</p>
        ${n.emailHtml ? `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">${n.emailHtml}</div>` : ''}
        <p style="margin:24px 0;"><a href="${webUrl}${n.link || '/'}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Open Vernoxy Pulse</a></p>
      </div>`;
    try {
      await transporter.sendMail({ from: this.from, to, subject: n.title, text: n.body, html });
    } catch (err: any) {
      this.logger.warn(`Payroll email failed: ${err?.message}`);
    }
  }
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
