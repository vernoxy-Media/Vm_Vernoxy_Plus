import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';
import { LeaveCoreService } from './leave-core.service';

export interface LeaveNotice {
  recipients: Array<number | null | undefined>;
  title: string;
  body: string;
  requestId?: number | null;
  kind?: string;
  actorId?: number | null;
  /** Hide from the employee's own History view (BFD 11: notifications sent to others). */
  employeeId?: number | null;
}

/**
 * Sends Leave notifications (BFD Section 15) in-app (the bell). Leave sends no email: waiting for the
 * mail server made applying and deciding on leave slow. Every send is recorded in the request History.
 */
@Injectable()
export class LeaveNotifierService {
  private readonly logger = new Logger(LeaveNotifierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: LeaveCoreService,
    @Optional() private readonly createNotification?: CreateNotificationUseCase,
  ) {}

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

    // History of the request
    const requestId = n.requestId;
    if (!requestId) return;
    const people = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, name FROM employees WHERE emp_id = ANY(${ids}::int[]);
    `;
    for (const p of people) {
      try {
        await this.core.logHistory(this.prisma, requestId, 'Notification sent', `${p.name} told in-app`, null, {
          to: p.emp_id,
          to_name: p.name,
          channel: 'IN_APP',
          private_to_others: n.employeeId ? p.emp_id !== n.employeeId : false,
          title: n.title,
        });
      } catch (err: any) {
        this.logger.warn(`Leave history (notification) failed: ${err?.message}`);
      }
    }
  }
}
