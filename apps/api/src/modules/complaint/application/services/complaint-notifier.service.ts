import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';

export interface ComplaintNotice {
  recipients: Array<number | null | undefined>;
  /** notifications.kind accepts only [a-z_]. */
  kind: string;
  title: string;
  body: string;
  complaintId?: number | null;
  actorId?: number | null;
}

export interface DeliveryResult {
  empId: number;
  name: string;
}

/**
 * BFD Section 13 Messages and Notifications, in-app only (the bell). Complaints send no email:
 * it was removed so submitting and handling a complaint does not wait for the mail server.
 * Deactivated employees are not notified (BFD 14).
 */
@Injectable()
export class ComplaintNotifierService {
  private readonly logger = new Logger(ComplaintNotifierService.name);

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
    const people = await this.prisma.$queryRaw<Array<{ emp_id: number; name: string }>>`
      SELECT emp_id, name FROM employees
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
    return people.map((p) => ({ empId: Number(p.emp_id), name: p.name }));
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
}
