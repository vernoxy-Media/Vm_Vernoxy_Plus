import { CalendarEventEntity } from '../../domain/entities/calendar-event.entity';
import {
  CalendarEventNotFoundError,
  CalendarPermissionDeniedError,
  InvalidEventTimeError,
} from '../../domain/errors/calendar.errors';
import { CalendarRepositoryPort } from '../../domain/ports/calendar.repository.port';

export interface UpdateCalendarEventUseCaseInput {
  event_id: number;
  actor_id: number;
  is_admin: boolean;
  title?: string;
  description?: string | null;
  start_time?: string;
  end_time?: string;
  is_all_day?: boolean;
  location?: string | null;
  meeting_link?: string | null;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  attendee_ids?: number[];
}

export class UpdateCalendarEventUseCase {
  constructor(private readonly calendarRepo: CalendarRepositoryPort) {}

  async execute(input: UpdateCalendarEventUseCaseInput): Promise<CalendarEventEntity> {
    const existing = await this.calendarRepo.getEventById(input.event_id);
    if (!existing) {
      throw new CalendarEventNotFoundError(input.event_id);
    }

    if (!input.is_admin && existing.organizer_id !== input.actor_id) {
      throw new CalendarPermissionDeniedError('Only the event organizer or an admin can modify this event');
    }

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (input.start_time) {
      startDate = new Date(input.start_time);
      if (isNaN(startDate.getTime())) {
        throw new InvalidEventTimeError('Invalid start date format');
      }
    }

    if (input.end_time) {
      endDate = new Date(input.end_time);
      if (isNaN(endDate.getTime())) {
        throw new InvalidEventTimeError('Invalid end date format');
      }
    }

    const effectiveStart = startDate ?? new Date(existing.start_time);
    const effectiveEnd = endDate ?? new Date(existing.end_time);

    if (effectiveEnd <= effectiveStart) {
      throw new InvalidEventTimeError('Event end time must be after start time');
    }

    return this.calendarRepo.updateEvent({
      event_id: input.event_id,
      actor_id: input.actor_id,
      title: input.title?.trim(),
      description: input.description !== undefined ? (input.description?.trim() ?? null) : undefined,
      start_time: startDate,
      end_time: endDate,
      is_all_day: input.is_all_day,
      location: input.location !== undefined ? (input.location?.trim() ?? null) : undefined,
      meeting_link: input.meeting_link !== undefined ? (input.meeting_link?.trim() ?? null) : undefined,
      status: input.status,
      attendee_ids: input.attendee_ids,
    });
  }
}
