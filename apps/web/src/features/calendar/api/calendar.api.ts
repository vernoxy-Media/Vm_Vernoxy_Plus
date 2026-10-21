import { customFetch } from '@vernoxy-pulse/api-client';
import type {
  CalendarEvent,
  CalendarHolidayItem,
  CalendarMonthTaskItem,
  CalendarMonthTasksParams,
  CalendarSummaryParams,
  CalendarSummaryResult,
  CreateCalendarEventPayload,
  UnscheduledTask,
  UpdateCalendarEventPayload,
} from '../types';

const BASE_URL = '/api/v1/calendar';

export async function fetchCalendarEvents(start: string, end: string): Promise<CalendarEvent[]> {
  try {
    return await customFetch<CalendarEvent[]>(
      `${BASE_URL}/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    );
  } catch (err) {
    console.warn('Failed to fetch calendar events from API:', err);
    return [];
  }
}

export async function createCalendarEvent(payload: CreateCalendarEventPayload): Promise<CalendarEvent> {
  return customFetch<CalendarEvent>(`${BASE_URL}/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateCalendarEvent(
  id: number,
  payload: UpdateCalendarEventPayload
): Promise<CalendarEvent> {
  return customFetch<CalendarEvent>(`${BASE_URL}/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function deleteCalendarEvent(id: number): Promise<void> {
  return customFetch<void>(`${BASE_URL}/events/${id}`, {
    method: 'DELETE',
  });
}

export async function respondCalendarRsvp(
  id: number,
  responseStatus: 'accepted' | 'declined' | 'tentative'
): Promise<void> {
  return customFetch<void>(`${BASE_URL}/events/${id}/rsvp`, {
    method: 'POST',
    body: JSON.stringify({ response_status: responseStatus }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function fetchUnscheduledTasks(): Promise<UnscheduledTask[]> {
  try {
    return await customFetch<UnscheduledTask[]>(`${BASE_URL}/unscheduled-tasks`);
  } catch {
    return [];
  }
}

export interface AssignableEmployee {
  emp_id: number;
  name: string;
  email: string;
  profile_picture_url: string | null;
}

export async function fetchAssignableEmployees(): Promise<AssignableEmployee[]> {
  try {
    return await customFetch<AssignableEmployee[]>('/api/v1/admin/tasks/assignable-employees');
  } catch {
    return [];
  }
}

export async function fetchCalendarMonthTasks(params: CalendarMonthTasksParams): Promise<CalendarMonthTaskItem[]> {
  try {
    const query = new URLSearchParams();
    query.set('start', params.start);
    query.set('end', params.end);
    if (params.employee_ids && params.employee_ids.length > 0) {
      query.set('employee_ids', params.employee_ids.join(','));
    }
    if (params.project_id) query.set('project_id', String(params.project_id));
    if (params.stage) query.set('stage', params.stage);
    if (params.task_type_id) query.set('task_type_id', String(params.task_type_id));
    if (params.priority) query.set('priority', params.priority);

    return await customFetch<CalendarMonthTaskItem[]>(`${BASE_URL}/month-tasks?${query.toString()}`);
  } catch (err) {
    console.warn('Failed to fetch calendar month tasks:', err);
    return [];
  }
}

export async function fetchCalendarSummary(params: CalendarSummaryParams): Promise<CalendarSummaryResult> {
  try {
    const query = new URLSearchParams();
    query.set('month', params.month);
    if (params.employee_ids && params.employee_ids.length > 0) {
      query.set('employee_ids', params.employee_ids.join(','));
    }
    if (params.project_id) query.set('project_id', String(params.project_id));

    return await customFetch<CalendarSummaryResult>(`${BASE_URL}/summary?${query.toString()}`);
  } catch (err) {
    console.warn('Failed to fetch calendar summary:', err);
    return { tasks_done: 0, tasks_submitted: 0, tasks_approved: 0, total_allocated_minutes: 0 };
  }
}

export async function fetchCalendarHolidays(start: string, end: string): Promise<CalendarHolidayItem[]> {
  try {
    return await customFetch<CalendarHolidayItem[]>(
      `${BASE_URL}/holidays?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    );
  } catch (err) {
    console.warn('Failed to fetch calendar holidays:', err);
    return [];
  }
}

