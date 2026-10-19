import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import {
  CreateNotificationInput,
  NotificationRepositoryPort,
} from '../../domain/ports/notification.repository.port';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findForRecipient(
    recipientId: number,
    limit = 20,
    offset = 0,
    unreadOnly = false,
  ): Promise<NotificationEntity[]> {
    const where: any = {
      recipient_id: recipientId,
      deleted_at: null,
    };
    if (unreadOnly) {
      where.read_at = null;
    }

    const rows = await this.prisma.notifications.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    return rows.map((r) => ({
      notification_id: r.notification_id,
      recipient_id: r.recipient_id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      read_at: r.read_at,
      created_at: r.created_at,
      created_by: r.created_by,
    }));
  }

  async countUnread(recipientId: number): Promise<number> {
    return this.prisma.notifications.count({
      where: {
        recipient_id: recipientId,
        read_at: null,
        deleted_at: null,
      },
    });
  }

  async markRead(notificationId: number, recipientId: number): Promise<boolean> {
    const res = await this.prisma.notifications.updateMany({
      where: {
        notification_id: notificationId,
        recipient_id: recipientId,
        read_at: null,
        deleted_at: null,
      },
      data: {
        read_at: new Date(),
        updated_at: new Date(),
        updated_by: recipientId,
      },
    });
    return res.count > 0;
  }

  async markAllRead(recipientId: number): Promise<number> {
    const res = await this.prisma.notifications.updateMany({
      where: {
        recipient_id: recipientId,
        read_at: null,
        deleted_at: null,
      },
      data: {
        read_at: new Date(),
        updated_at: new Date(),
        updated_by: recipientId,
      },
    });
    return res.count;
  }

  async create(input: CreateNotificationInput): Promise<NotificationEntity> {
    const row = await this.prisma.notifications.create({
      data: {
        recipient_id: input.recipient_id,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        entity_type: input.entity_type ?? null,
        entity_id: input.entity_id ?? null,
        created_by: input.created_by ?? null,
      },
    });

    return {
      notification_id: row.notification_id,
      recipient_id: row.recipient_id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      read_at: row.read_at,
      created_at: row.created_at,
      created_by: row.created_by,
    };
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<number> {
    if (!inputs.length) return 0;
    const res = await this.prisma.notifications.createMany({
      data: inputs.map((i) => ({
        recipient_id: i.recipient_id,
        kind: i.kind,
        title: i.title,
        body: i.body ?? null,
        entity_type: i.entity_type ?? null,
        entity_id: i.entity_id ?? null,
        created_by: i.created_by ?? null,
      })),
    });
    return res.count;
  }
}
