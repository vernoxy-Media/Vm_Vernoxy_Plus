import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { encryptPayload, pushHeaders, type PushSubscriptionKeys, type VapidKeys } from '../domain/web-push.crypto';
import { isAllowedPushEndpoint, toPayload, type PushPayload } from '../domain/push-rules';

interface SubscriptionRow {
  subscription_id: number;
  emp_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushSendResult {
  /** The browser can no longer be reached (the person turned notifications off, or removed the browser) */
  gone: boolean;
  ok: boolean;
}

/** How a request reaches the push service of a browser. Injected so tests do not touch the network. */
export type PushTransport = (endpoint: string, headers: Record<string, string>, body: Buffer) => Promise<number>;

const sendOverHttps: PushTransport = async (endpoint, headers, body) => {
  const res = await fetch(endpoint, { method: 'POST', headers, body: new Uint8Array(body), signal: AbortSignal.timeout(10_000) });
  return res.status;
};

/**
 * Desktop notifications for people who do not have the app open: stores each person's browsers and sends them a
 * notification. Everything is best effort: a notification that cannot be sent never fails the work that caused it.
 * Without VAPID keys in the environment the feature is simply off.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger('PushService');
  private transport: PushTransport = sendOverHttps;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** For tests: send through something other than the network. */
  useTransport(t: PushTransport): void {
    this.transport = t;
  }

  private vapid(): VapidKeys | null {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    if (!publicKey || !privateKey) return null;
    return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@vernoxy.com' };
  }

  isEnabled(): boolean {
    return this.vapid() !== null;
  }

  /** What the browser needs to ask for a subscription. */
  config(): { enabled: boolean; public_key: string | null } {
    const v = this.vapid();
    return { enabled: v !== null, public_key: v?.publicKey ?? null };
  }

  async subscribe(empId: number, sub: PushSubscriptionKeys, userAgent?: string | null): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO push_subscriptions (emp_id, endpoint, p256dh, auth, user_agent)
      VALUES (${empId}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, ${(userAgent ?? '').slice(0, 300) || null})
      ON CONFLICT (endpoint) DO UPDATE
        SET emp_id = EXCLUDED.emp_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
            user_agent = EXCLUDED.user_agent, last_seen_at = clock_timestamp()`;
  }

  async unsubscribe(empId: number, endpoint: string): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND emp_id = ${empId}`;
  }

  /** Sends one notification to every browser of every person in `empIds`. Never throws. */
  async notify(empIds: number[], payload: PushPayload, opts: { urgency?: 'normal' | 'high' } = {}): Promise<void> {
    const vapid = this.vapid();
    if (!vapid) return;
    const ids = Array.from(new Set(empIds.filter((n) => Number.isInteger(n) && n > 0)));
    if (ids.length === 0) return;
    try {
      const rows = await this.prisma.$queryRaw<SubscriptionRow[]>`
        SELECT subscription_id, emp_id, endpoint, p256dh, auth FROM push_subscriptions WHERE emp_id = ANY(${ids}::int[])`;
      if (rows.length === 0) return;
      const body = Buffer.from(JSON.stringify(toPayload(payload)), 'utf8');
      const results = await Promise.all(rows.map((row) => this.sendOne(row, body, vapid, opts.urgency)));
      const gone = rows.filter((_, i) => results[i].gone).map((r) => r.subscription_id);
      if (gone.length > 0) await this.prisma.$executeRaw`DELETE FROM push_subscriptions WHERE subscription_id = ANY(${gone}::int[])`;
    } catch (err) {
      this.logger.warn(`Could not send desktop notifications: ${(err as Error)?.message}`);
    }
  }

  private async sendOne(row: SubscriptionRow, body: Buffer, vapid: VapidKeys, urgency?: 'normal' | 'high'): Promise<PushSendResult> {
    // A stored address that is not a real browser push service is never called
    if (!isAllowedPushEndpoint(row.endpoint)) return { ok: false, gone: true };
    try {
      const encrypted = encryptPayload(row, body);
      const status = await this.transport(row.endpoint, pushHeaders(row.endpoint, vapid, encrypted.length, { urgency }), encrypted);
      if (status >= 200 && status < 300) return { ok: true, gone: false };
      // 404 and 410 mean the browser has unsubscribed; anything else is a passing problem
      return { ok: false, gone: status === 404 || status === 410 };
    } catch (err) {
      this.logger.warn(`A desktop notification was not delivered: ${(err as Error)?.message}`);
      return { ok: false, gone: false };
    }
  }
}
