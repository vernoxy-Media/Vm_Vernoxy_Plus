import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import {
  CorrectionNotFoundError,
  AttendanceDomainError,
} from '../../domain/errors/attendance.errors';
import { determineDayStatus } from '../../domain/services/attendance-calculations';
import { AttendanceDayEntity } from '../../domain/entities/attendance-day.entity';

export class ApproveCorrectionUseCase {
  constructor(private readonly attendanceRepo: AttendanceRepository) {}

  async execute(correctionId: number, adminId: number): Promise<AttendanceDayEntity> {
    const correction = await this.attendanceRepo.findCorrectionById(correctionId);
    if (!correction) {
      throw new CorrectionNotFoundError(`Correction ${correctionId} not found`);
    }

    if (correction.status !== 'pending') {
      throw new AttendanceDomainError(
        'CORRECTION_ALREADY_DECIDED',
        `Correction is already ${correction.status}`,
        409,
      );
    }

    const checkInAt = correction.requestedCheckInAt || correction.currentCheckInAt || new Date(`${correction.workDate}T09:30:00.000Z`);
    const checkOutAt = correction.requestedCheckOutAt || correction.currentCheckOutAt || new Date(`${correction.workDate}T18:30:00.000Z`);

    const sessionSeconds = Math.max(
      0,
      Math.floor(
        (checkOutAt.getTime() - checkInAt.getTime()) / 1000,
      ),
    );
    const breakSeconds = (correction.requestedBreakMinutes || 0) * 60;
    const workSeconds = Math.max(0, sessionSeconds - breakSeconds);
    const productionMinutes = Math.floor(workSeconds / 60);

    const dayStatus = determineDayStatus(
      checkOutAt,
      productionMinutes,
    );

    return this.attendanceRepo.approveCorrection(correctionId, adminId, {
      empId: correction.empId,
      workDate: correction.workDate,
      checkInAt,
      checkOutAt,
      breakMinutes: correction.requestedBreakMinutes || 0,
      productionMinutes,
      dayStatus: dayStatus === 'incomplete' ? 'short' : dayStatus,
    });
  }
}
