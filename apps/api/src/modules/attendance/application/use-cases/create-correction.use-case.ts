import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import {
  BreakExceedsSessionError,
  AttendanceDomainError,
} from '../../domain/errors/attendance.errors';
import { AttendanceCorrectionEntity } from '../../domain/entities/attendance-correction.entity';

export interface CreateCorrectionCommand {
  empId: number;
  workDate: string;
  requestedCheckInAt: Date;
  requestedCheckOutAt: Date;
  requestedBreakMinutes: number;
  reason: string;
}

export class CreateCorrectionUseCase {
  constructor(private readonly attendanceRepo: AttendanceRepository) {}

  async execute(cmd: CreateCorrectionCommand): Promise<AttendanceCorrectionEntity> {
    if (cmd.requestedCheckOutAt < cmd.requestedCheckInAt) {
      throw new AttendanceDomainError(
        'INVALID_SESSION_RANGE',
        'Check-out cannot be earlier than check-in',
        422,
      );
    }

    if (cmd.requestedBreakMinutes < 0) {
      throw new AttendanceDomainError(
        'INVALID_BREAK_MINUTES',
        'Break minutes cannot be negative',
        422,
      );
    }

    const sessionSeconds = Math.floor(
      (cmd.requestedCheckOutAt.getTime() - cmd.requestedCheckInAt.getTime()) / 1000,
    );
    const sessionMinutes = Math.floor(sessionSeconds / 60);

    if (cmd.requestedBreakMinutes > sessionMinutes) {
      throw new BreakExceedsSessionError(
        `Requested break minutes (${cmd.requestedBreakMinutes}) exceed session duration (${sessionMinutes} min)`,
      );
    }

    if (!cmd.reason || cmd.reason.trim().length === 0) {
      throw new AttendanceDomainError('BLANK_REASON', 'Reason cannot be blank', 422);
    }

    const existingDay = await this.attendanceRepo.findDayByEmpAndDate(cmd.empId, cmd.workDate);

    return this.attendanceRepo.createCorrection({
      requestId: '',
      requestType: 'Incorrect Time',
      empId: cmd.empId,
      attendanceId: existingDay ? existingDay.attendanceId : null,
      workDate: cmd.workDate,
      requestedCheckInAt: cmd.requestedCheckInAt,
      requestedCheckOutAt: cmd.requestedCheckOutAt,
      requestedBreakMinutes: cmd.requestedBreakMinutes,
      reason: cmd.reason.trim(),
      status: 'pending',
      createdBy: cmd.empId,
      updatedAt: null,
      updatedBy: null,
      deletedAt: null,
      deletedBy: null,
    });
  }
}
