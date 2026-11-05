export type AttendanceStatusKey =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'on_leave'
  | 'missing_punch';

export interface AttendanceStatusOption {
  key: AttendanceStatusKey;
  label: string;
  color: string;
}

export const ALL_ATTENDANCE_STATUSES: AttendanceStatusOption[] = [
  { key: 'present', label: 'Present', color: '#10b981' }, // emerald
  { key: 'absent', label: 'Absent', color: '#ef4444' }, // red
  { key: 'half_day', label: 'Half Day', color: '#f59e0b' }, // amber
  { key: 'on_leave', label: 'On Leave', color: '#3b82f6' }, // blue
  { key: 'missing_punch', label: 'Missing Punch', color: '#8b5cf6' }, // purple
];

export type RegularizationStatusKey =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface AttendanceAnalyticsFilters {
  dateRangePreset: 'current_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  department: string; // 'All' or department name
  designation: string; // 'All' or designation name
  employeeId: string; // 'All' or emp_id string
  search: string;
}

export interface BreakRecord {
  startedAt: string; // ISO string
  endedAt: string | null;
  durationMinutes: number;
  breakType?: string;
  reason?: string;
}

export interface EnrichedAttendanceRecord {
  attendanceId: number;
  empId: number;
  empCode: string;
  employeeName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  workDate: string; // YYYY-MM-DD
  checkInTime: string | null; // e.g. "09:00"
  checkOutTime: string | null; // e.g. "18:00"
  checkInAtIso?: string | null;
  checkOutAtIso?: string | null;
  breakMinutes: number;
  productionMinutes: number; // net working minutes
  dayStatus: AttendanceStatusKey;
  isLate: boolean;
  lateMinutes: number;
  isEarlyExit: boolean;
  earlyExitMinutes: number;
  isWeeklyOffOrHoliday: boolean;
  dayType: 'regular' | 'weekly_off' | 'holiday';
  isRegularized: boolean;
  regularizationId?: number | null;
  regularizationStatus?: RegularizationStatusKey | null;
  shiftStartTime: string; // e.g. "09:00"
  shiftEndTime: string; // e.g. "18:00"
  assignedDailyHours: number; // e.g. 8
  assignedBreakMinutes: number; // e.g. 60
  breaks: BreakRecord[];
}

export interface RegularizationRequestRecord {
  requestId: string; // e.g. "REG-0001"
  correctionId: number;
  empId: number;
  employeeName: string;
  department: string;
  designation: string;
  workDate: string;
  status: RegularizationStatusKey;
  requestType: string;
  reason: string;
  createdAt: string;
  decidedAt?: string | null;
}

// Data structures for the 11 User Stories

// US02
export interface AttendanceStatusCountItem {
  key: AttendanceStatusKey;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

// US03
export interface MonthlyAttendanceSummaryItem {
  monthKey: string; // e.g. "2026-08"
  monthLabel: string; // e.g. "Aug 2026"
  presentCount: number;
  absentCount: number;
  halfDayCount: number;
  onLeaveCount: number;
  lateMarkCount: number; // Shown separately as metric/line
  totalRecords: number;
}

// US04
export interface EmployeeLateMarkRankItem {
  rank: number;
  empId: number;
  empCode: string;
  employeeName: string;
  department: string;
  designation: string;
  totalLateMarks: number;
  lastLateMarkDate: string; // DD-MM-YYYY
}

// US05
export interface DailyWorkingHoursItem {
  date: string; // YYYY-MM-DD
  dateLabel: string; // e.g. "01 Oct"
  dayOfWeek: string; // e.g. "Wed"
  totalWorkingHours: number; // sum in hours
  employeeCount: number;
  averageWorkingHours: number;
}

// US06
export interface RegularizationStatusSummary {
  pendingCount: number;
  pendingPercentage: number;
  approvedCount: number;
  approvedPercentage: number;
  rejectedCount: number;
  rejectedPercentage: number;
  cancelledCount: number;
  cancelledPercentage: number;
  totalRequests: number;
}

// US07
export interface WeeklyOffHolidayWorkingSummary {
  distinctEmployeeCount: number;
  totalDaysWorked: number;
  employees: Array<{
    empId: number;
    employeeName: string;
    department: string;
    daysWorked: number;
  }>;
}

// US08
export interface RegularizedAttendanceSummary {
  regularizedCount: number;
  notRegularizedCount: number;
  totalRecords: number;
  regularizationPercentage: number;
}

// US09
export interface EmployeeEarlyExitRankItem {
  rank: number;
  empId: number;
  empCode: string;
  employeeName: string;
  department: string;
  designation: string;
  totalEarlyExits: number;
  lastEarlyExitDate: string; // DD-MM-YYYY
}

// US10
export interface HeatmapDayCell {
  date: string; // YYYY-MM-DD
  dayName: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  formattedHours: string; // "HH:MM" or "--"
  netMinutes: number;
  intensityRange: '<4h' | '4-6h' | '6-8h' | '8-10h' | '>10h' | 'off' | 'empty';
  checkInTime: string | null;
  checkOutTime: string | null;
  breakDurationMinutes: number;
  isNonWorkingDay: boolean;
  hasRecord: boolean;
}

export interface EmployeeWeeklyHeatmapRow {
  empId: number;
  empCode: string;
  employeeName: string;
  department: string;
  designation: string;
  days: HeatmapDayCell[];
  weeklyTotalMinutes: number;
  weeklyTotalFormatted: string; // "HH:MM"
}

export interface WeeklyHeatmapSummary {
  weekLabel: string;
  totalEmployees: number;
  overallWorkingMinutes: number;
  overallWorkingFormatted: string;
  averageWorkingMinutesPerEmployee: number;
  averageWorkingFormatted: string;
  rows: EmployeeWeeklyHeatmapRow[];
}

// US11
export interface DailyBreakTrendItem {
  date: string; // YYYY-MM-DD
  dateLabel: string; // e.g. "28 Oct"
  totalEmployeesWithBreaks: number;
  totalBreakMinutes: number;
  averageBreakMinutes: number;
  averageBreakFormatted: string; // "HH:MM"
  assignedLimitMinutes: number;
  isExceeded: boolean;
}
