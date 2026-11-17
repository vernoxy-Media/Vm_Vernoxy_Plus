import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CalcResult, DayInput, OtProposal, calculateSalary, proposeOt, round2, salaryOn } from '../../domain/payroll-rules';

export interface PayrollSettingsRow {
  settings_id: number;
  default_employee_pf_pct: number;
  default_employer_pf_pct: number;
  apply_pf_wage_limit: boolean;
  pf_wage_limit: number;
  missing_punch_default: 'UNPAID' | 'FULL';
  ot_rounding: 'NONE' | 'FIFTEEN' | 'THIRTY';
  total_salary_rounding: 'NEAREST_RUPEE' | 'NONE';
  pay_day: number;
  accounts_emp_ids: number[];
  company_name: string | null;
  company_address: string | null;
}

export interface MonthContext {
  year: number;
  month: number;
  start: string;
  end: string;
  dates: string[];
  settings: PayrollSettingsRow;
  holidays: Map<string, string>;
  shifts: Map<number, { shift_id: number; shift_name: string; full_day_hours: number; weekly_off_days: number[] }>;
  defaultShiftId: number | null;
  employeeShifts: Record<string, number>;
  fullDayHours: number;
  attendanceLocked: boolean;
  attendanceLockedAt: Date | null;
}

export interface PayrollEmployeeRow {
  emp_id: number;
  name: string;
  status: string;
  joining_date: Date | null;
  termination_date: Date | null;
  exit_date: Date | null;
  salary: number;
  role_name: string | null;
  department_name: string | null;
  reporting_manager: number | null;
  pay: any;
}

export interface EmployeeMonthData {
  attendance: Map<string, any>;
  leaves: Map<string, Array<{ part: string; paid: boolean }>>;
  timeline: Array<{ from: string; salary: number }>;
}

export interface EmployeeCalculation {
  emp: PayrollEmployeeRow;
  result: CalcResult;
  proposals: OtProposal[];
  shiftName: string;
  /** Hourly rate (before multiplier) of each day, for OT entries. */
  hourlyRateOf: (date: string) => number;
}

const ymd = (d: Date | string | null | undefined) => (d ? (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)) : null);
export const empCode = (id: number) => `EMP-${String(id).padStart(4, '0')}`;

const SETTINGS_COLUMNS = `settings_id, default_employee_pf_pct, default_employer_pf_pct, apply_pf_wage_limit, pf_wage_limit,
  missing_punch_default, ot_rounding, total_salary_rounding, pay_day, accounts_emp_ids, company_name, company_address`;

