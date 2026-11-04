import { CalendarEventEntity } from '../../domain/entities/calendar-event.entity';
import {
  CalendarEventNotFoundError,
  CalendarPermissionDeniedError,
  CalendarConflictError,
  InvalidEventTimeError,
  InvalidMeetingLinkError,
} from '../../domain/errors/calendar.errors';
import { normaliseMeetLink } from '../../domain/meeting-link';
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

    // Only when the time, the guests or the all-day flag change: a title edit never fails on an old overlap.
    const reschedules = input.start_time !== undefined || input.end_time !== undefined || input.attendee_ids !== undefined || input.is_all_day !== undefined;
    const isTimedMeeting = existing.event_type === 'meeting' && !(input.is_all_day ?? existing.is_all_day);
    if (reschedules && isTimedMeeting && (input.status ?? existing.status) !== 'cancelled') {
      const guests = input.attendee_ids ?? existing.attendees.map((a) => a.employee_id);
      const conflicts = await this.calendarRepo.findMeetingConflicts({
        employee_ids: [existing.organizer_id, ...guests],
        start: effectiveStart,
        end: effectiveEnd,
        exclude_event_id: input.event_id,
      });
      if (conflicts.length > 0) throw new CalendarConflictError(conflicts);
    }

    let meetingLink: string | null | undefined;
    if (input.meeting_link !== undefined) {
      const rawLink = input.meeting_link?.trim();
      meetingLink = rawLink ? normaliseMeetLink(rawLink) : null;
      if (rawLink && !meetingLink) throw new InvalidMeetingLinkError();
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
      meeting_link: meetingLink,
      status: input.status,
      attendee_ids: input.attendee_ids,
    });
  }
}
