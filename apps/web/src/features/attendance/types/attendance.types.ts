export type AttendanceState = 'not_started' | 'working' | 'on_break' | 'done';

export type SpecialStatus = 'on_leave' | 'holiday' | 'weekly_off' | null;

export type DayAttendanceStatus =
  | 'present'
  | 'half_day'
  | 'short_hours'
  | 'incomplete'
  | 'leave'
  | 'holiday'
  | 'weekly_off'
  | 'absent';

export interface TimelineEvent {
  id: string;
  type: 'punch_in' | 'break_start' | 'break_end' | 'punch_out';
  timestamp: string; // ISO string
  display_time: string; // e.g. "10:00 AM"
  label: string; // e.g. "Punch In at 10:00 AM"
}

export interface TodayAttendanceData {
  date: string; // "YYYY-MM-DD"
  company_timezone: string; // e.g. "Asia/Kolkata"
  state: AttendanceState;
  special_status: SpecialStatus;
  special_status_reason?: string | null;
  punched_in_at: string | null; // ISO
  punched_out_at: string | null; // ISO
  worked_seconds: number;
  break_seconds: number;
  target_seconds: number; // default 28800 (8h)
  active_break_start: string | null; // ISO
  server_now: string; // ISO
  timeline: TimelineEvent[];
}

export interface AttendanceStatistics {
  today: {
    worked_hours: number;
    target_hours: number;
  };
  this_week: {
    worked_hours: number;
    target_hours: number;
  };
  this_month: {
    worked_hours: number;
    target_hours: number;
  };
  remaining: {
    worked_hours: number;
    target_hours: number;
  };
  overtime_hours?: number;
}

export interface MonthSummary {
  scheduled_days: number;
  present_days: number;
  total_working_seconds: number;
  total_break_seconds: number;
  leave_days: number;
  absent_days: number;
  remaining_days: number;
}

export interface DayRecord {
  date: string; // "YYYY-MM-DD"
  day_of_week: string; // "Mon", "Tue"
  punch_in: string | null; // "10:00 AM"
  punch_out: string | null; // "07:00 PM"
  production_seconds: number;
  break_seconds: number;
  status: DayAttendanceStatus;
  status_label: string;
  holiday_name?: string | null;
  leave_type?: string | null;
  can_request_correction: boolean;
  is_today?: boolean;
}

export interface AttendanceDashboardResponse {
  today: TodayAttendanceData;
  statistics: AttendanceStatistics;
  month_summary: MonthSummary;
  records: DayRecord[];
}

export interface DayDetailBreak {
  start: string;
  end: string | null;
  duration_seconds: number;
}

export interface DayDetailResponse {
  date: string;
  status: DayAttendanceStatus;
  status_label: string;
  punched_in_at: string | null;
  punched_out_at: string | null;
  production_seconds: number;
  break_seconds: number;
  timeline: TimelineEvent[];
  breaks: DayDetailBreak[];
  leave_holiday_info?: string | null;
  can_request_correction: boolean;
}

export interface CorrectionRequestPayload {
  date: string;
  punch_in: string; // "HH:MM"
  punch_out: string; // "HH:MM"
  break_minutes: number;
  reason: string;
}

export type WeekStartDay = 'sunday' | 'monday';

export interface AttendanceHoliday {
  id: string;
  date: string;
  name: string;
  type?: string;
}

export interface WorkingHoursConfig {
  full_day_hours: number;
  half_day_hours: number;
}

export interface AttendanceSettingsResponse {
  working_days: number[];
  holidays: AttendanceHoliday[];
  default_working_hours: WorkingHoursConfig;
  employee_working_hours: Record<string, WorkingHoursConfig>;
}