@Injectable()
export class PayrollCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  async settings(): Promise<PayrollSettingsRow> {
    let [s] = await this.prisma.$queryRawUnsafe<any[]>(`SELECT ${SETTINGS_COLUMNS} FROM payroll_settings ORDER BY settings_id LIMIT 1`);
    if (!s) {
      await this.prisma.$executeRaw`INSERT INTO payroll_settings DEFAULT VALUES;`;
      [s] = await this.prisma.$queryRawUnsafe<any[]>(`SELECT ${SETTINGS_COLUMNS} FROM payroll_settings ORDER BY settings_id LIMIT 1`);
    }
    return {
      ...s,
      default_employee_pf_pct: Number(s.default_employee_pf_pct),
      default_employer_pf_pct: Number(s.default_employer_pf_pct),
      pf_wage_limit: Number(s.pf_wage_limit),
      accounts_emp_ids: (s.accounts_emp_ids || []).map(Number),
    };
  }

  async readSetting(key: string): Promise<any> {
    const [r] = await this.prisma.$queryRaw<any[]>`
      SELECT setting_value FROM app_settings WHERE lower(setting_key) = lower(${key}) AND deleted_at IS NULL LIMIT 1;
    `;
    if (!r?.setting_value) return null;
    try {
      return JSON.parse(r.setting_value);
    } catch {
      return r.setting_value;
    }
  }

  /** Full Day Hours from Attendance Settings (BFD 5 Part 3: hourly rate for OT). */
  async fullDayHours(): Promise<number> {
    const hours = await this.readSetting('attendance_default_hours');
    if (hours && Number(hours.full_day_hours) > 0) return Number(hours.full_day_hours);
    const [d] = await this.prisma.$queryRaw<any[]>`
      SELECT full_day_hours FROM attendance_shifts WHERE deleted_at IS NULL ORDER BY is_default DESC, shift_id LIMIT 1;
    `;
    return Number(d?.full_day_hours) || 8;
  }

  async context(year: number, month: number): Promise<MonthContext> {
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-${String(days).padStart(2, '0')}`;
    const [settings, holidays, shifts, employeeShifts, fullDayHours, lockRows] = await Promise.all([
      this.settings(),
      this.prisma.$queryRaw<any[]>`
        SELECT holiday_date, name FROM company_holidays
        WHERE deleted_at IS NULL AND holiday_date BETWEEN ${start}::date AND ${end}::date;
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT shift_id, shift_name, full_day_hours, weekly_off_days, is_default, is_active FROM attendance_shifts WHERE deleted_at IS NULL;
      `,
      this.readSetting('attendance_employee_shifts'),
      this.fullDayHours(),
      this.prisma.$queryRaw<any[]>`
        SELECT is_locked, locked_at FROM attendance_month_locks WHERE lock_year = ${year} AND lock_month = ${month};
      `,
    ]);
    const shiftMap = new Map<number, any>();
    for (const s of shifts) {
      shiftMap.set(Number(s.shift_id), {
        shift_id: Number(s.shift_id),
        shift_name: s.shift_name,
        full_day_hours: Number(s.full_day_hours) || 8,
        weekly_off_days: Array.isArray(s.weekly_off_days) ? s.weekly_off_days.map(Number) : [0],
      });
    }
    const def = shifts.find((s) => s.is_default && s.is_active) || shifts.find((s) => s.is_active) || null;
    return {
      year,
      month,
      start,
      end,
      dates: Array.from({ length: days }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
      settings,
      holidays: new Map(holidays.map((h) => [ymd(h.holiday_date)!, h.name])),
      shifts: shiftMap,
      defaultShiftId: def ? Number(def.shift_id) : null,
      employeeShifts: employeeShifts && typeof employeeShifts === 'object' ? employeeShifts : {},
      fullDayHours,
      attendanceLocked: Boolean(lockRows[0]?.is_locked),
      attendanceLockedAt: lockRows[0]?.is_locked ? lockRows[0].locked_at : null,
    };
  }

  /** BFD 4 Part 2 "Who is included in the run". */
  async eligibleEmployees(ctx: MonthContext, empIds?: number[]): Promise<PayrollEmployeeRow[]> {
    const ids = empIds && empIds.length ? empIds : null;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, e.status::text AS status, e.joining_date, e.termination_date, e.exit_date, e.salary,
             e.reporting_manager, r.role_name, d.name AS department_name,
             pp.pf_applicable, pp.uan, pp.employee_pf_pct, pp.employer_pf_pct, pp.ot_eligible, pp.ot_rate_type::text AS ot_rate_type,
             pp.ot_rate, pp.ot_multiplier, pp.minimum_ot_per_day, pp.ot_paid_as::text AS ot_paid_as, pp.payment_mode::text AS payment_mode,
             pp.bank_name, pp.account_number, pp.ifsc_code, (pp.emp_id IS NOT NULL) AS has_policy
      FROM employees e
      LEFT JOIN roles r ON r.role_id = e.role_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      LEFT JOIN employee_pay_policies pp ON pp.emp_id = e.emp_id
      WHERE e.deleted_at IS NULL
        AND e.joining_date IS NOT NULL AND e.joining_date <= ${ctx.end}::date
        AND (
          e.status IN ('Active', 'Onboarding')
          OR (e.status = 'Inactive' AND COALESCE(e.termination_date, e.exit_date) >= ${ctx.start}::date)
        )
        AND (${ids}::int[] IS NULL OR e.emp_id = ANY(${ids}::int[]))
      ORDER BY e.emp_id;
    `;
    return rows.map((r) => ({
      emp_id: Number(r.emp_id),
      name: r.name,
      status: r.status,
      joining_date: r.joining_date,
      termination_date: r.termination_date,
      exit_date: r.exit_date,
      salary: Number(r.salary) || 0,
      role_name: r.role_name,
      department_name: r.department_name,
      reporting_manager: r.reporting_manager ? Number(r.reporting_manager) : null,
      pay: {
        pfApplicable: r.has_policy ? Boolean(r.pf_applicable) : false,
        uan: r.uan || null,
        employeePfPct: r.employee_pf_pct != null ? Number(r.employee_pf_pct) : ctx.settings.default_employee_pf_pct,
        employerPfPct: r.employer_pf_pct != null ? Number(r.employer_pf_pct) : ctx.settings.default_employer_pf_pct,
        otEligible: Boolean(r.ot_eligible),
        otPaidAs: r.ot_paid_as === 'COMP_OFF' ? 'COMP_OFF' : 'SALARY',
        otRateType: r.ot_rate_type === 'FIXED' ? 'FIXED' : 'MULTIPLIER',
        otRate: Number(r.ot_rate) || 0,
        otMultiplier: Number(r.ot_multiplier) || 1,
        minimumOtPerDay: Number(r.minimum_ot_per_day) || 0,
        paymentMode: r.payment_mode || 'BANK_TRANSFER',
        bankName: r.bank_name || null,
        accountNumber: r.account_number || null,
        ifsc: r.ifsc_code || null,
      },
    }));
  }

  /** Attendance, approved leave and salary timeline of the given employees for the month. */
  async monthData(ctx: MonthContext, empIds: number[]): Promise<Map<number, EmployeeMonthData>> {
    const out = new Map<number, EmployeeMonthData>();
    for (const id of empIds) out.set(id, { attendance: new Map(), leaves: new Map(), timeline: [] });
    if (!empIds.length) return out;
    const [att, leaves, timeline] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT emp_id, work_date, check_in_at, check_out_at, break_minutes, production_minutes, day_status, shift_id
        FROM attendance_days
        WHERE emp_id = ANY(${empIds}::int[]) AND deleted_at IS NULL
          AND work_date BETWEEN ${ctx.start}::date AND ${ctx.end}::date;
      `,
      this.prisma
        .$queryRaw<any[]>`
          SELECT d.emp_id, d.leave_date, d.day_part, r.is_paid
          FROM leave_request_days d JOIN leave_requests r ON r.request_id = d.request_id
          WHERE d.emp_id = ANY(${empIds}::int[]) AND d.leave_date BETWEEN ${ctx.start}::date AND ${ctx.end}::date
            AND r.status IN ('APPROVED', 'CANCELLATION_REQUESTED');
        `
        .catch(() => [] as any[]),
      this.prisma.$queryRaw<any[]>`
        SELECT entity_id AS emp_id, (details->>'salary')::numeric AS salary,
               CASE WHEN details->>'effective_date' ~ '^\\d{4}-\\d{2}-\\d{2}' THEN substring(details->>'effective_date', 1, 10)
                    ELSE to_char(performed_at, 'YYYY-MM-DD') END AS from_date
        FROM activity_logs
        WHERE entity_type = 'EMPLOYEE' AND event IN ('HIRED', 'SALARY_REVISION') AND entity_id = ANY(${empIds}::int[])
          AND details->>'salary' ~ '^[0-9.]+$'
        ORDER BY performed_at, log_id;
      `,
    ]);
    for (const a of att) {
      if (String(a.day_status || '') === 'leave') continue; // old placeholder rows are not check-ins
      out.get(Number(a.emp_id))?.attendance.set(ymd(a.work_date)!, a);
    }
    for (const l of leaves) {
      const m = out.get(Number(l.emp_id))?.leaves;
      if (!m) continue;
      const key = ymd(l.leave_date)!;
      const list = m.get(key) || [];
      list.push({ part: l.day_part, paid: Boolean(l.is_paid) });
      m.set(key, list);
    }
    for (const t of timeline) {
      out.get(Number(t.emp_id))?.timeline.push({ from: t.from_date, salary: Number(t.salary) || 0 });
    }
    for (const v of out.values()) v.timeline.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
    return out;
  }

  /** The shift of one employee on one day: attendance record, else assignment, else default. */
  private shiftFor(ctx: MonthContext, empId: number, att: any) {
    const fromDay = att?.shift_id ? ctx.shifts.get(Number(att.shift_id)) : null;
    if (fromDay) return fromDay;
    const assigned = ctx.employeeShifts[String(empId)];
    if (assigned && ctx.shifts.get(Number(assigned))) return ctx.shifts.get(Number(assigned))!;
    return ctx.defaultShiftId ? ctx.shifts.get(ctx.defaultShiftId) || null : null;
  }

  calculate(
    ctx: MonthContext,
    emp: PayrollEmployeeRow,
    data: EmployeeMonthData,
    adjustments: any[],
    otEntries: any[],
  ): EmployeeCalculation {
    const joining = ymd(emp.joining_date);
    const termination = emp.status === 'Inactive' ? ymd(emp.termination_date || emp.exit_date) : ymd(emp.termination_date);
    const inEmployment = (d: string) => (!joining || d >= joining) && (!termination || d <= termination);
    let shiftName = '';
    const days: DayInput[] = ctx.dates.map((date) => {
      const att = data.attendance.get(date) || null;
      const shift = this.shiftFor(ctx, emp.emp_id, att);
      if (shift && inEmployment(date)) shiftName = shift.shift_name;
      const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
      let worked = 0;
      if (att) {
        if (att.production_minutes != null && Number(att.production_minutes) > 0) worked = Number(att.production_minutes);
        else if (att.check_in_at && att.check_out_at) {
          worked = Math.max(0, (new Date(att.check_out_at).getTime() - new Date(att.check_in_at).getTime()) / 60000 - (Number(att.break_minutes) || 0));
        }
      }
      return {
        date,
        weeklyOff: shift ? shift.weekly_off_days.includes(dow) : false,
        holidayName: ctx.holidays.get(date) || null,
        hasShift: Boolean(shift),
        attendance: att
          ? { status: String(att.day_status || ''), checkIn: Boolean(att.check_in_at), checkOut: Boolean(att.check_out_at), workedMinutes: worked }
          : null,
        leaves: data.leaves.get(date) || [],
        monthlySalary: salaryOn(date, data.timeline, emp.salary),
      };
    });

    const active = adjustments.filter((a) => a.is_active);
    const dayAdjustments: Record<string, 'FULL' | 'HALF' | 'UNPAID'> = {};
    for (const a of active) if (a.type === 'DAY_ADJUSTMENT' && a.related_date) dayAdjustments[ymd(a.related_date)!] = a.new_paid_as;
    const amount = (t: string) => round2(active.filter((a) => a.type === t).reduce((s, a) => s + Number(a.amount || 0), 0));

    const result = calculateSalary({
      monthStart: ctx.start,
      monthEnd: ctx.end,
      employeeStatus: emp.status,
      joining,
      termination,
      days,
      pay: emp.pay,
      settings: {
        missingPunch: ctx.settings.missing_punch_default,
        applyPfWageLimit: ctx.settings.apply_pf_wage_limit,
        pfWageLimit: ctx.settings.pf_wage_limit,
        rounding: ctx.settings.total_salary_rounding,
      },
      fullDayHours: ctx.fullDayHours,
      dayAdjustments,
      additions: amount('ADDITION'),
      deductions: amount('DEDUCTION'),
      hasAmountAdjustments: active.some((a) => a.type !== 'DAY_ADJUSTMENT'),
      otEntries: otEntries.map((o) => ({ date: ymd(o.attendance_date)!, approvedHours: Number(o.approved_hours) || 0, status: o.status })),
    });

    const proposals = emp.pay.otEligible
      ? proposeOt(days, inEmployment, ctx.fullDayHours, emp.pay.minimumOtPerDay, ctx.settings.ot_rounding)
      : [];
    const rateByDate = new Map(result.days.map((d) => [d.date, d.daily_rate]));
    const hourlyRateOf = (date: string) =>
      ctx.fullDayHours > 0 ? round2((rateByDate.get(date) || result.daily_rate) / ctx.fullDayHours) : 0;
    return { emp, result, proposals, shiftName: shiftName || (ctx.defaultShiftId ? ctx.shifts.get(ctx.defaultShiftId)?.shift_name || '' : ''), hourlyRateOf };
  }
}
