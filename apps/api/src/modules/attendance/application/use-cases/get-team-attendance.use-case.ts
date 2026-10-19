import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';

export class GetTeamAttendanceUseCase {
  constructor(private readonly attendanceRepo: AttendanceRepository) {}

  async execute(query: { date?: string; month?: string; depId?: number }): Promise<any[]> {
    return this.attendanceRepo.getTeamAttendance(query);
  }
}
