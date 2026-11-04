import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule, CreateNotificationUseCase } from '../notifications/public-api';
import { CALENDAR_TOKENS, CalendarRepositoryPort } from './domain/ports/calendar.repository.port';
import { PrismaCalendarRepository } from './infrastructure/repositories/prisma-calendar.repository';
import { GetCalendarEventsUseCase } from './application/use-cases/get-calendar-events.use-case';
import { CreateCalendarEventUseCase } from './application/use-cases/create-calendar-event.use-case';
import { UpdateCalendarEventUseCase } from './application/use-cases/update-calendar-event.use-case';
import { DeleteCalendarEventUseCase } from './application/use-cases/delete-calendar-event.use-case';
import { RespondRsvpUseCase } from './application/use-cases/respond-rsvp.use-case';
import { GetUnscheduledTasksUseCase } from './application/use-cases/get-unscheduled-tasks.use-case';
import { GetCalendarMonthTasksUseCase } from './application/use-cases/get-calendar-month-tasks.use-case';
import { GetCalendarSummaryUseCase } from './application/use-cases/get-calendar-summary.use-case';
import { GetCalendarHolidaysUseCase } from './application/use-cases/get-calendar-holidays.use-case';
import { CalendarController } from './presentation/controllers/calendar.controller';
import { CALENDAR_NOTIFIER, CalendarNotifierPort } from './domain/ports/calendar-notifier.port';
import { NotificationsCalendarNotifierAdapter } from './infrastructure/adapters/notifications-calendar-notifier.adapter';
import { GetCalendarDueItemsUseCase } from './application/use-cases/get-calendar-due-items.use-case';
import { SendMeetingReminderUseCase } from './application/use-cases/send-meeting-reminder.use-case';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [CalendarController],
  providers: [
    {
      provide: CALENDAR_TOKENS.CalendarRepository,
      useClass: PrismaCalendarRepository,
    },
    {
      provide: GetCalendarEventsUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new GetCalendarEventsUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
    {
      provide: CreateCalendarEventUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new CreateCalendarEventUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
    {
      provide: UpdateCalendarEventUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new UpdateCalendarEventUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
    {
      provide: DeleteCalendarEventUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new DeleteCalendarEventUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
    {
      provide: RespondRsvpUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new RespondRsvpUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
    {
      provide: GetUnscheduledTasksUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new GetUnscheduledTasksUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
    {
      provide: GetCalendarMonthTasksUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new GetCalendarMonthTasksUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
    {
      provide: GetCalendarSummaryUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new GetCalendarSummaryUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
    {
      provide: CALENDAR_NOTIFIER,
      useFactory: (create: CreateNotificationUseCase) => new NotificationsCalendarNotifierAdapter(create),
      inject: [CreateNotificationUseCase],
    },
    {
      provide: GetCalendarDueItemsUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new GetCalendarDueItemsUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
    {
      provide: SendMeetingReminderUseCase,
      useFactory: (repo: CalendarRepositoryPort, notifier: CalendarNotifierPort) => new SendMeetingReminderUseCase(repo, notifier),
      inject: [CALENDAR_TOKENS.CalendarRepository, CALENDAR_NOTIFIER],
    },
    {
      provide: GetCalendarHolidaysUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new GetCalendarHolidaysUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
  ],
  // CalendarRepository is exported for the Sales module, which mirrors follow-ups as Calendar events.
  exports: [GetCalendarEventsUseCase, CreateCalendarEventUseCase, CALENDAR_TOKENS.CalendarRepository],
})
export class CalendarModule {}
