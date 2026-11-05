import { Injectable, Logger, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';
import { LeaveCoreService } from './leave-core.service';

export interface LeaveNotice {
  recipients: Array<number | null | undefined>;
  title: string;
  body: string;
  email?: boolean;
  requestId?: number | null;
  kind?: string;
  actorId?: number | null;
  /** Hide from the employee's own History view (BFD 11: notifications sent to others). */
  employeeId?: number | null;
}

/**
 * Sends Leave notifications (BFD Section 15): in-app (bell) and, where the
 * table says so, email to the office email. Every send is recorded in the
 * request History with the delivery result.
 */
@Injectable()
export class LeaveNotifierService {
  private readonly logger = new Logger(LeaveNotifierService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from = process.env.MAIL_FROM || 'Vernoxy Pulse <no-reply@vernoxy.com>';

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: LeaveCoreService,
    @Optional() private readonly createNotification?: CreateNotificationUseCase,
  ) {}

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST;
    if (!host) return null;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = (process.env.SMTP_USER || '').trim();
    const rawPass = (process.env.SMTP_PASS || '').trim();
    const pass = host.includes('gmail.com') ? rawPass.replace(/\s+/g, '') : rawPass;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
    return this.transporter;
  }

  async notify(n: LeaveNotice): Promise<void> {
    const ids = Array.from(new Set(n.recipients.filter((r): r is number => typeof r === 'number' && r > 0)));
    if (!ids.length) return;

    // In-app
    try {
      if (this.createNotification) {
        await this.createNotification.executeMany(
          ids.map((id) => ({
            recipient_id: id,
            kind: (n.kind || 'leave').slice(0, 50),
            title: n.title.slice(0, 150),
            body: n.body.slice(0, 300),
            entity_type: 'LEAVE_REQUEST',
            entity_id: n.requestId ?? null,
            created_by: n.actorId ?? null,
          })),
        );
      } else {
        for (const id of ids) {
          await this.prisma.$executeRaw`
            INSERT INTO notifications (recipient_id, kind, title, body, entity_type, entity_id, created_by)
            VALUES (${id}, ${(n.kind || 'leave').slice(0, 50)}, ${n.title.slice(0, 150)}, ${n.body.slice(0, 300)},
                    'LEAVE_REQUEST', ${n.requestId ?? null}, ${n.actorId ?? null});
          `;
        }
      }
    } catch (err: any) {
      this.logger.warn(`Leave in-app notification failed: ${err?.message}`);
    }

    // Email + history
    const people = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, name, COALESCE(office_email, email) AS email FROM employees WHERE emp_id = ANY(${ids}::int[]);
    `;
    for (const p of people) {
      let delivered: boolean | null = null;
      if (n.email) {
        delivered = await this.sendEmail(p.email, n.title, n.body, p.name);
      }
      if (n.requestId) {
        try {
          await this.core.logHistory(
            this.prisma,
            n.requestId,
            'Notification sent',
            `${p.name} told by ${n.email ? 'in-app and email' : 'in-app'}${n.email && delivered === false ? ' (Email not delivered)' : ''}`,
            null,
            {
              to: p.emp_id,
              to_name: p.name,
              channel: n.email ? 'IN_APP_EMAIL' : 'IN_APP',
              email_delivered: delivered,
              private_to_others: n.employeeId ? p.emp_id !== n.employeeId : false,
              title: n.title,
            },
          );
        } catch (err: any) {
          this.logger.warn(`Leave history (notification) failed: ${err?.message}`);
        }
      }
    }
  }

  private async sendEmail(to: string | null, subject: string, body: string, name: string): Promise<boolean> {
    if (!to) return false;
    const transporter = this.getTransporter();
    if (!transporter) return false;
    const webUrl = process.env.WEB_ORIGIN || 'http://localhost:5173';
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
        <h2 style="color:#0f172a;margin-top:0;">Vernoxy Pulse · Leave</h2>
        <p style="color:#334155;font-size:14px;">Hello ${escapeHtml(name)},</p>
        <p style="color:#334155;font-size:14px;white-space:pre-line;">${escapeHtml(body)}</p>
        <p style="margin:24px 0;"><a href="${webUrl}/leave" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Open Leave</a></p>
      </div>`;
    try {
      await transporter.sendMail({ from: this.from, to, subject: `Leave: ${subject}`, text: body, html });
      return true;
    } catch (err: any) {
      this.logger.warn(`Leave email to ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')} failed: ${err?.message}`);
      return false;
    }
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
