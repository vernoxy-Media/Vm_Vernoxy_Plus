import { NotificationEntity } from '../../domain/entities/notification.entity';
import { CreateNotificationInput, NotificationRepositoryPort } from '../../domain/ports/notification.repository.port';
import { EventsService } from '../../../websockets/public-api';
import { notificationLink } from '../../../push/public-api';

/** What the notifications need from the desktop-notification service (the push module). */
export interface DesktopNotifier {
  notify(empIds: number[], payload: { title: string; body: string; url: string; tag?: string }): Promise<void>;
}

export class CreateNotificationUseCase {
  constructor(
    private readonly notificationRepo: NotificationRepositoryPort,
    private readonly eventsService?: EventsService,
    private readonly desktop?: DesktopNotifier,
  ) {}

  /** The same notification on the person's desktop, for when the app is not open. Best effort. */
  private pushToDesktop(
    recipientId: number,
    n: { kind: string; title: string; body?: string | null; entity_type?: string | null; entity_id?: number | null },
  ): void {
    if (!this.desktop) return;
    void this.desktop
      .notify([recipientId], { title: n.title, body: n.body ?? '', url: notificationLink(n.kind, n.entity_id, n.entity_type), tag: `${n.kind}-${n.entity_id ?? ''}` })
      .catch(() => undefined);
  }

  async execute(input: CreateNotificationInput): Promise<NotificationEntity> {
    const created = await this.notificationRepo.create(input);
    if (this.eventsService) {
      this.eventsService.emitToUser(created.recipient_id, 'notification:received', created);
    }
    this.pushToDesktop(created.recipient_id, created);
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
    for (const inp of inputs) this.pushToDesktop(inp.recipient_id, inp);
    return count;
  }
}

