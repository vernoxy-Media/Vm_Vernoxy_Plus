import { AttendanceRepository } from '../../domain/ports/attendance.repository.port';

/** Converts Leave Management data for a date into today-block params. */
export async function loadLeaveForToday(repo: AttendanceRepository, empId: number, workDate: string) {
  if (!repo.findLeaveForDate) return { leave: null, pendingLeave: null, raw: null };
  const info = await repo.findLeaveForDate(empId, workDate);
  const a = info.approved;
  return {
    raw: info,
    leave: a
      ? {
          typeName: a.leave_type_name,
          part: (a.day_part === 'FULL_DAY' ? 'full' : 'half') as 'full' | 'half',
          half: a.day_part,
          requestNo: a.request_no,
          fromDate: a.from_date,
          toDate: a.to_date,
          approvedBy: a.approved_by,
          secondHalfStartsAt: info.second_half_starts_at,
        }
      : null,
    pendingLeave: !a && info.pending ? { requestNo: info.pending.request_no, typeName: info.pending.leave_type_name } : null,
  };
}
