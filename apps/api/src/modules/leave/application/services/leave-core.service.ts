import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  dayOfWeek,
  eachDate,
  fmtDate,
  fmtDayMonth,
  fmtDayShort,
  leaveYearOf,
  leaveYearRange,
  leaveYearStartMonth,
  monthName,
  num,
  pad2,
  toDateStr,
  todayStr,
} from '../../domain/leave-dates';

export type Db = PrismaService | Prisma.TransactionClient;
export type Duration = 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';

export interface LeaveSettings {
  setting_id: number;
  leave_year_start: 'JANUARY_TO_DECEMBER' | 'APRIL_TO_MARCH';
  count_sandwich_leave: boolean;
  pending_reminder_hours: number;
  approve_after_leave_started: boolean;
  year_end_processing: 'AUTOMATIC' | 'MANUAL';
  comp_off_hours_per_day: number;
  start_month: number;
}

export interface LeaveEmployee {
  emp_id: number;
  name: string;
  emp_code: string;
  email: string | null;
  status: string;
  joining_date: string;
  probation_end_date: string | null;
  termination_date: string | null;
  leave_policy_id: number | null;
  policy_name: string | null;
  dep_id: number | null;
  department_name: string | null;
  reporting_manager: number | null;
  reporting_manager_name: string | null;
  gender: string | null;
  is_admin: boolean;
}

export interface LeaveTypeRow {
  leave_type_id: number;
  name: string;
  code: string;
  is_paid: boolean;
  balance_tracked: boolean;
  half_day_allowed: boolean;
  applies_to: 'ALL' | 'FEMALE_ONLY' | 'MALE_ONLY';
  calendar_color: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface PolicyRule {
  rule_id: number;
  policy_id: number;
  leave_type_id: number;
  days_per_year: number | null;
  credit_frequency: 'YEARLY' | 'MONTHLY' | 'FROM_APPROVED_OT';
  carry_forward_days: number;
  max_at_once: number | null;
  min_notice_days: number;
  backdated_days: number;
  attachment_after_days: number | null;
  allowed_during_probation: boolean;
  comp_off_expiry_days: number;
}

export interface DayBreakdownItem {
  date: string;
  day_type: 'WORKING_DAY' | 'WEEKLY_OFF' | 'HOLIDAY';
  day_count: number;
  part: Duration;
  note: string;
}

export interface DayCountResult {
  leave_days: number;
  days: DayBreakdownItem[];
  counted: DayBreakdownItem[];
  excluded_notes: string[];
}

@Injectable()
export class LeaveCoreService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async getSettings(db: Db = this.prisma): Promise<LeaveSettings> {
    const [row] = await db.$queryRaw<any[]>`SELECT * FROM leave_general_settings ORDER BY setting_id ASC LIMIT 1`;
    if (!row) {
      throw new NotFoundException('Leave General settings are missing. Please run the database migrations.');
    }
    return {
      ...row,
      pending_reminder_hours: Number(row.pending_reminder_hours),
      comp_off_hours_per_day: num(row.comp_off_hours_per_day) || 8,
      start_month: leaveYearStartMonth(row.leave_year_start),
    };
  }

  currentLeaveYear(settings: LeaveSettings, today = todayStr()): number {
    return leaveYearOf(today, settings.start_month);
  }

  // ---------------------------------------------------------------------------
  // Employees
  // ---------------------------------------------------------------------------

