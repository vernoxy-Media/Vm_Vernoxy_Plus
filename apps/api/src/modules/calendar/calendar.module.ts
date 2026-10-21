import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
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

@Module({
  imports: [PrismaModule, AuthModule],
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
      provide: GetCalendarHolidaysUseCase,
      useFactory: (repo: CalendarRepositoryPort) => new GetCalendarHolidaysUseCase(repo),
      inject: [CALENDAR_TOKENS.CalendarRepository],
    },
  ],
  exports: [GetCalendarEventsUseCase, CreateCalendarEventUseCase],
})
export class CalendarModule {}
