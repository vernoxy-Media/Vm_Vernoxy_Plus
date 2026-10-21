export type CalendarEventType = 'meeting' | 'task_block' | 'appointment' | 'reminder';
export type CalendarEventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type CalendarRsvpStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

export interface CalendarAttendee {
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

export interface CalendarEvent {
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
  attendees: CalendarAttendee[];
  created_at: string;
  row_version: number;
}

export interface UnscheduledTask {
  task_id: number;
  task_code: string;
  title: string;
  priority: string;
  stage: string;
  allocated_minutes: number | null;
  due_date: string | null;
}

export interface CreateCalendarEventPayload {
  event_type: CalendarEventType;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  location?: string;
  meeting_link?: string;
  task_id?: number | null;
  attendee_ids?: number[];
}

export interface UpdateCalendarEventPayload {
  event_type?: CalendarEventType;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  is_all_day?: boolean;
  location?: string;
  meeting_link?: string;
  status?: CalendarEventStatus;
  task_id?: number | null;
  attendee_ids?: number[];
}

export interface CalendarMonthTaskItem {
  task_id: number;
  task_code: string;
  title: string;
  stage: 'requested' | 'completed';
  priority: string;
  allocated_minutes: number | null;
  actual_minutes: number;
  task_type_id: number | null;
  task_type_name: string | null;
  project_id: number | null;
  project_name: string;
  submission_date: string; // YYYY-MM-DD
  assignees: Array<{ emp_id: number; name: string; avatar: string | null }>;
  submitted_by: { emp_id: number; name: string } | null;
}

export interface CalendarSummaryResult {
  tasks_done: number;
  tasks_submitted: number;
  tasks_approved: number;
  total_allocated_minutes: number;
}

export interface CalendarHolidayItem {
  holiday_id: number;
  holiday_date: string;
  name: string;
  type: string;
}

export interface CalendarMonthTasksParams {
  start: string;
  end: string;
  employee_ids?: number[];
  project_id?: number;
  stage?: 'requested' | 'completed' | 'all';
  task_type_id?: number;
  priority?: string;
}

export interface CalendarSummaryParams {
  month: string;
  employee_ids?: number[];
  project_id?: number;
}

