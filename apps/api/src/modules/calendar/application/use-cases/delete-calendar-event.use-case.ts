import {
  CalendarEventNotFoundError,
  CalendarPermissionDeniedError,
} from '../../domain/errors/calendar.errors';
import { CalendarRepositoryPort } from '../../domain/ports/calendar.repository.port';

export class DeleteCalendarEventUseCase {
  constructor(private readonly calendarRepo: CalendarRepositoryPort) {}

  async execute(eventId: number, actorId: number, isAdmin: boolean): Promise<void> {
    const existing = await this.calendarRepo.getEventById(eventId);
    if (!existing) {
      throw new CalendarEventNotFoundError(eventId);
    }

    if (!isAdmin && existing.organizer_id !== actorId) {
      throw new CalendarPermissionDeniedError('Only the event organizer or an admin can delete this event');
    }

    await this.calendarRepo.deleteEvent(eventId, actorId);
  }
}
