import { Inject, Injectable } from '@nestjs/common';
import { CALENDAR_TOKENS, CalendarRepositoryPort } from '../../../calendar/public-api';
import { CalendarFollowUpEvent, SalesCalendarPort } from '../../application/ports/sales-calendar.port';

const EVENT_LENGTH_MS = 30 * 60 * 1000;

/** Mirrors a follow-up as a Calendar appointment of the Assigned to user, through the Calendar module's public repository. */
@Injectable()
export class CalendarSalesCalendarAdapter implements SalesCalendarPort {
  constructor(@Inject(CALENDAR_TOKENS.CalendarRepository) private readonly calendar: CalendarRepositoryPort) {}

  async create(e: CalendarFollowUpEvent): Promise<number> {
    const created = await this.calendar.createEvent({
      event_type: 'appointment',
      title: e.title.slice(0, 200),
      description: e.description,
      start_time: e.start,
      end_time: new Date(e.start.getTime() + EVENT_LENGTH_MS),
      organizer_id: e.organizer_emp_id,
    });
    return created.event_id;
  }

  async update(eventId: number, e: CalendarFollowUpEvent, actorEmpId: number): Promise<void> {
    await this.calendar.updateEvent({
      event_id: eventId,
      actor_id: actorEmpId,
      title: e.title.slice(0, 200),
      description: e.description,
      start_time: e.start,
      end_time: new Date(e.start.getTime() + EVENT_LENGTH_MS),
    });
  }

  async remove(eventId: number, actorEmpId: number): Promise<void> {
    await this.calendar.deleteEvent(eventId, actorEmpId);
  }
}
