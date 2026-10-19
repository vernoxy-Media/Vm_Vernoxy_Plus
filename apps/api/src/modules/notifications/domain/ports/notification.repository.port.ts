import { NotificationEntity } from '../entities/notification.entity';

export interface CreateNotificationInput {
  recipient_id: number;
  kind: string;
  title: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  created_by?: number | null;
}

export interface NotificationRepositoryPort {
  findForRecipient(
    recipientId: number,
    limit?: number,
    offset?: number,
    unreadOnly?: boolean,
  ): Promise<NotificationEntity[]>;
  countUnread(recipientId: number): Promise<number>;
  markRead(notificationId: number, recipientId: number): Promise<boolean>;
  markAllRead(recipientId: number): Promise<number>;
  create(input: CreateNotificationInput): Promise<NotificationEntity>;
  createMany(inputs: CreateNotificationInput[]): Promise<number>;
}
