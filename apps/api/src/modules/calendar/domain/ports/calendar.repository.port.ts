import {
  CalendarEventEntity,
  CalendarEventType,
  CalendarRsvpStatus,
  UnscheduledTaskEntity,
} from '../entities/calendar-event.entity';

export const CALENDAR_TOKENS = {
  CalendarRepository: Symbol('CalendarRepository'),
};

export interface CalendarEventsQuery {
  start_time: string; // ISO string
  end_time: string;   // ISO string
  employee_id: number;
  is_admin?: boolean;
  employee_ids?: number[];
  event_type?: CalendarEventType;
}

export interface CalendarDueQuery {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  requesting_emp_id: number;
  is_admin: boolean;
  employee_ids?: number[];
}

/** A task that is due, or a project deadline, on one day. */
export interface CalendarDueItem {
  kind: 'task' | 'project';
  id: number;
  code: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  /** Tasks only */
  priority?: string;
  stage?: string;
  project_name?: string | null;
  /** Projects only */
  status?: string;
}

export interface MeetingConflictQuery {
  employee_ids: number[];
  start: Date;
  end: Date;
  exclude_event_id?: number;
}

export interface CreateCalendarEventRepoInput {
  event_type: CalendarEventType;
  title: string;
  description?: string | null;
  start_time: Date;
  end_time: Date;
  is_all_day?: boolean;
  location?: string | null;
  meeting_link?: string | null;
  task_id?: number | null;
  organizer_id: number;
  attendee_ids?: number[];
}

export interface UpdateCalendarEventRepoInput {
  event_id: number;
  actor_id: number;
  title?: string;
  description?: string | null;
  start_time?: Date;
  end_time?: Date;
  is_all_day?: boolean;
  location?: string | null;
  meeting_link?: string | null;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  attendee_ids?: number[];
}

export interface RespondRsvpRepoInput {
  event_id: number;
  employee_id: number;
  response_status: CalendarRsvpStatus;
}

export interface CalendarMonthTasksQuery {
  start_date: string;
  end_date: string;
  employee_ids?: number[];
  project_id?: number;
  stage?: 'requested' | 'completed' | 'all';
  task_type_id?: number;
  priority?: string;
  is_admin: boolean;
  requesting_emp_id: number;
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

export interface CalendarSummaryQuery {
  month: string; // YYYY-MM
  employee_ids?: number[];
  project_id?: number;
  is_admin: boolean;
  requesting_emp_id: number;
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

export interface CalendarRepositoryPort {
  /** Tasks that are not done yet, on their due date, and project deadlines, for the days asked for. */
  getDueItems(query: CalendarDueQuery): Promise<CalendarDueItem[]>;

  /**
   * Records that this person was reminded about a meeting they are part of. Returns the meeting the first time,
   * and null when it was already recorded or they are not part of it (so the reminder is shown once).
   */
  claimMeetingReminder(
    eventId: number,
    empId: number,
    kind: 'before' | 'start',
  ): Promise<{ title: string; start_time: Date; meeting_link: string | null } | null>;

  /** Timed meetings that overlap [start, end) for any of these people (organizer, or guest who has not declined). */
  findMeetingConflicts(query: MeetingConflictQuery): Promise<import('../errors/calendar.errors').MeetingConflict[]>;

  getEvents(query: CalendarEventsQuery): Promise<CalendarEventEntity[]>;
  getEventById(eventId: number): Promise<CalendarEventEntity | null>;
  createEvent(input: CreateCalendarEventRepoInput): Promise<CalendarEventEntity>;
  updateEvent(input: UpdateCalendarEventRepoInput): Promise<CalendarEventEntity>;
  deleteEvent(eventId: number, actorId: number): Promise<void>;
  respondRsvp(input: RespondRsvpRepoInput): Promise<void>;
  getUnscheduledTasks(employeeId: number): Promise<UnscheduledTaskEntity[]>;
  getMonthTasks(query: CalendarMonthTasksQuery): Promise<CalendarMonthTaskItem[]>;
  getCalendarSummary(query: CalendarSummaryQuery): Promise<CalendarSummaryResult>;
  getHolidays(startDate: string, endDate: string): Promise<CalendarHolidayItem[]>;
}

