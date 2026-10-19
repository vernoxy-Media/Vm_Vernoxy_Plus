export interface AttendanceBreakEntity {
  breakId: number;
  attendanceId: number;
  startedAt: Date;
  endedAt: Date | null;
  createdAt?: Date;
  createdBy?: number | null;
  updatedAt?: Date | null;
  updatedBy?: number | null;
  deletedAt?: Date | null;
  deletedBy?: number | null;
}
