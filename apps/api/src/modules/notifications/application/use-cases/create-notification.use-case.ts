import { NotificationEntity } from '../../domain/entities/notification.entity';
import { CreateNotificationInput, NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';

export class CreateNotificationUseCase {
  constructor(private readonly notificationRepo: NotificationRepositoryPort) {}

  async execute(input: CreateNotificationInput): Promise<NotificationEntity> {
    return this.notificationRepo.create(input);
  }

  async executeMany(inputs: CreateNotificationInput[]): Promise<number> {
    if (!inputs.length) return 0;
    return this.notificationRepo.createMany(inputs);
  }
}