  async getEmployee(empId: number, db: Db = this.prisma): Promise<LeaveEmployee> {
    const [e] = await db.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, COALESCE(e.office_email, e.email) AS email, e.status::text AS status,
             e.joining_date, e.probation_end_date, e.termination_date, e.leave_policy_id,
             p.name AS policy_name, e.dep_id, d.name AS department_name,
             e.reporting_manager, rm.name AS reporting_manager_name,
             g.code AS gender,
             COALESCE(r.is_admin, false) AS is_admin
      FROM employees e
      LEFT JOIN leave_policies p ON p.policy_id = e.leave_policy_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      LEFT JOIN employees rm ON rm.emp_id = e.reporting_manager
      LEFT JOIN master_lookup g ON g.lookup_id = e.gender_id
      LEFT JOIN roles r ON r.role_id = e.role_id
      WHERE e.emp_id = ${empId} AND e.deleted_at IS NULL
      LIMIT 1;
    `;
    if (!e) throw new NotFoundException('Employee not found.');
    return {
      emp_id: e.emp_id,
      name: e.name,
      emp_code: this.empCode(e.emp_id),
      email: e.email,
      status: e.status,
      joining_date: toDateStr(e.joining_date),
      probation_end_date: e.probation_end_date ? toDateStr(e.probation_end_date) : null,
      termination_date: e.termination_date ? toDateStr(e.termination_date) : null,
      leave_policy_id: e.leave_policy_id,
      policy_name: e.policy_name,
      dep_id: e.dep_id,
      department_name: e.department_name,
      reporting_manager: e.reporting_manager,
      reporting_manager_name: e.reporting_manager_name,
      gender: e.gender ? String(e.gender).toLowerCase() : null,
      is_admin: Boolean(e.is_admin),
    };
  }

  empCode(empId: number): string {
    return `EMP-${String(empId).padStart(4, '0')}`;
  }

  async getAdminIds(db: Db = this.prisma): Promise<number[]> {
    const rows = await db.$queryRaw<any[]>`
      SELECT e.emp_id FROM employees e
      JOIN roles r ON r.role_id = e.role_id
      WHERE r.is_admin = true AND e.status = 'Active' AND e.deleted_at IS NULL
      ORDER BY e.emp_id ASC;
    `;
    return rows.map((r) => r.emp_id);
  }

  async isAdmin(empId: number): Promise<boolean> {
    const ids = await this.getAdminIds();
    return ids.includes(empId);
  }

  async getTeamIds(managerId: number): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id FROM employees
      WHERE (reporting_manager = ${managerId} OR leave_approver_id = ${managerId})
        AND deleted_at IS NULL AND emp_id <> ${managerId};
    `;
    return rows.map((r) => r.emp_id);
  }

  // ---------------------------------------------------------------------------
  // Leave types & rules
  // ---------------------------------------------------------------------------

  async getLeaveType(typeId: number, db: Db = this.prisma): Promise<LeaveTypeRow> {
    const [t] = await db.$queryRaw<any[]>`SELECT * FROM leave_types WHERE leave_type_id = ${typeId} LIMIT 1`;
    if (!t) throw new NotFoundException(`Leave Type with ID ${typeId} not found.`);
    return t;
  }

  async getRule(policyId: number | null, typeId: number, db: Db = this.prisma): Promise<PolicyRule | null> {
    if (!policyId) return null;
    const [r] = await db.$queryRaw<any[]>`
      SELECT * FROM leave_policy_rules WHERE policy_id = ${policyId} AND leave_type_id = ${typeId} LIMIT 1;
    `;
    return r ? this.normaliseRule(r) : null;
  }

  async getPolicyRules(policyId: number, db: Db = this.prisma): Promise<Array<PolicyRule & LeaveTypeRow>> {
    const rows = await db.$queryRaw<any[]>`
      SELECT r.*, t.name, t.code, t.is_paid, t.balance_tracked, t.half_day_allowed, t.applies_to,
             t.calendar_color, t.description, t.status
      FROM leave_policy_rules r
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE r.policy_id = ${policyId}
      ORDER BY r.rule_id ASC;
    `;
    return rows.map((r) => ({ ...r, ...this.normaliseRule(r) }));
  }

  normaliseRule(r: any): PolicyRule {
    return {
      rule_id: r.rule_id,
      policy_id: r.policy_id,
      leave_type_id: r.leave_type_id,
      days_per_year: r.days_per_year === null ? null : num(r.days_per_year),
      credit_frequency: r.credit_frequency,
      carry_forward_days: num(r.carry_forward_days),
      max_at_once: r.max_at_once === null ? null : num(r.max_at_once),
      min_notice_days: Number(r.min_notice_days || 0),
      backdated_days: Number(r.backdated_days || 0),
      attachment_after_days: r.attachment_after_days === null ? null : num(r.attachment_after_days),
      allowed_during_probation: Boolean(r.allowed_during_probation),
      comp_off_expiry_days: Number(r.comp_off_expiry_days || 90),
    };
  }

