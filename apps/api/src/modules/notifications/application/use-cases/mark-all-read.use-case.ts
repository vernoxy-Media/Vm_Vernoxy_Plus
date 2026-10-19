import { NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';

export class MarkAllReadUseCase {
  constructor(private readonly notificationRepo: NotificationRepositoryPort) {}

  async execute(recipientId: number): Promise<number> {
    return this.notificationRepo.markAllRead(recipientId);
  }
}
