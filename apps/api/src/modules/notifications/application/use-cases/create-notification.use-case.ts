import { NotificationEntity } from '../../domain/entities/notification.entity';
import { CreateNotificationInput, NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import { EventsService } from '../../../websockets/public-api';

export class CreateNotificationUseCase {
  constructor(
    private readonly notificationRepo: NotificationRepositoryPort,
    private readonly eventsService?: EventsService,
  ) {}

  async execute(input: CreateNotificationInput): Promise<NotificationEntity> {
    const created = await this.notificationRepo.create(input);
    if (this.eventsService) {
      this.eventsService.emitToUser(created.recipient_id, 'notification:received', created);
    }
    return created;
  }

  async executeMany(inputs: CreateNotificationInput[]): Promise<number> {
    if (!inputs.length) return 0;
    const count = await this.notificationRepo.createMany(inputs);
    if (this.eventsService) {
      for (const inp of inputs) {
        this.eventsService.emitToUser(inp.recipient_id, 'notification:received', {
          recipient_id: inp.recipient_id,
          kind: inp.kind,
          title: inp.title,
          body: inp.body,
          entity_type: inp.entity_type,
          entity_id: inp.entity_id,
          created_at: new Date().toISOString(),
        });
      }
    }
    return count;
  }
}

