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

    const sessionSeconds = Math.max(
      0,
      Math.floor(
        (correction.requestedCheckOutAt.getTime() - correction.requestedCheckInAt.getTime()) / 1000,
      ),
    );
    const breakSeconds = correction.requestedBreakMinutes * 60;
    const workSeconds = Math.max(0, sessionSeconds - breakSeconds);
    const productionMinutes = Math.floor(workSeconds / 60);

    const dayStatus = determineDayStatus(
      correction.requestedCheckOutAt,
      productionMinutes,
    );

    return this.attendanceRepo.approveCorrection(correctionId, adminId, {
      empId: correction.empId,
      workDate: correction.workDate,
      checkInAt: correction.requestedCheckInAt,
      checkOutAt: correction.requestedCheckOutAt,
      breakMinutes: correction.requestedBreakMinutes,
      productionMinutes,
      dayStatus: dayStatus === 'incomplete' ? 'short' : dayStatus,
    });
  }
}
