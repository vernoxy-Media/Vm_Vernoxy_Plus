export interface AttendanceDayEntity {
  attendanceId: number;
  empId: number;
  workDate: string; // YYYY-MM-DD
  checkInAt: Date;
  checkOutAt: Date | null;
  breakMinutes: number;
  productionMinutes: number;
  dayStatus: 'present' | 'half_day' | 'short' | 'incomplete' | 'leave' | 'absent' | 'holiday' | 'weekly_off';
  source: 'web' | 'correction' | 'admin';
  workedOnNonWorkingDay: boolean;
  /** Set while an approved leave covers this day (leaveHalf is null for a full-day leave) */
  leaveRequestId?: number | null;
  leaveHalf?: 'FIRST_HALF' | 'SECOND_HALF' | null;
  note?: string | null;
  createdAt: Date;
  createdBy?: number | null;
  updatedAt?: Date | null;
  updatedBy?: number | null;
  deletedAt?: Date | null;
  deletedBy?: number | null;
}
