export interface AttendanceHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type?: string;
}

export interface WorkingHoursConfig {
  full_day_hours: number; // e.g. 8
  half_day_hours: number; // e.g. 4
}

export interface AttendanceSettingsDto {
  working_days: number[]; // e.g. [1, 2, 3, 4, 5, 6] (1=Mon..6=Sat, 0=Sun)
  holidays: AttendanceHoliday[];
  default_working_hours: WorkingHoursConfig;
  employee_working_hours: Record<string, WorkingHoursConfig>;
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
}
