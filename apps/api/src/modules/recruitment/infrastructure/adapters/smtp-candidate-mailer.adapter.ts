import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { CandidateMailerPort, RegretEmail } from '../../application/ports/recruitment-services.port';

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The polite regret email, worded for a person who did not get the job. Kept separate so it can be tested. */
export function regretEmailContent(mail: RegretEmail, company: string): { subject: string; text: string; html: string } {
  const role = mail.position ? ` for the ${mail.position} position` : '';
  const subject = `Your application${role} at ${company}`;
  const text = [
    `Dear ${mail.candidateName},`,
    '',
    `Thank you for your interest in ${company} and for the time you spent with us during the selection process${role}.`,
    '',
    'After careful consideration, we have decided not to move forward with your application at this time. This was not an easy decision, and it is not a reflection of your abilities.',
    '',
    'We will keep your profile on record and may reach out if a suitable opportunity comes up. We wish you every success in your career.',
    '',
    'Warm regards,',
    `Talent Acquisition Team, ${company}`,
  ].join('\n');
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;color:#334155;font-size:14px;line-height:1.6;">
      <p>Dear ${esc(mail.candidateName)},</p>
      <p>Thank you for your interest in ${esc(company)} and for the time you spent with us during the selection process${esc(role)}.</p>
      <p>After careful consideration, we have decided not to move forward with your application at this time. This was not an easy decision, and it is not a reflection of your abilities.</p>
      <p>We will keep your profile on record and may reach out if a suitable opportunity comes up. We wish you every success in your career.</p>
      <p style="margin-bottom:0;">Warm regards,<br/>Talent Acquisition Team, ${esc(company)}</p>
    </div>`;
  return { subject, text, html };
}

/** Sends candidate emails through the same SMTP server as the rest of the app (SMTP_* and MAIL_FROM). */
@Injectable()
export class SmtpCandidateMailerAdapter implements CandidateMailerPort {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST;
    if (!host) throw new Error('SMTP_HOST is not set, so no email can be sent');
    const port = Number(process.env.SMTP_PORT || 587);
    const user = (process.env.SMTP_USER || '').trim();
    const rawPass = (process.env.SMTP_PASS || '').trim();
    const pass = host.includes('gmail.com') ? rawPass.replace(/\s+/g, '') : rawPass;
    this.transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass } : undefined });
    return this.transporter;
  }

  async sendRegretEmail(mail: RegretEmail): Promise<void> {
    const company = process.env.COMPANY_NAME || 'Vernoxy';
    const { subject, text, html } = regretEmailContent(mail, company);
    await this.getTransporter().sendMail({
      from: process.env.MAIL_FROM || 'Vernoxy Pulse <no-reply@vernoxy.com>',
      to: mail.to,
      subject,
      text,
      html,
    });
  }
}
