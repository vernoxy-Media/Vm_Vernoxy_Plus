export type CalendarEventType = 'meeting' | 'task_block' | 'appointment' | 'reminder';
export type CalendarEventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type CalendarRsvpStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

export interface CalendarAttendeeEntity {
  attendee_id: number;
  event_id: number;
  employee_id: number;
  name: string;
  email: string;
  profile_picture_url: string | null;
  response_status: CalendarRsvpStatus;
  is_optional: boolean;
  responded_at: string | null;
}

export interface CalendarEventEntity {
  event_id: number;
  event_type: CalendarEventType;
  title: string;
  description: string | null;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  is_all_day: boolean;
  location: string | null;
  meeting_link: string | null;
  status: CalendarEventStatus;
  task_id: number | null;
  task_code?: string | null;
  task_stage?: string | null;
  organizer_id: number;
  organizer_name: string;
  attendees: CalendarAttendeeEntity[];
  created_at: string;
  row_version: number;
}

export interface UnscheduledTaskEntity {
  task_id: number;
  task_code: string;
  title: string;
  priority: string;
  stage: string;
  allocated_minutes: number | null;
  due_date: string | null;
}
