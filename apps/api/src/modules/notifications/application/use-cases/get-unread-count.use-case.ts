import { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';

export class GetUnreadCountUseCase {
  constructor(private readonly notificationRepo: NotificationRepositoryPort) {}

  async execute(recipientId: number): Promise<number> {
    return this.notificationRepo.countUnread(recipientId);
  }
}
