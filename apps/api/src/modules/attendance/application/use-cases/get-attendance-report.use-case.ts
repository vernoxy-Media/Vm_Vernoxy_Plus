import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';

export class GetAttendanceReportUseCase {
  constructor(private readonly attendanceRepo: AttendanceRepository) {}

  async execute(yearMonth: string): Promise<string> {
    return this.attendanceRepo.getAttendanceCsvReport(yearMonth);
  }
}
