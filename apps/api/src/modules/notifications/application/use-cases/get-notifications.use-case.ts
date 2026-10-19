import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';

export interface GetNotificationsQuery {
  recipientId: number;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export class GetNotificationsUseCase {
  constructor(private readonly notificationRepo: NotificationRepositoryPort) {}

  async execute(query: GetNotificationsQuery): Promise<NotificationEntity[]> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    return this.notificationRepo.findForRecipient(query.recipientId, limit, offset, query.unreadOnly);
  }
}
