export interface AttendanceApprovalHistoryItem {
  approvalId: number;
  correctionId: number;
  level: number;
  levelName: string;
  approverId?: number | null;
  approverName?: string | null;
  action: 'pending' | 'approved' | 'rejected' | 'cancelled';
  comment?: string | null;
  actionDate?: Date | string | null;
  createdAt: Date;
  createdBy?: number | null;
  updatedAt?: Date | null;
  updatedBy?: number | null;
  deletedAt?: Date | null;
  deletedBy?: number | null;
}

export interface AttendanceCorrectionEntity {
  correctionId: number;
  requestId: string;
  empId: number;
  attendanceId?: number | null;
  workDate: string;
  requestType: string;
  currentCheckInAt?: Date | null;
  currentCheckOutAt?: Date | null;
  requestedCheckInAt?: Date | null;
  requestedCheckOutAt?: Date | null;
  requestedBreakMinutes: number;
  reason: string;
  remarks?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decidedAt?: Date | null;
  decidedBy?: number | null;
  rejectionReason?: string | null;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  approvals?: AttendanceApprovalHistoryItem[];
  createdAt: Date;
  createdBy?: number | null;
  updatedAt?: Date | null;
  updatedBy?: number | null;
  deletedAt?: Date | null;
  deletedBy?: number | null;
}
