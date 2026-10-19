import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';
import { AttendanceNotFoundError } from '../../domain/errors/attendance.errors';

export interface DayDetailDto {
  date: string;
  state: string;
  events: Array<{ type: 'punch_in' | 'break_start' | 'break_end' | 'punch_out'; at: string }>;
  breaks: Array<{ started_at: string; ended_at: string | null; minutes: number }>;
  production_minutes: number;
  break_minutes: number;
  status: string;
  leave: { type_name: string; part: string } | null;
  holiday: string | null;
  correction: { id: number; status: string } | null;
  can_request_correction: boolean;
}

export class GetDayDetailUseCase {
  constructor(private readonly attendanceRepo: AttendanceRepository) {}

  async execute(empId: number, dateStr: string): Promise<DayDetailDto> {
    const detail = await this.attendanceRepo.findDayDetail(empId, dateStr);
    if (!detail) {
      throw new AttendanceNotFoundError(`Attendance day ${dateStr} not found`);
    }
    return detail;
  }
}
