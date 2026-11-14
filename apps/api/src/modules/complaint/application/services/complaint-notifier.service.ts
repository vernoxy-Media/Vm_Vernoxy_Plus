import { Injectable, Logger, Optional } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface ComplaintNotice {
  recipients: Array<number | null | undefined>;
  /** notifications.kind accepts only [a-z_]. */
  kind: string;
  title: string;
  body: string;
  /** BFD 13 "How": in-app and email, or in-app only. */
  email?: boolean;
  complaintId?: number | null;
  actorId?: number | null;
}

export interface DeliveryResult {
  empId: number;
  name: string;
  email: boolean;
  /** null when no email was attempted */
  delivered: boolean | null;
}

/**
 * BFD Section 13 Messages and Notifications. In-app is the bell; email goes to the office email
 * in the Employee Master. Deactivated employees are not notified (BFD 14).
 */
@Injectable()
export class ComplaintNotifierService {
  private readonly logger = new Logger(ComplaintNotifierService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from = process.env.MAIL_FROM || 'Vernoxy Pulse <no-reply@vernoxy.com>';

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly createNotification?: CreateNotificationUseCase,
  ) {}

  async adminIds(): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<Array<{ emp_id: number }>>`
      SELECT e.emp_id FROM employees e JOIN roles r ON r.role_id = e.role_id
      WHERE r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL ORDER BY e.emp_id;
    `;
    return rows.map((r) => Number(r.emp_id));
  }

  /** Sends to active employees only and returns what was delivered, for the History. */
  async send(n: ComplaintNotice): Promise<DeliveryResult[]> {
    const ids = Array.from(new Set(n.recipients.filter((r): r is number => typeof r === 'number' && r > 0)));
    if (!ids.length) return [];
    const people = await this.prisma.$queryRaw<Array<{ emp_id: number; name: string; email: string | null }>>`
      SELECT emp_id, name, COALESCE(office_email, email) AS email FROM employees
      WHERE emp_id = ANY(${ids}::int[]) AND status = 'Active' AND deleted_at IS NULL;
    `;
    if (!people.length) return [];
    const rows = people.map((p) => ({
      recipient_id: Number(p.emp_id),
      kind: n.kind.slice(0, 50),
      title: n.title.slice(0, 150),
      body: n.body.slice(0, 300),
      entity_type: 'COMPLAINT',
      entity_id: n.complaintId ?? null,
      created_by: n.actorId ?? null,
    }));
    try {
      if (this.createNotification) await this.createNotification.executeMany(rows as any);
      else await this.prisma.notifications.createMany({ data: rows });
    } catch (err: any) {
      this.logger.warn(`Complaint in-app notification failed: ${err?.message}`);
    }
    const body = n.body.replace(/\s*\[#[^\]]*\]$/, '');
    return Promise.all(
      people.map(async (p) => ({
        empId: Number(p.emp_id),
        name: p.name,
        email: Boolean(n.email),
        delivered: n.email ? await this.sendEmail(p.email, n.title, body, p.name, n.complaintId ?? null) : null,
      })),
    );
  }

  /** Recipients who have not yet had this kind + key for this complaint (used by reminders). */
  async notYetSent(kind: string, complaintId: number | null, recipients: number[], key: string): Promise<number[]> {
    if (!recipients.length) return [];
    const sent = await this.prisma.$queryRaw<Array<{ recipient_id: number }>>`
      SELECT recipient_id FROM notifications
      WHERE kind = ${kind} AND entity_type = 'COMPLAINT'
        AND entity_id IS NOT DISTINCT FROM ${complaintId}::int
        AND recipient_id = ANY(${recipients}::int[])
        AND body LIKE ${'%[#' + key + ']'};
    `;
    const done = new Set(sent.map((s) => Number(s.recipient_id)));
    return recipients.filter((r) => !done.has(r));
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

  private async sendEmail(to: string | null, subject: string, body: string, name: string, complaintId: number | null): Promise<boolean> {
    if (!to) return false;
    const transporter = this.getTransporter();
    if (!transporter) return false;
    const webUrl = process.env.WEB_ORIGIN || 'http://localhost:5173';
    const link = `${webUrl}/complaints${complaintId ? `?open=${complaintId}` : ''}`;
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
        <h2 style="color:#0f172a;margin-top:0;">Vernoxy Pulse · Complaints</h2>
        <p style="color:#334155;font-size:14px;">Hello ${esc(name)},</p>
        <p style="color:#334155;font-size:14px;white-space:pre-line;">${esc(body)}</p>
        <p style="margin:24px 0;"><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:13px;">Open Complaints</a></p>
      </div>`;
    try {
      await transporter.sendMail({ from: this.from, to, subject: `Complaints: ${subject}`, text: `${body}\n\n${link}`, html });
      return true;
    } catch (err: any) {
      this.logger.warn(`Complaint email to ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')} failed: ${err?.message}`);
      return false;
    }
  }
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
