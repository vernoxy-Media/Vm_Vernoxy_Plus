import { CalendarNotifierPort } from '../../domain/ports/calendar-notifier.port';
import { CalendarRepositoryPort } from '../../domain/ports/calendar.repository.port';

export interface MeetingReminderResult {
  /** True only for the first request: this person has not been reminded yet. */
  created: boolean;
  title?: string;
  start_time?: string;
  meeting_link?: string | null;
}

/** Called by the person's own open app when a meeting is about to start (or just has). */
export class SendMeetingReminderUseCase {
  constructor(
    private readonly calendarRepo: CalendarRepositoryPort,
    private readonly notifier: CalendarNotifierPort,
  ) {}

  async execute(input: { event_id: number; employee_id: number; kind: 'before' | 'start' }): Promise<MeetingReminderResult> {
    const event = await this.calendarRepo.claimMeetingReminder(input.event_id, input.employee_id, input.kind);
    if (!event) return { created: false };
    try {
      await this.notifier.meetingReminder({
        recipient_emp_id: input.employee_id,
        event_id: input.event_id,
        title: event.title,
        kind: input.kind,
        meeting_link: event.meeting_link,
      });
    } catch {
      /* the on-screen reminder still goes ahead; the bell entry is best effort */
    }
    return { created: true, title: event.title, start_time: event.start_time.toISOString(), meeting_link: event.meeting_link };
  }
}
