export const CALENDAR_NOTIFIER = Symbol('CALENDAR_NOTIFIER');

export interface MeetingReminderNotice {
  recipient_emp_id: number;
  event_id: number;
  title: string;
  kind: 'before' | 'start';
  meeting_link: string | null;
}

export interface EventInviteNotice {
  recipient_emp_ids: number[];
  event_id: number;
  title: string;
  event_type: string;
  organizer_name: string;
  starts_at: Date;
  created_by: number;
}

/** Puts a reminder or an invitation in the person's notification bell. */
export interface CalendarNotifierPort {
  meetingReminder(notice: MeetingReminderNotice): Promise<void>;
  eventInvite(notice: EventInviteNotice): Promise<void>;
}