  appliesToEmployee(type: LeaveTypeRow, emp: LeaveEmployee): boolean {
    if (type.applies_to === 'FEMALE_ONLY') return emp.gender === 'female';
    if (type.applies_to === 'MALE_ONLY') return emp.gender === 'male';
    return true;
  }

  // ---------------------------------------------------------------------------
  // Shift (Weekly Offs) and Holidays
  // ---------------------------------------------------------------------------

  /**
   * Weekly Offs of the employee's shift: the assigned shift (Attendance >
   * Shift Assignment), else the default shift, else the company working days.
   * Returns null when no shift can be resolved.
   */
  async getWeeklyOffDays(empId: number, db: Db = this.prisma): Promise<number[] | null> {
    let shiftId: number | null = null;
    const [assign] = await db.$queryRaw<any[]>`
      SELECT setting_value FROM app_settings WHERE setting_key = 'attendance_employee_shifts' LIMIT 1;
    `;
    if (assign?.setting_value) {
      try {
        const map = JSON.parse(assign.setting_value) || {};
        const v = map[String(empId)];
        if (v !== undefined && v !== null) shiftId = Number(v);
      } catch {
        /* ignore malformed setting */
      }
    }

    let shift: any = null;
    if (shiftId) {
      [shift] = await db.$queryRaw<any[]>`
        SELECT * FROM attendance_shifts WHERE shift_id = ${shiftId} AND deleted_at IS NULL LIMIT 1;
      `;
    }
    if (!shift) {
      [shift] = await db.$queryRaw<any[]>`
        SELECT * FROM attendance_shifts WHERE is_default = true AND deleted_at IS NULL LIMIT 1;
      `;
    }
    if (shift && Array.isArray(shift.weekly_off_days)) {
      return shift.weekly_off_days.map((d: any) => Number(d));
    }

    const [wd] = await db.$queryRaw<any[]>`
      SELECT setting_value FROM app_settings WHERE setting_key = 'attendance_working_days' LIMIT 1;
    `;
    if (wd?.setting_value) {
      try {
        const working: number[] = JSON.parse(wd.setting_value);
        if (Array.isArray(working) && working.length) {
          return [0, 1, 2, 3, 4, 5, 6].filter((d) => !working.includes(d));
        }
      } catch {
        /* ignore */
      }
    }
    return shift ? [0] : null;
  }

  async getHolidays(from: string, to: string, db: Db = this.prisma): Promise<Map<string, string>> {
    const rows = await db.$queryRaw<any[]>`
      SELECT holiday_date, name FROM company_holidays
      WHERE holiday_date >= ${from}::date AND holiday_date <= ${to}::date
        AND deleted_at IS NULL AND COALESCE(is_optional, false) = false;
    `;
    const map = new Map<string, string>();
    for (const h of rows) map.set(toDateStr(h.holiday_date), h.name);
    return map;
  }

