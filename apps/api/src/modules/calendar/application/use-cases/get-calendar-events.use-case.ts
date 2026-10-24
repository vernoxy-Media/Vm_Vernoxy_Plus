import { CalendarEventEntity, CalendarEventType } from '../../domain/entities/calendar-event.entity';
import { CalendarRepositoryPort } from '../../domain/ports/calendar.repository.port';

export interface GetCalendarEventsInput {
  start_time: string;
  end_time: string;
  employee_id: number;
  is_admin?: boolean;
  employee_ids?: number[];
  event_type?: CalendarEventType;
}

export class GetCalendarEventsUseCase {
  constructor(private readonly calendarRepo: CalendarRepositoryPort) {}

  async execute(input: GetCalendarEventsInput): Promise<CalendarEventEntity[]> {
    return this.calendarRepo.getEvents({
      start_time: input.start_time,
      end_time: input.end_time,
      employee_id: input.employee_id,
      is_admin: input.is_admin,
      employee_ids: input.employee_ids,
      event_type: input.event_type,
    });
  }
}
