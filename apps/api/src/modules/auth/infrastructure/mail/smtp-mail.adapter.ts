import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailPort, WelcomeCredentialsParams } from '../../application/ports/auth.ports';

@Injectable()
export class SmtpMailAdapter implements MailPort {
  private readonly logger = new Logger(SmtpMailAdapter.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST || 'localhost';
    const port = Number(process.env.SMTP_PORT || 1025);
    const user = (process.env.SMTP_USER || '').trim();
    const rawPass = (process.env.SMTP_PASS || '').trim();
    // Strip spaces for Gmail app passwords
    const pass = host.includes('gmail.com') ? rawPass.replace(/\s+/g, '') : rawPass;
    this.from = process.env.MAIL_FROM || 'Vernoxy Pulse <no-reply@vernoxy.com>';

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

  async sendWelcomeCredentials(params: WelcomeCredentialsParams): Promise<void> {
    const loginUrl = params.loginUrl || process.env.WEB_ORIGIN || 'http://localhost:5173';
    const subject = 'Welcome to Vernoxy Pulse - Your Login Credentials';

    const textBody = `Hello ${params.employeeName},

Welcome to Vernoxy Pulse! Your employee account has been created.

Login Portal: ${loginUrl}
Email / Username: ${params.officeEmail}
Temporary Password: ${params.temporaryPassword}

Note: For security reasons, you will be required to change your temporary password immediately upon your first login. This temporary password expires in 7 days.

Best regards,
The Vernoxy Pulse Team`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2563eb; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Vernoxy Pulse</h1>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Employee Management & Workspace Portal</p>
        </div>

        <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Hello ${params.employeeName},</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Welcome to the team! Your employee profile has been created and your system login credentials are ready.
        </p>

        <div style="background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); border: 1px solid #dbeafe; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <div style="margin-bottom: 14px;">
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Office / Login Email</span>
            <span style="font-family: monospace; font-size: 14px; font-weight: 600; color: #0f172a;">${params.officeEmail}</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Temporary One-Time Password</span>
            <span style="font-family: monospace; font-size: 18px; font-weight: 700; color: #2563eb; letter-spacing: 1px;">${params.temporaryPassword}</span>
          </div>
        </div>

        <div style="text-align: center; margin: 28px 0 20px;">
          <a href="${loginUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; display: inline-block;">
            Sign in to Vernoxy Pulse
          </a>
        </div>

        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; margin-top: 20px;">
          <p style="color: #92400e; font-size: 12px; line-height: 1.5; margin: 0;">
            <strong>Important Security Notice:</strong> This one-time password works once and expires after 7 days. You will be prompted to set a new permanent password on your first sign-in before accessing the dashboard.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0 16px;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          This is an automated system email from Vernoxy Pulse. Please do not reply directly to this message.
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: params.officeEmail,
        subject,
        text: textBody,
        html: htmlBody,
      });
      this.logger.log(`Sent welcome credentials email to office email: ${params.officeEmail}`);
    } catch (err: any) {
      this.logger.warn(`Failed to send welcome credentials to ${params.officeEmail}: ${err.message}. [DEV TEMP PASSWORD: ${params.temporaryPassword}]`);
    }

    // BFD Page 23 Marker 6: A short "your login is ready" note goes to the personal email
    if (params.personalEmail && params.personalEmail.trim().toLowerCase() !== params.officeEmail.trim().toLowerCase()) {
      const personalTo = params.personalEmail.trim().toLowerCase();
      try {
        await this.transporter.sendMail({
          from: this.from,
          to: personalTo,
          subject: 'Your Vernoxy Pulse account is ready',
          text: `Hello ${params.employeeName},\n\nYour Vernoxy Pulse account is ready! We have sent your temporary login credentials to your official work email (${params.officeEmail}).\n\nPlease check your work inbox to activate your account and set up your permanent password.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #2563eb; margin-top: 0;">Vernoxy Pulse</h2>
              <p style="color: #1e293b; font-size: 15px; font-weight: 600;">Hello ${params.employeeName},</p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                Your Vernoxy Pulse account has been created. We have delivered your login details and one-time temporary password directly to your official email:
              </p>
              <p style="text-align: center; font-weight: 700; color: #0f172a; font-family: monospace; font-size: 15px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                ${params.officeEmail}
              </p>
              <p style="color: #64748b; font-size: 13px;">
                Please log into your official email inbox to activate your account.
              </p>
            </div>
          `,
        });
        this.logger.log(`Sent login alert to personal email: ${personalTo}`);
      } catch (err: any) {
        this.logger.warn(`Failed to send personal email alert to ${personalTo}: ${err.message}`);
      }
    }
  }
}
