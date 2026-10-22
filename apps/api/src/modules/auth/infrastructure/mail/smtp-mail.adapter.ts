import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailPort } from '../../application/ports/auth.ports';

@Injectable()
export class SmtpMailAdapter implements MailPort {
  private readonly logger = new Logger(SmtpMailAdapter.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST || 'localhost';
    const port = Number(process.env.SMTP_PORT || 1025);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    this.from = process.env.MAIL_FROM || 'no-reply@vernoxy.com';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }

  async sendOtp(to: string, code: string, purpose: 'login_2fa' | 'password_reset'): Promise<void> {
    const isLogin = purpose === 'login_2fa';
    const subject = isLogin ? 'Your Vernoxy Pulse Verification Code' : 'Your Vernoxy Pulse Password Reset Code';
    const actionText = isLogin ? 'sign in to your Vernoxy Pulse account' : 'reset your Vernoxy Pulse password';

    const text = `Hello,\n\nYour verification code to ${actionText} is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this code, please ignore this email or contact support.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Vernoxy Pulse</h2>
        <p style="color: #475569; font-size: 15px;">Use the following 6-digit code to ${actionText}:</p>
        <div style="background-color: #f1f5f9; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a; font-family: monospace;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This code is valid for 10 minutes and can only be used once.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">If you did not request this email, please ignore it or alert your workspace administrator.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      // Redact code in log!
      this.logger.log(`Sent ${purpose} OTP email to ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production' && (err.code === 'ECONNREFUSED' || err.code === 'ESOCKET')) {
        this.logger.warn(
          `Local SMTP server not running (${err.message}). [DEV LOGIN CODE] Verification code for ${to} is: ${code}`,
        );
        return;
      }
      this.logger.error(`Failed to send OTP email: ${err.message}`);
      throw err;
    }
  }
}
