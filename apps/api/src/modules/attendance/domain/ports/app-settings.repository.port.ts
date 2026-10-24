export interface AttendanceHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type?: string;
}

export interface WorkingHoursConfig {
  full_day_hours: number; // e.g. 8
  half_day_hours: number; // e.g. 4
  start_time?: string; // e.g. "09:30"
  end_time?: string; // e.g. "18:30"
}

export interface AttendanceShiftDto {
  shift_id: number;
  shift_code: string;
  shift_name: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  full_day_hours: number;
  half_day_hours: number;
  break_duration_minutes: number;
  break_type: string;
  late_arrival_grace_minutes: number;
  early_exit_grace_minutes: number;
  weekly_off_days: number[];
  is_default: boolean;
  is_active: boolean;
}

export interface AttendanceStatusDto {
  status_id: number;
  code: string;
  label: string;
  short_code: string;
  color: string;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
}

export interface AttendanceSettingsDto {
  working_days: number[]; // e.g. [1, 2, 3, 4, 5, 6] (1=Mon..6=Sat, 0=Sun)
  holidays: AttendanceHoliday[];
  default_working_hours: WorkingHoursConfig;
  employee_working_hours: Record<string, WorkingHoursConfig>;
  shifts: AttendanceShiftDto[];
  statuses: AttendanceStatusDto[];
  default_shift: AttendanceShiftDto | null;
  employee_shifts: Record<string, number>;
}

export interface AppSettingsRepository {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string, userId?: number): Promise<void>;
  getWeekStartDay(): Promise<number>; // default 1
  getAttendanceSettings(): Promise<AttendanceSettingsDto>;
  saveWorkingDays(days: number[], userId?: number): Promise<void>;
  addHoliday(holiday: Omit<AttendanceHoliday, 'id'>, userId?: number): Promise<AttendanceHoliday>;
  deleteHoliday(id: string, userId?: number): Promise<void>;
  saveDefaultWorkingHours(config: WorkingHoursConfig, userId?: number): Promise<void>;
  saveEmployeeWorkingHours(empId: number, config: WorkingHoursConfig | null, userId?: number): Promise<void>;
  getEmployeeWorkingMinutes(empId: number): Promise<{
    fullDayMinutes: number;
    halfDayMinutes: number;
    fullDayHours: number;
    halfDayHours: number;
  }>;
  // Shift Management
  getShifts(): Promise<AttendanceShiftDto[]>;
  createShift(shift: Partial<AttendanceShiftDto>, userId?: number): Promise<AttendanceShiftDto>;
  updateShift(id: number, shift: Partial<AttendanceShiftDto>, userId?: number): Promise<AttendanceShiftDto>;
  setDefaultShift(id: number, userId?: number): Promise<AttendanceShiftDto>;
  deleteShift(id: number, userId?: number): Promise<void>;
  // Status Management
  getStatuses(): Promise<AttendanceStatusDto[]>;
  createStatus(status: Partial<AttendanceStatusDto>, userId?: number): Promise<AttendanceStatusDto>;
  updateStatus(id: number, status: Partial<AttendanceStatusDto>, userId?: number): Promise<AttendanceStatusDto>;
  deleteStatus(id: number, userId?: number): Promise<void>;
  // Employee Shift Assignment
  assignEmployeeShift(empId: number, shiftId: number | null, userId?: number): Promise<void>;
  getEmployeeShiftAssignments(): Promise<Record<string, number>>;
}

