export const CALENDAR_NOTIFIER = Symbol('CALENDAR_NOTIFIER');

export interface MeetingReminderNotice {
  recipient_emp_id: number;
  event_id: number;
  title: string;
  kind: 'before' | 'start';
  meeting_link: string | null;
}

/** Puts a reminder in the person's notification bell. */
export interface CalendarNotifierPort {
  meetingReminder(notice: MeetingReminderNotice): Promise<void>;
}
