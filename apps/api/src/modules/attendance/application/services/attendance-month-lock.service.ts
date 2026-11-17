import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface MonthLockStatus {
  year: number;
  month: number;
  is_locked: boolean;
  locked_at: Date | null;
  locked_by_name: string | null;
  lock_mode: string | null;
  unlocked_at: Date | null;
  unlock_reason: string | null;
}

/**
 * Attendance month lock. Salary & Payroll BFD: payroll can be calculated while a month
 * is open but can only be locked once that month's attendance is locked. Once locked,
 * attendance of the month cannot change (late corrections become payroll day adjustments).
 */
@Injectable()
export class AttendanceMonthLockService {
  constructor(private readonly prisma: PrismaService) {}

  async status(year: number, month: number): Promise<MonthLockStatus> {
    const [row] = await this.prisma.$queryRaw<any[]>`
      SELECT l.lock_year, l.lock_month, l.is_locked, l.lock_mode, l.locked_at, l.unlocked_at, l.unlock_reason, e.name AS locked_by_name
      FROM attendance_month_locks l LEFT JOIN employees e ON e.emp_id = l.locked_by
      WHERE l.lock_year = ${year} AND l.lock_month = ${month};
    `;
    return {
      year,
      month,
      is_locked: Boolean(row?.is_locked),
      locked_at: row?.is_locked ? row.locked_at : null,
      locked_by_name: row?.is_locked ? row.locked_by_name : null,
      lock_mode: row?.lock_mode ?? null,
      unlocked_at: row?.unlocked_at ?? null,
      unlock_reason: row?.unlock_reason ?? null,
    };
  }

  async listYear(year: number): Promise<MonthLockStatus[]> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT l.lock_month, l.is_locked, l.lock_mode, l.locked_at, l.unlocked_at, l.unlock_reason, e.name AS locked_by_name
      FROM attendance_month_locks l LEFT JOIN employees e ON e.emp_id = l.locked_by
      WHERE l.lock_year = ${year};
    `;
    return Array.from({ length: 12 }, (_, i) => {
      const r = rows.find((x) => Number(x.lock_month) === i + 1);
      return {
        year,
        month: i + 1,
        is_locked: Boolean(r?.is_locked),
        locked_at: r?.is_locked ? r.locked_at : null,
        locked_by_name: r?.is_locked ? r.locked_by_name : null,
        lock_mode: r?.lock_mode ?? null,
        unlocked_at: r?.unlocked_at ?? null,
        unlock_reason: r?.unlock_reason ?? null,
      };
    });
  }

  async lock(year: number, month: number, adminId: number | null, mode: 'MANUAL' | 'AUTO' = 'MANUAL') {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    if (lastDay >= today) throw new BadRequestException(`${MONTHS[month - 1]} ${year} has not ended yet. A month can be locked after its last day.`);
    await this.prisma.$executeRaw`
      INSERT INTO attendance_month_locks (lock_year, lock_month, is_locked, lock_mode, locked_at, locked_by, updated_at)
      VALUES (${year}, ${month}, true, ${mode}, clock_timestamp(), ${adminId}::int, clock_timestamp())
      ON CONFLICT (lock_year, lock_month) DO UPDATE SET
        is_locked = true, lock_mode = EXCLUDED.lock_mode, locked_at = clock_timestamp(), locked_by = EXCLUDED.locked_by, updated_at = clock_timestamp();
    `;
    return this.status(year, month);
  }

  async unlock(year: number, month: number, adminId: number, reason: string) {
    const r = (reason || '').trim();
    if (r.length < 10 || r.length > 250) throw new BadRequestException('Please write at least 10 characters.');
    const [run] = await this.prisma.$queryRaw<any[]>`
      SELECT status FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};
    `;
    if (run && (run.status === 'LOCKED' || run.status === 'PAID')) {
      throw new ConflictException(`Payroll for ${MONTHS[month - 1]} ${year} is ${String(run.status).toLowerCase()}. Unlock the payroll first.`);
    }
    await this.prisma.$executeRaw`
      UPDATE attendance_month_locks SET is_locked = false, unlocked_at = clock_timestamp(), unlocked_by = ${adminId},
        unlock_reason = ${r}, updated_at = clock_timestamp()
      WHERE lock_year = ${year} AND lock_month = ${month};
    `;
    return this.status(year, month);
  }

  /** Throws when the date falls in a locked month. */
  async assertOpen(date: string | Date | null | undefined) {
    if (!date) return;
    const ymd = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
    const year = Number(ymd.slice(0, 4));
    const month = Number(ymd.slice(5, 7));
    if (!year || !month) return;
    const s = await this.status(year, month);
    if (s.is_locked) {
      throw new ConflictException(
        `${MONTHS[month - 1]} ${year} attendance is locked. Ask Accounts to pay this day differently in Payroll (day adjustment).`,
      );
    }
  }

  async assertCorrectionOpen(correctionId: number) {
    const [row] = await this.prisma.$queryRaw<any[]>`SELECT work_date FROM attendance_corrections WHERE correction_id = ${correctionId};`;
    if (row?.work_date) await this.assertOpen(row.work_date);
  }
}
