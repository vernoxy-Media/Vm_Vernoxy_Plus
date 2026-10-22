import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { NOTIFICATION_TOKENS } from './domain/ports/tokens';
import { PrismaNotificationRepository } from './infrastructure/repositories/prisma-notification.repository';
import { GetNotificationsUseCase } from './application/use-cases/get-notifications.use-case';
import { GetUnreadCountUseCase } from './application/use-cases/get-unread-count.use-case';
import { MarkReadUseCase } from './application/use-cases/mark-read.use-case';
import { MarkAllReadUseCase } from './application/use-cases/mark-all-read.use-case';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
import { NotificationsController } from './presentation/controllers/notifications.controller';
import { NotificationRepositoryPort } from './domain/ports/notification.repository.port';

import { AuthModule } from '../auth/auth.module';
import { EventsService } from '../websockets/public-api';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: NOTIFICATION_TOKENS.NotificationRepository,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: GetNotificationsUseCase,
      useFactory: (repo: NotificationRepositoryPort) => new GetNotificationsUseCase(repo),
      inject: [NOTIFICATION_TOKENS.NotificationRepository],
    },
    {
      provide: GetUnreadCountUseCase,
      useFactory: (repo: NotificationRepositoryPort) => new GetUnreadCountUseCase(repo),
      inject: [NOTIFICATION_TOKENS.NotificationRepository],
    },
    {
      provide: MarkReadUseCase,
      useFactory: (repo: NotificationRepositoryPort) => new MarkReadUseCase(repo),
      inject: [NOTIFICATION_TOKENS.NotificationRepository],
    },
    {
      provide: MarkAllReadUseCase,
      useFactory: (repo: NotificationRepositoryPort) => new MarkAllReadUseCase(repo),
      inject: [NOTIFICATION_TOKENS.NotificationRepository],
    },
    {
      provide: CreateNotificationUseCase,
      useFactory: (repo: NotificationRepositoryPort, eventsService: EventsService) =>
        new CreateNotificationUseCase(repo, eventsService),
      inject: [NOTIFICATION_TOKENS.NotificationRepository, EventsService],
    },
  ],
  exports: [
    NOTIFICATION_TOKENS.NotificationRepository,
    CreateNotificationUseCase,
  ],
})
export class NotificationsModule {}
