import { AttendanceDayEntity } from '../entities/attendance-day.entity';
import { AttendanceBreakEntity } from '../entities/attendance-break.entity';
import { AttendanceCorrectionEntity } from '../entities/attendance-correction.entity';

export interface AttendanceRepository {
  findDayByEmpAndDate(empId: number, workDate: string): Promise<AttendanceDayEntity | null>;
  findDaysByEmpAndMonth(empId: number, yearMonth: string): Promise<AttendanceDayEntity[]>;
  createAttendanceDay(data: Omit<AttendanceDayEntity, 'attendanceId' | 'createdAt'>): Promise<AttendanceDayEntity>;
  closeAttendanceDayWithBreak(
    attendanceId: number,
    checkOutAt: Date,
    breakMinutes: number,
    productionMinutes: number,
    dayStatus: 'present' | 'half_day' | 'short' | 'incomplete' | 'absent',
  ): Promise<AttendanceDayEntity>;
  findOpenBreak(attendanceId: number): Promise<AttendanceBreakEntity | null>;
  findBreaksByAttendanceId(attendanceId: number): Promise<AttendanceBreakEntity[]>;
  findBreaksByAttendanceIds(attendanceIds: number[]): Promise<AttendanceBreakEntity[]>;
  createBreak(
    attendanceId: number,
    startedAt: Date,
    breakType?: string | null,
    reason?: string | null,
  ): Promise<AttendanceBreakEntity>;
  closeBreak(breakId: number, endedAt: Date): Promise<AttendanceBreakEntity>;
  createCorrection(data: Omit<AttendanceCorrectionEntity, 'correctionId' | 'createdAt'>): Promise<AttendanceCorrectionEntity>;
  findCorrectionById(correctionId: number): Promise<AttendanceCorrectionEntity | null>;
  findCorrectionByEmpAndDate(empId: number, workDate: string): Promise<AttendanceCorrectionEntity | null>;
  listRegularizations(params: {
    empId?: number;
    status?: string;
    tab?: string;
    departmentId?: number;
    requestType?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    isManagerOrAdmin?: boolean;
    viewerEmpId?: number;
  }): Promise<AttendanceCorrectionEntity[]>;
  createRegularization(data: {
    empId: number;
    workDate: string;
    requestType: string;
    currentCheckInAt?: Date | null;
    currentCheckOutAt?: Date | null;
    requestedCheckInAt?: Date | null;
    requestedCheckOutAt?: Date | null;
    reason: string;
    remarks: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    createdBy: number;
  }): Promise<AttendanceCorrectionEntity>;
  cancelRegularization(correctionId: number, empId: number): Promise<AttendanceCorrectionEntity>;
  approveRegularization(
    correctionId: number,
    approverId: number,
    comment?: string,
  ): Promise<AttendanceCorrectionEntity>;
  rejectRegularization(
    correctionId: number,
    approverId: number,
    comment: string,
  ): Promise<AttendanceCorrectionEntity>;
  bulkApproveRegularizations(
    correctionIds: number[],
    approverId: number,
  ): Promise<{ successCount: number; failedCount: number }>;
  approveCorrection(
    correctionId: number,
    decidedBy: number,
    dayData: {
      empId: number;
      workDate: string;
      checkInAt: Date;
      checkOutAt: Date;
      breakMinutes: number;
      productionMinutes: number;
      dayStatus: 'present' | 'half_day' | 'short' | 'absent';
    },
  ): Promise<AttendanceDayEntity>;
  rejectCorrection(
    correctionId: number,
    decidedBy: number,
    rejectionReason: string,
  ): Promise<AttendanceCorrectionEntity>;
  adminUpsertDay(
    empId: number,
    workDate: string,
    checkInAt: Date,
    checkOutAt: Date,
    breakMinutes: number,
    productionMinutes: number,
    dayStatus: 'present' | 'half_day' | 'short' | 'absent',
    adminId: number,
    note?: string | null,
  ): Promise<AttendanceDayEntity>;
  getEmployeeProfile(empId: number): Promise<{ empId: number; status: string; joiningDate: string; exitDate: string | null } | null>;
  getDashboardMonthData(
    empId: number,
    yearMonth: string,
    weekStartDay: number,
    todayDate: string,
    now: Date,
    options?: {
      workingDays?: number[];
      holidays?: Array<{ date: string; name: string }>;
      fullDayMinutes?: number;
      halfDayMinutes?: number;
      graceMinutes?: number;
    },
  ): Promise<{
    days: Array<{
      date: string;
      state: 'present' | 'half_day' | 'short' | 'incomplete' | 'leave' | 'holiday' | 'weekly_off' | 'absent' | 'upcoming';
      check_in_at: Date | null;
      check_out_at: Date | null;
      production_minutes: number;
      break_minutes: number;
      day_status: string | null;
      leave: { type_name: string; part: string; [key: string]: any } | null;
      holiday_name: string | null;
      flags: Record<string, any>;
      breaks: Array<{ started_at: Date; ended_at: Date | null; break_type?: string | null; reason?: string | null }>;
    }>;
  }>;
  findDayDetail(empId: number, date: string): Promise<{
    date: string;
    state: string;
    events: Array<{
      type: 'punch_in' | 'break_start' | 'break_end' | 'punch_out';
      at: string;
      break_type?: string | null;
      reason?: string | null;
    }>;
    breaks: Array<{ started_at: string; ended_at: string | null; minutes: number }>;
    production_minutes: number;
    break_minutes: number;
    status: string;
    leave: { type_name: string; part: string; [key: string]: any } | null;
    holiday: string | null;
    correction: { id: number; status: string } | null;
    can_request_correction: boolean;
  } | null>;
  getTeamAttendance(query: { date?: string; month?: string; depId?: number }): Promise<any[]>;
  /** Approved / pending leave on a date, read from Leave Management. */
  findLeaveForDate?(empId: number, date: string): Promise<{
    approved: {
      day_part: 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';
      leave_type_name: string;
      request_no: string;
      from_date: string;
      to_date: string;
      approved_by: string | null;
    } | null;
    pending: { request_no: string; leave_type_name: string } | null;
    second_half_starts_at: Date | null;
  }>;
  getAttendanceCsvReport(yearMonth: string): Promise<string>;
  getAttendanceRegister(query: {
    date?: string;
    departmentId?: number;
    shiftId?: number;
    status?: string;
    search?: string;
  }): Promise<any>;
  getAttendanceReports(query: {
    reportType?: string;
    fromDate?: string;
    toDate?: string;
    departmentId?: string;
    employeeId?: number;
    shiftId?: number;
    status?: string;
  }): Promise<any>;
}