  /**
   * Counts Leave Days (BFD Section 5, Part 2). Weekly Offs and Holidays are not
   * counted unless the sandwich setting is on. A half day counts as 0.5.
   */
  async countLeaveDays(
    empId: number,
    from: string,
    to: string,
    duration: Duration,
    settings: LeaveSettings,
    db: Db = this.prisma,
  ): Promise<DayCountResult> {
    const weeklyOffs = await this.getWeeklyOffDays(empId, db);
    if (!weeklyOffs) {
      throw new BadRequestException({
        message: `Your shift for ${fmtDayMonth(from)} is not set. Please contact the Admin.`,
        field: 'from_date',
        code: 'SHIFT_NOT_SET',
      });
    }
    const holidays = await this.getHolidays(from, to, db);
    const days: DayBreakdownItem[] = [];
    const isHalf = duration !== 'FULL_DAY';
    const unit = isHalf ? 0.5 : 1;

    for (const date of eachDate(from, to)) {
      const holiday = holidays.get(date);
      const isWo = weeklyOffs.includes(dayOfWeek(date));
      if (holiday && !settings.count_sandwich_leave) {
        days.push({
          date,
          day_type: 'HOLIDAY',
          day_count: 0,
          part: duration,
          note: `${fmtDayShort(date)} is a Holiday${holiday ? ` (${holiday})` : ''} and is not counted`,
        });
      } else if (isWo && !settings.count_sandwich_leave) {
        days.push({
          date,
          day_type: 'WEEKLY_OFF',
          day_count: 0,
          part: duration,
          note: `${fmtDayShort(date)} is your Weekly Off and is not counted`,
        });
      } else {
        days.push({ date, day_type: 'WORKING_DAY', day_count: unit, part: duration, note: fmtDayShort(date) });
      }
    }
    const counted = days.filter((d) => d.day_count > 0);
    return {
      leave_days: counted.reduce((s, d) => s + d.day_count, 0),
      days,
      counted,
      excluded_notes: days.filter((d) => d.day_count === 0).map((d) => d.note),
    };
  }

  // ---------------------------------------------------------------------------
  // Locks, check-ins, overlaps
  // ---------------------------------------------------------------------------

  /** Returns the month name of the first locked attendance month touching the dates. */
  async findLockedMonth(dates: string[], db: Db = this.prisma): Promise<string | null> {
    if (!dates.length) return null;
    const from = dates[0];
    const to = dates[dates.length - 1];
    const rows = await db.$queryRaw<any[]>`
      SELECT payroll_month, payroll_year, start_date, end_date FROM payroll_runs
      WHERE attendance_locked = true AND start_date <= ${to}::date AND end_date >= ${from}::date
      ORDER BY start_date ASC;
    `;
    for (const r of rows) {
      const s = toDateStr(r.start_date);
      const e = toDateStr(r.end_date);
      if (dates.some((d) => d >= s && d <= e)) return monthName(Number(r.payroll_month));
    }
    return null;
  }

  async findCheckIn(empId: number, dates: string[], db: Db = this.prisma): Promise<string | null> {
    if (!dates.length) return null;
    const rows = await db.$queryRaw<any[]>`
      SELECT work_date FROM attendance_days
      WHERE emp_id = ${empId} AND deleted_at IS NULL
        AND work_date = ANY(${dates}::date[])
        AND COALESCE(day_status, '') <> 'leave'
      ORDER BY work_date ASC LIMIT 1;
    `;
    return rows[0] ? toDateStr(rows[0].work_date) : null;
  }

