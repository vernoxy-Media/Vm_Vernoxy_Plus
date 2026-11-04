import { CalendarEventEntity, CalendarEventType } from '../../domain/entities/calendar-event.entity';
import { CalendarConflictError, InvalidEventTimeError, InvalidMeetingLinkError } from '../../domain/errors/calendar.errors';
import { normaliseMeetLink } from '../../domain/meeting-link';
import { CalendarRepositoryPort } from '../../domain/ports/calendar.repository.port';

export interface CreateCalendarEventUseCaseInput {
  event_type: CalendarEventType;
  title: string;
  description?: string | null;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  is_all_day?: boolean;
  location?: string | null;
  meeting_link?: string | null;
  task_id?: number | null;
  organizer_id: number;
  attendee_ids?: number[];
}

export class CreateCalendarEventUseCase {
  constructor(private readonly calendarRepo: CalendarRepositoryPort) {}

  async execute(input: CreateCalendarEventUseCaseInput): Promise<CalendarEventEntity> {
    const startDate = new Date(input.start_time);
    const endDate = new Date(input.end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new InvalidEventTimeError('Invalid start or end date format');
    }

    if (endDate <= startDate) {
      throw new InvalidEventTimeError('Event end time must be after start time');
    }

    const rawLink = input.meeting_link?.trim();
    const meetingLink = rawLink ? normaliseMeetLink(rawLink) : null;
    if (rawLink && !meetingLink) throw new InvalidMeetingLinkError();

    // One person cannot be in two timed meetings at once.
    if (input.event_type === 'meeting' && !input.is_all_day) {
      const conflicts = await this.calendarRepo.findMeetingConflicts({
        employee_ids: [input.organizer_id, ...(input.attendee_ids ?? [])],
        start: startDate,
        end: endDate,
      });
      if (conflicts.length > 0) throw new CalendarConflictError(conflicts);
    }

    return this.calendarRepo.createEvent({
      event_type: input.event_type,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      start_time: startDate,
      end_time: endDate,
      is_all_day: input.is_all_day ?? false,
      location: input.location?.trim() ?? null,
      meeting_link: meetingLink,
      task_id: input.task_id ?? null,
      organizer_id: input.organizer_id,
      attendee_ids: input.attendee_ids ?? [],
    });
  }
}
