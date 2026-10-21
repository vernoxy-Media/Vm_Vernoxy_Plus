import { CalendarRsvpStatus } from '../../domain/entities/calendar-event.entity';
import { CalendarEventNotFoundError } from '../../domain/errors/calendar.errors';
import { CalendarRepositoryPort } from '../../domain/ports/calendar.repository.port';

export interface RespondRsvpUseCaseInput {
  event_id: number;
  employee_id: number;
  response_status: CalendarRsvpStatus;
}

export class RespondRsvpUseCase {
  constructor(private readonly calendarRepo: CalendarRepositoryPort) {}

  async execute(input: RespondRsvpUseCaseInput): Promise<void> {
    const existing = await this.calendarRepo.getEventById(input.event_id);
    if (!existing) {
      throw new CalendarEventNotFoundError(input.event_id);
    }

    await this.calendarRepo.respondRsvp({
      event_id: input.event_id,
      employee_id: input.employee_id,
      response_status: input.response_status,
    });
  }
}