  /** Overlap with a Pending / Approved leave of the same half or a full day. */
  async findOverlap(
    empId: number,
    days: Array<{ date: string; part: Duration }>,
    excludeRequestId: number | null,
    db: Db = this.prisma,
  ): Promise<{ date: string; request_no: string } | null> {
    if (!days.length) return null;
    const dates = days.map((d) => d.date);
    const rows = await db.$queryRaw<any[]>`
      SELECT d.leave_date, d.day_part, r.request_no, r.request_id
      FROM leave_request_days d
      JOIN leave_requests r ON r.request_id = d.request_id
      WHERE d.emp_id = ${empId}
        AND d.leave_date = ANY(${dates}::date[])
        AND r.status IN ('PENDING', 'APPROVED', 'CANCELLATION_REQUESTED');
    `;
    for (const day of days) {
      for (const r of rows) {
        if (excludeRequestId && r.request_id === excludeRequestId) continue;
        if (toDateStr(r.leave_date) !== day.date) continue;
        if (r.day_part === 'FULL_DAY' || day.part === 'FULL_DAY' || r.day_part === day.part) {
          return { date: day.date, request_no: r.request_no };
        }
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Request number (LV/YYYY/MM/NNNN by month of submission)
  // ---------------------------------------------------------------------------

  async nextRequestNo(db: Db, submittedOn = todayStr()): Promise<string> {
    const key = submittedOn.slice(0, 7);
    // Seed the counter from existing numbers so the first use never collides.
    const prefix = `LV/${key.slice(0, 4)}/${key.slice(5, 7)}/`;
    const [row] = await db.$queryRaw<any[]>`
      INSERT INTO entity_counters (entity_type, counter_key, last_number)
      VALUES (
        'LEAVE_REQUEST', ${key},
        COALESCE((
          SELECT MAX(CAST(split_part(request_no, '/', 4) AS integer))
          FROM leave_requests WHERE request_no LIKE ${prefix + '%'}
        ), 0) + 1
      )
      ON CONFLICT (entity_type, counter_key)
      DO UPDATE SET last_number = GREATEST(
        entity_counters.last_number,
        COALESCE((
          SELECT MAX(CAST(split_part(request_no, '/', 4) AS integer))
          FROM leave_requests WHERE request_no LIKE ${prefix + '%'}
        ), 0)
      ) + 1
      RETURNING last_number;
    `;
    return `${prefix}${String(row.last_number).padStart(4, '0')}`;
  }

  // ---------------------------------------------------------------------------
  // History (activity_logs, entity LEAVE_REQUEST)
  // ---------------------------------------------------------------------------

  async logHistory(
    db: Db,
    requestId: number,
    event: string,
    summary: string,
    performedBy: number | null,
    details: Record<string, any> = {},
  ): Promise<void> {
    await db.$executeRaw`
      INSERT INTO activity_logs (entity_type, entity_id, event, summary, details, performed_by, performed_at)
      VALUES ('LEAVE_REQUEST', ${requestId}, ${event.slice(0, 50)}, ${summary},
              ${JSON.stringify(details)}::jsonb, ${performedBy}, clock_timestamp());
    `;
  }

  async logSettingsChange(
    entityType: 'LEAVE_TYPE' | 'LEAVE_POLICY' | 'GENERAL_SETTINGS',
    entityId: number,
    fieldName: string,
    oldValue: any,
    newValue: any,
    adminId: number,
  ): Promise<void> {
    const ov = oldValue === null || oldValue === undefined ? null : String(oldValue);
    const nv = newValue === null || newValue === undefined ? '' : String(newValue);
    await this.prisma.$executeRaw`
      INSERT INTO settings_change_log (module, entity_type, entity_id, field_name, old_value, new_value, changed_by)
      VALUES ('LEAVE', ${entityType}, ${entityId}, ${fieldName.slice(0, 100)}, ${ov}, ${nv}, ${adminId});
    `;
  }

  /** Logs one row per changed field. */
  async logFieldChanges(
    entityType: 'LEAVE_TYPE' | 'LEAVE_POLICY' | 'GENERAL_SETTINGS',
    entityId: number,
    before: Record<string, any>,
    after: Record<string, any>,
    fields: string[],
    adminId: number,
  ): Promise<number> {
    let count = 0;
    for (const f of fields) {
      const a = before?.[f];
      const b = after?.[f];
      const norm = (v: any) => (v === null || v === undefined ? '' : String(v instanceof Date ? v.toISOString() : v));
      if (norm(a) !== norm(b)) {
        await this.logSettingsChange(entityType, entityId, f, a, b, adminId);
        count++;
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers used in messages
  // ---------------------------------------------------------------------------

  fmtDays(n: number): string {
    return Number(n).toFixed(1);
  }

  fmtDate(s: string): string {
    return fmtDate(s);
  }

  fmtDayMonth(s: string): string {
    return fmtDayMonth(s);
  }

  leaveYearRange(year: number, settings: LeaveSettings) {
    return leaveYearRange(year, settings.start_month);
  }

  monthLabel(dateStr: string): string {
    return monthName(Number(dateStr.slice(5, 7)));
  }

  pad2(n: number) {
    return pad2(n);
  }
}
