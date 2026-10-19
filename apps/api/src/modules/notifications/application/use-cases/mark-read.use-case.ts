import { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';

export class MarkReadUseCase {
  constructor(private readonly notificationRepo: NotificationRepositoryPort) {}

  async execute(notificationId: number, recipientId: number): Promise<boolean> {
    return this.notificationRepo.markRead(notificationId, recipientId);
  }
}
