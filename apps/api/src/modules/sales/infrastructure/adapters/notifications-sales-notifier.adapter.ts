import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/public-api';
import { LeadAssignedNotice, Notice, SalesNotifierPort } from '../../application/ports/sales-notifier.port';

@Injectable()
export class NotificationsSalesNotifierAdapter implements SalesNotifierPort {
  constructor(
    private readonly createNotification: CreateNotificationUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async leadAssigned(n: LeadAssignedNotice): Promise<void> {
    const by = await this.prisma.employees.findUnique({ where: { emp_id: n.assigned_by_emp_id }, select: { name: true } });
    await this.createNotification.execute({
      recipient_id: n.recipient_emp_id,
      kind: 'lead_assigned',
      title: `New lead for you: ${n.company_name}`,
      body: `${by?.name ?? 'A colleague'} made ${n.lead_code} for you.`,
      entity_type: 'LEAD',
      entity_id: n.lead_id,
      created_by: n.assigned_by_emp_id,
    });
  }

  async send(notices: Notice[]): Promise<void> {
    if (notices.length === 0) return;
    await this.createNotification.executeMany(
      notices.map((n) => ({
        recipient_id: n.recipient_emp_id,
        kind: n.kind,
        title: n.title.slice(0, 150),
        body: n.body.slice(0, 300),
        entity_type: n.entity_type,
        entity_id: n.entity_id,
        created_by: n.created_by ?? null,
      })),
    );
  }

  async sentSince(recipientEmpId: number, kind: string, since: Date): Promise<boolean> {
    return (await this.prisma.notifications.count({ where: { recipient_id: recipientEmpId, kind, created_at: { gte: since } } })) > 0;
  }
}
