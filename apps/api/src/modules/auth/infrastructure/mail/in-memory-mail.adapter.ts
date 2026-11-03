import { Injectable } from '@nestjs/common';
import { MailPort, WelcomeCredentialsParams } from '../../application/ports/auth.ports';

export interface SentEmailRecord {
  to: string;
  code?: string;
  purpose: 'login_2fa' | 'password_reset' | 'welcome_credentials';
  sentAt: Date;
  details?: any;
}

@Injectable()
export class InMemoryMailAdapter implements MailPort {
  public sentEmails: SentEmailRecord[] = [];

  async sendOtp(to: string, code: string, purpose: 'login_2fa' | 'password_reset'): Promise<void> {
    this.sentEmails.push({
      to,
      code,
      purpose,
      sentAt: new Date(),
    });
  }

  async sendWelcomeCredentials(params: WelcomeCredentialsParams): Promise<void> {
    this.sentEmails.push({
      to: params.officeEmail,
      purpose: 'welcome_credentials',
      sentAt: new Date(),
      details: params,
    });
  }

  getLatestEmailFor(to: string): SentEmailRecord | undefined {
    return [...this.sentEmails].reverse().find((e) => e.to.toLowerCase() === to.toLowerCase());
  }

  clear(): void {
    this.sentEmails = [];
  }
}
