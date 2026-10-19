export interface AttendanceCorrectionEntity {
  correctionId: number;
  empId: number;
  attendanceId?: number | null;
  workDate: string;
  requestedCheckInAt: Date;
  requestedCheckOutAt: Date;
  requestedBreakMinutes: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: Date | null;
  decidedBy?: number | null;
  rejectionReason?: string | null;
  createdAt: Date;
  createdBy?: number | null;
  updatedAt?: Date | null;
  updatedBy?: number | null;
  deletedAt?: Date | null;
  deletedBy?: number | null;
}
