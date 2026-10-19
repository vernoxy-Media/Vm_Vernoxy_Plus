import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import {
  BreakExceedsSessionError,
  AttendanceDomainError,
} from '../../domain/errors/attendance.errors';
import { determineDayStatus } from '../../domain/services/attendance-calculations';
import { AttendanceDayEntity } from '../../domain/entities/attendance-day.entity';

export interface AdminUpsertDayCommand {
  empId: number;
  workDate: string;
  checkInAt: Date;
  checkOutAt: Date;
  breakMinutes: number;
  adminId: number;
  note?: string | null;
}

export class AdminUpsertDayUseCase {
  constructor(private readonly attendanceRepo: AttendanceRepository) {}

  async execute(cmd: AdminUpsertDayCommand): Promise<AttendanceDayEntity> {
    if (cmd.checkOutAt < cmd.checkInAt) {
      throw new AttendanceDomainError(
        'INVALID_SESSION_RANGE',
        'Check-out cannot be earlier than check-in',
        422,
      );
    }

    if (cmd.breakMinutes < 0) {
      throw new AttendanceDomainError(
        'INVALID_BREAK_MINUTES',
        'Break minutes cannot be negative',
        422,
      );
    }

    const sessionSeconds = Math.max(
      0,
      Math.floor((cmd.checkOutAt.getTime() - cmd.checkInAt.getTime()) / 1000),
    );
    const sessionMinutes = Math.floor(sessionSeconds / 60);

    if (cmd.breakMinutes > sessionMinutes) {
      throw new BreakExceedsSessionError(
        `Break minutes (${cmd.breakMinutes}) exceed session duration (${sessionMinutes} min)`,
      );
    }

    const workSeconds = Math.max(0, sessionSeconds - cmd.breakMinutes * 60);
    const productionMinutes = Math.floor(workSeconds / 60);

    const dayStatus = determineDayStatus(cmd.checkOutAt, productionMinutes);

    return this.attendanceRepo.adminUpsertDay(
      cmd.empId,
      cmd.workDate,
      cmd.checkInAt,
      cmd.checkOutAt,
      cmd.breakMinutes,
      productionMinutes,
      dayStatus === 'incomplete' ? 'short' : dayStatus,
      cmd.adminId,
      cmd.note,
    );
  }
}
