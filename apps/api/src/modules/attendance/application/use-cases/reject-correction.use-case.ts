import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import {
  CorrectionNotFoundError,
  AttendanceDomainError,
} from '../../domain/errors/attendance.errors';
import { AttendanceCorrectionEntity } from '../../domain/entities/attendance-correction.entity';

export class RejectCorrectionUseCase {
  constructor(private readonly attendanceRepo: AttendanceRepository) {}

  async execute(
    correctionId: number,
    adminId: number,
    rejectionReason: string,
  ): Promise<AttendanceCorrectionEntity> {
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

    return this.attendanceRepo.rejectCorrection(correctionId, adminId, rejectionReason);
  }
}
