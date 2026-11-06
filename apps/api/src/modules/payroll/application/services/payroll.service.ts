import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  AddAdjustmentDto,
  ApproveOtDto,
  CategoryDto,
  DayAdjustmentDto,
  LockPayrollDto,
  MarkPaidDto,
  UnlockPayrollDto,
  UpdateCategoryDto,
  UpdatePayrollSettingsDto,
} from '../../presentation/dto/payroll.dto';
import { Issue, round2, rupeesInWords, slipNumber } from '../../domain/payroll-rules';
import { MonthContext, PayrollCalculationService, empCode } from './payroll-calculation.service';
import { PayrollAccessService, PayrollViewer } from './payroll-access.service';
import { PayrollNotifierService } from './payroll-notifier.service';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthLabel = (year: number, month: number) => `${MONTHS[month - 1]} ${year}`;
const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const ymd = (d: Date | string | null | undefined) => (d ? (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)) : null);
const istDate = (d: Date | string | null | undefined) => (d ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(d)) : null);
const inr = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fieldError(field: string, message: string, status = HttpStatus.BAD_REQUEST) {
  return new HttpException({ type: 'about:blank', title: 'Bad Request', status, detail: message, message, errors: [{ field, code: 'VALIDATION_ERROR', message }] }, status);
}

const RUN_COLUMNS = Prisma.sql`pr.payroll_run_id, pr.payroll_month, pr.payroll_year, pr.start_date, pr.end_date, pr.status::text AS status,
  pr.calculated_at, pr.calculated_by, pr.locked_at, pr.locked_by, pr.unlocked_at, pr.unlock_reason, pr.payment_date, pr.payment_reference,
  pr.paid_at, pr.paid_by, pr.attendance_locked, pr.attendance_locked_at, pr.full_day_hours, pr.source_fingerprint, pr.total_employees,
  pr.gross_earnings, pr.employee_pf_total, pr.employer_pf_total, pr.total_salary`;

const PE_SLIP_COLUMNS = Prisma.sql`payroll_employee_id, emp_id, employee_name, employee_code, department_names, role_name, pf_applicable, uan,
  account_number, paid_days, lop_days, ot_hours, basic_salary, ot_amount, employee_pf, total_deductions, gross_earnings, total_salary, flag::text AS flag`;

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calc: PayrollCalculationService,
    private readonly access: PayrollAccessService,
    private readonly notifier: PayrollNotifierService,
  ) {}

  // ===========================================================================
  // Section 12: Payroll Settings
  // ===========================================================================

  async getPayrollSettings() {
    const s = await this.calc.settings();
    const [people, categories, paidLeave, fullDayHours] = await Promise.all([
      s.accounts_emp_ids.length
        ? this.prisma.$queryRaw<any[]>`SELECT emp_id, name FROM employees WHERE emp_id = ANY(${s.accounts_emp_ids}::int[])`
        : Promise.resolve([] as any[]),
      this.listCategories(),
      this.prisma
        .$queryRaw<any[]>`SELECT name, is_paid FROM leave_types WHERE status = 'ACTIVE' ORDER BY name`
        .catch(() => [] as any[]),
      this.calc.fullDayHours(),
    ]);
    return {
      ...s,
      accounts_users: people,
      adjustment_categories: categories,
      paid_leave_types: paidLeave.map((l) => ({ name: l.name, is_paid: Boolean(l.is_paid) })),
      full_day_hours: fullDayHours,
      payroll_month: 'Calendar month (1st to last day)',
    };
  }

  async updatePayrollSettings(dto: UpdatePayrollSettingsDto, adminId: number) {
    const current: any = await this.calc.settings();
    if (dto.apply_pf_wage_limit === true || (dto.apply_pf_wage_limit === undefined && current.apply_pf_wage_limit)) {
      const limit = dto.pf_wage_limit ?? current.pf_wage_limit;
      if (!(Number(limit) > 0)) throw fieldError('pf_wage_limit', 'The PF Wage Limit is required when it is applied.');
    }
    if (dto.accounts_emp_ids) {
      const ids = Array.from(new Set(dto.accounts_emp_ids.map(Number)));
      const n = ids.length ? await this.prisma.employees.count({ where: { emp_id: { in: ids }, deleted_at: null, status: 'Active' } }) : 0;
      if (n !== ids.length) throw fieldError('accounts_emp_ids', 'Accounts users must be active employees.');
      dto.accounts_emp_ids = ids;
    }
    for (const [key, val] of Object.entries(dto)) {
      if (val === undefined) continue;
      const oldVal = Array.isArray(current[key]) ? current[key].join(',') : String(current[key] ?? '');
      const newVal = Array.isArray(val) ? val.join(',') : String(val ?? '');
      if (oldVal !== newVal) {
        await this.prisma.$executeRaw`
          INSERT INTO settings_change_log (module, entity_type, entity_id, field_name, old_value, new_value, changed_by)
          VALUES ('PAYROLL', 'PAYROLL_SETTINGS', ${current.settings_id}, ${key}, ${oldVal}, ${newVal}, ${adminId});
        `;
      }
    }
    await this.prisma.$executeRaw`
      UPDATE payroll_settings SET
        default_employee_pf_pct = COALESCE(${dto.default_employee_pf_pct ?? null}::numeric, default_employee_pf_pct),
        default_employer_pf_pct = COALESCE(${dto.default_employer_pf_pct ?? null}::numeric, default_employer_pf_pct),
        apply_pf_wage_limit = COALESCE(${dto.apply_pf_wage_limit ?? null}::boolean, apply_pf_wage_limit),
        pf_wage_limit = COALESCE(${dto.pf_wage_limit ?? null}::numeric, pf_wage_limit),
        missing_punch_default = COALESCE(${dto.missing_punch_default ?? null}::payroll_missing_punch, missing_punch_default),
        ot_rounding = COALESCE(${dto.ot_rounding ?? null}::payroll_ot_rounding, ot_rounding),
        total_salary_rounding = COALESCE(${dto.total_salary_rounding ?? null}::payroll_total_rounding, total_salary_rounding),
        pay_day = COALESCE(${dto.pay_day ?? null}::int, pay_day),
        accounts_emp_ids = COALESCE(${dto.accounts_emp_ids ?? null}::int[], accounts_emp_ids),
        company_name = CASE WHEN ${dto.company_name !== undefined}::boolean THEN ${dto.company_name?.trim() || null} ELSE company_name END,
        company_address = CASE WHEN ${dto.company_address !== undefined}::boolean THEN ${dto.company_address?.trim() || null} ELSE company_address END,
        updated_by = ${adminId}, updated_at = clock_timestamp()
      WHERE settings_id = ${current.settings_id};
    `;
    return this.getPayrollSettings();
  }

  async getChangeLog() {
    return this.prisma.$queryRaw<any[]>`
      SELECT l.log_id, l.field_name, l.old_value, l.new_value, l.changed_at, e.name AS changed_by_name
      FROM settings_change_log l LEFT JOIN employees e ON e.emp_id = l.changed_by
      WHERE l.module = 'PAYROLL' ORDER BY l.changed_at DESC LIMIT 200;
    `;
  }

  /** Addition and Deduction categories (BFD 8 Part 2; kept in Settings). */
  async listCategories() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT l.lookup_id, l.lookup_type, l.code, l.label, l.is_active, l.sort_order,
             EXISTS (SELECT 1 FROM payroll_adjustments a WHERE a.category_id = l.lookup_id) AS in_use
      FROM master_lookup l
      WHERE l.lookup_type IN ('addition_category', 'deduction_category') AND l.deleted_at IS NULL
      ORDER BY l.lookup_type, l.sort_order, l.label;
    `;
    return rows.map((r) => ({
      category_id: r.lookup_id,
      kind: r.lookup_type === 'addition_category' ? 'ADDITION' : 'DEDUCTION',
      code: r.code,
      label: r.label,
      is_active: r.is_active,
      in_use: Boolean(r.in_use),
    }));
  }

  async addCategory(dto: CategoryDto, adminId: number) {
    const type = dto.kind === 'ADDITION' ? 'addition_category' : 'deduction_category';
    const label = dto.label.trim();
    const code = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || `cat_${Date.now()}`;
    const [dup] = await this.prisma.$queryRaw<any[]>`
      SELECT 1 FROM master_lookup WHERE lookup_type = ${type} AND deleted_at IS NULL AND (lower(label) = lower(${label}) OR code = ${code}) LIMIT 1;
    `;
    if (dup) throw fieldError('label', 'This category already exists.');
    await this.prisma.$executeRaw`
      INSERT INTO master_lookup (lookup_type, code, label, sort_order, is_active, created_by)
      VALUES (${type}, ${code}, ${label}, (SELECT COALESCE(max(sort_order), 0) + 10 FROM master_lookup WHERE lookup_type = ${type}), true, ${adminId});
    `;
    return this.listCategories();
  }

  /** Rename or switch off. A category in use cannot be deleted, only switched off. */
  async updateCategory(id: number, dto: UpdateCategoryDto, adminId: number) {
    const n = await this.prisma.$executeRaw`
      UPDATE master_lookup SET label = COALESCE(${dto.label?.trim() ?? null}, label), is_active = COALESCE(${dto.is_active ?? null}::boolean, is_active),
        updated_by = ${adminId}, updated_at = clock_timestamp()
      WHERE lookup_id = ${id} AND lookup_type IN ('addition_category', 'deduction_category') AND deleted_at IS NULL;
    `;
    if (!n) throw new NotFoundException('Category not found.');
    return this.listCategories();
  }

  // ===========================================================================
  // Section 3: Payroll Runs Listing
  // ===========================================================================

  async listPayrollRuns(year?: number, status?: string, page = 1) {
    const now = todayIST();
    const curYear = Number(now.slice(0, 4));
    const curMonth = Number(now.slice(5, 7));
    const targetYear = year || curYear;
    const runs = await this.prisma.$queryRaw<any[]>`
      SELECT ${RUN_COLUMNS},
             (SELECT count(*)::int FROM payroll_salary_slips s JOIN payroll_employees pe ON pe.payroll_employee_id = s.payroll_employee_id
              WHERE pe.payroll_run_id = pr.payroll_run_id AND s.status = 'RELEASED') AS released_slips_count
      FROM payroll_runs pr WHERE pr.payroll_year = ${targetYear} ORDER BY pr.payroll_month DESC;
    `;
    const locks = await this.prisma.$queryRaw<any[]>`
      SELECT lock_month, is_locked, locked_at FROM attendance_month_locks WHERE lock_year = ${targetYear};
    `;
    const list: any[] = [];
    for (let m = 12; m >= 1; m--) {
      if (targetYear > curYear || (targetYear === curYear && m > curMonth)) continue; // future months not shown
      const r = runs.find((x) => Number(x.payroll_month) === m);
      const lock = locks.find((l) => Number(l.lock_month) === m);
      const days = new Date(Date.UTC(targetYear, m, 0)).getUTCDate();
      list.push({
        payroll_run_id: r?.payroll_run_id ?? null,
        payroll_year: targetYear,
        payroll_month: m,
        month_name: monthLabel(targetYear, m),
        date_range: `01–${days} ${MONTHS[m - 1].slice(0, 3)}`,
        status: r?.status ?? 'NOT_STARTED',
        total_employees: Number(r?.total_employees) || 0,
        gross_earnings: Number(r?.gross_earnings) || 0,
        employee_pf_total: Number(r?.employee_pf_total) || 0,
        employer_pf_total: Number(r?.employer_pf_total) || 0,
        total_salary: Number(r?.total_salary) || 0,
        attendance_locked: Boolean(lock?.is_locked),
        attendance_locked_at: lock?.is_locked ? lock.locked_at : null,
        released_slips_count: Number(r?.released_slips_count) || 0,
      });
    }
    const filtered = list.filter((i) => !status || status === 'ALL' || i.status === status.toUpperCase());
    const pageSize = 12;
    const p = Math.max(1, Number(page) || 1);

    // Counters: the latest run of any year, its employees, Total Salary and open warnings.
    const [current] = await this.prisma.$queryRaw<any[]>`
      SELECT ${RUN_COLUMNS} FROM payroll_runs pr ORDER BY pr.payroll_year DESC, pr.payroll_month DESC LIMIT 1;
    `;
    let warnings = 0;
    if (current) {
      const [w] = await this.prisma.$queryRaw<any[]>`
        SELECT count(*)::int AS n FROM payroll_employees pe, jsonb_array_elements(pe.issues) i
        WHERE pe.payroll_run_id = ${current.payroll_run_id} AND i->>'level' IN ('ERROR', 'WARNING');
      `;
      const [ot] = await this.prisma.$queryRaw<any[]>`
        SELECT count(*)::int AS n FROM payroll_ot_entries WHERE payroll_run_id = ${current.payroll_run_id} AND status = 'PENDING';
      `;
      warnings = (Number(w?.n) || 0) + (Number(ot?.n) > 0 ? 1 : 0);
    }
    const years = await this.prisma.$queryRaw<any[]>`SELECT DISTINCT payroll_year FROM payroll_runs ORDER BY payroll_year DESC;`;
    return {
      year: targetYear,
      years: Array.from(new Set([curYear, ...years.map((y) => Number(y.payroll_year))])).sort((a, b) => b - a),
      summary: {
        current_run_month: current ? monthLabel(current.payroll_year, current.payroll_month) : null,
        current_run_status: current?.status ?? 'NOT_STARTED',
        total_employees: Number(current?.total_employees) || 0,
        total_salary: Number(current?.total_salary) || 0,
        warnings_count: warnings,
      },
      total: filtered.length,
      page: p,
      page_size: pageSize,
      runs: filtered.slice((p - 1) * pageSize, p * pageSize),
    };
  }

  // ===========================================================================
  // Section 4: Start Payroll
  // ===========================================================================

  private assertMonth(year: number, month: number) {
    const now = todayIST();
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    if (!(month >= 1 && month <= 12) || ym > now.slice(0, 7)) throw fieldError('payroll_month', 'Future months cannot be started.');
  }

  /**
   * Months up to the current one (newest first). A month that already has a run is listed with
   * its status: it cannot be started again and is opened instead (BFD Section 3).
   */
  async startableMonths() {
    const now = todayIST();
    const y = Number(now.slice(0, 4));
    const m = Number(now.slice(5, 7));
    const runs = await this.prisma.$queryRaw<any[]>`
      SELECT payroll_year, payroll_month, status::text AS status FROM payroll_runs WHERE payroll_year >= ${y - 2};
    `;
    const statusOf = new Map(runs.map((r) => [`${r.payroll_year}-${r.payroll_month}`, r.status as string]));
    const out: Array<{ year: number; month: number; label: string; run_status: string | null }> = [];
    for (let i = 0; i < 18; i++) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1));
      const yy = d.getUTCFullYear();
      const mm = d.getUTCMonth() + 1;
      out.push({ year: yy, month: mm, label: monthLabel(yy, mm), run_status: statusOf.get(`${yy}-${mm}`) ?? null });
    }
    return out;
  }

  async getStartPayrollEligibility(year: number, month: number) {
    this.assertMonth(year, month);
    const ctx = await this.calc.context(year, month);
    const emps = await this.calc.eligibleEmployees(ctx);
    const [run] = await this.prisma.$queryRaw<any[]>`SELECT payroll_run_id, status::text AS status FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};`;
    const joinedIn = (e: any) => ymd(e.joining_date)! >= ctx.start;
    const leftIn = (e: any) => {
      const t = ymd(e.termination_date || e.exit_date);
      return Boolean(t && t >= ctx.start && t <= ctx.end);
    };
    const joined = emps.filter(joinedIn);
    const left = emps.filter(leftIn);
    const onboarding = emps.filter((e) => e.status === 'Onboarding');
    const allMonth = emps.filter((e) => !joinedIn(e) && !leftIn(e));
    const noSalary = emps.filter((e) => !(e.salary > 0));
    const noShift = ctx.defaultShiftId ? [] : emps.filter((e) => !ctx.employeeShifts[String(e.emp_id)]);
    const noUan = emps.filter((e) => e.pay.pfApplicable && !e.pay.uan);
    const noBank = emps.filter((e) => e.pay.paymentMode === 'BANK_TRANSFER' && (!e.pay.bankName || !e.pay.accountNumber || !e.pay.ifsc));
    let pendingOt = 0;
    if (run) {
      const [p] = await this.prisma.$queryRaw<any[]>`SELECT count(*)::int AS n FROM payroll_ot_entries WHERE payroll_run_id = ${run.payroll_run_id} AND status = 'PENDING';`;
      pendingOt = Number(p?.n) || 0;
    }
    const names = (list: any[]) => list.slice(0, 5).map((e) => empCode(e.emp_id)).join(', ') + (list.length > 5 ? ` and ${list.length - 5} more` : '');
    const checks = [
      noSalary.length
        ? { level: 'ERROR', ok: false, label: `${names(noSalary)}: Monthly Salary is 0 or empty (not paid until fixed)` }
        : { level: 'OK', ok: true, label: 'Every employee has a Monthly Salary more than 0' },
      noShift.length
        ? { level: 'ERROR', ok: false, label: `${names(noShift)}: no shift assigned. HR assigns the shift in Attendance.` }
        : { level: 'OK', ok: true, label: 'Every employee has a shift for every working day' },
      ctx.attendanceLocked
        ? { level: 'OK', ok: true, label: `${MONTHS[month - 1]} attendance is locked (${istDate(ctx.attendanceLockedAt)})` }
        : { level: 'WARNING', ok: false, label: 'Attendance is still open. You can calculate, but cannot lock.' },
      ...(noUan.length ? [{ level: 'WARNING', ok: false, label: `${names(noUan)}: PF Applicable is Yes but UAN is empty` }] : []),
      ...(noBank.length ? [{ level: 'WARNING', ok: false, label: `${names(noBank)}: Payment Mode is Bank transfer but bank details are incomplete` }] : []),
      ...(onboarding.length ? [{ level: 'WARNING', ok: false, label: `${names(onboarding)}: Onboarding, not yet activated. Paid from the Joining Date.` }] : []),
      ...(pendingOt ? [{ level: 'WARNING', ok: false, label: `${pendingOt} OT entries are waiting for approval (can be approved before lock)` }] : []),
    ];
    return {
      year,
      month,
      month_label: monthLabel(year, month),
      period: { start: ctx.start, end: ctx.end },
      run_exists: Boolean(run),
      run_status: run?.status ?? null,
      attendance_locked: ctx.attendanceLocked,
      attendance_locked_at: ctx.attendanceLockedAt,
      attendance_message: ctx.attendanceLocked
        ? `${MONTHS[month - 1]} attendance is locked (${istDate(ctx.attendanceLockedAt)})`
        : 'Attendance is still open. You can calculate, but cannot lock.',
      total_employees_included: emps.length,
      breakdown: {
        active_all_month: allMonth.length,
        joined: joined.map((e) => ({ emp_id: e.emp_id, emp_code: empCode(e.emp_id), name: e.name, date: ymd(e.joining_date) })),
        left: left.map((e) => ({ emp_id: e.emp_id, emp_code: empCode(e.emp_id), name: e.name, date: ymd(e.termination_date || e.exit_date) })),
        onboarding: onboarding.length,
      },
      employees: emps.map((e) => ({ emp_id: e.emp_id, emp_code: empCode(e.emp_id), name: e.name, status: e.status, department: e.department_name })),
      checks,
      available_months: await this.startableMonths(),
    };
  }

  /** "Calculate": creates the run as Draft. A month that already has a run is opened instead. */
  async startPayroll(year: number, month: number, actorId: number) {
    this.assertMonth(year, month);
    const [existing] = await this.prisma.$queryRaw<any[]>`SELECT payroll_run_id FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};`;
    if (existing) {
      throw new ConflictException({ type: 'about:blank', status: 409, code: 'RUN_EXISTS', detail: `${monthLabel(year, month)} has already been started. It is opened instead.`, message: 'Run exists' });
    }
    const ctx = await this.calc.context(year, month);
    await this.prisma.$executeRaw`
      INSERT INTO payroll_runs (payroll_year, payroll_month, start_date, end_date, status, created_by, full_day_hours,
        apply_pf_wage_limit, pf_wage_limit, missing_punch_default, ot_rounding, total_salary_rounding, attendance_locked, attendance_locked_at)
      VALUES (${year}, ${month}, ${ctx.start}::date, ${ctx.end}::date, 'DRAFT', ${actorId}, ${ctx.fullDayHours},
        ${ctx.settings.apply_pf_wage_limit}, ${ctx.settings.pf_wage_limit}, ${ctx.settings.missing_punch_default}::payroll_missing_punch,
        ${ctx.settings.ot_rounding}::payroll_ot_rounding, ${ctx.settings.total_salary_rounding}::payroll_total_rounding,
        ${ctx.attendanceLocked}, ${ctx.attendanceLockedAt})
      ON CONFLICT (payroll_year, payroll_month) DO NOTHING;
    `;
    await this.calculateRun(year, month, actorId, { ctx, action: 'CALCULATED' });
    return this.getPayrollRegister(year, month);
  }

  /** "Recalculate" (Draft only): reads every source again. Adjustments stay. */
  async recalculate(year: number, month: number, actorId: number) {
    await this.calculateRun(year, month, actorId, { action: 'RECALCULATED' });
    return this.getPayrollRegister(year, month);
  }

  private async getRun(year: number, month: number) {
    const [run] = await this.prisma.$queryRaw<any[]>`SELECT ${RUN_COLUMNS} FROM payroll_runs pr WHERE pr.payroll_year = ${year} AND pr.payroll_month = ${month};`;
    if (!run) throw new NotFoundException(`No payroll run for ${monthLabel(year, month)}.`);
    return run;
  }

  private assertDraft(run: any) {
    if (run.status !== 'DRAFT') throw new ConflictException('Payroll is locked. Ask the Admin to unlock.');
  }

  /**
   * Calculates every employee (or the given ones) of a Draft run and saves the result,
   * the day grid, OT proposals and run totals.
   */
  private async calculateRun(
    year: number,
    month: number,
    actorId: number,
    opts: { ctx?: MonthContext; empIds?: number[]; action?: 'CALCULATED' | 'RECALCULATED' | null } = {},
  ) {
    const run = await this.getRun(year, month);
    this.assertDraft(run);
    const ctx = opts.ctx ?? (await this.calc.context(year, month));
    const full = !opts.empIds;
    const emps = await this.calc.eligibleEmployees(ctx, opts.empIds);
    const ids = emps.map((e) => e.emp_id);

    if (full) {
      // Employees no longer in the run are removed; those with amount adjustments are kept with an error.
      const stale = await this.prisma.$queryRaw<any[]>`
        SELECT pe.payroll_employee_id, pe.emp_id,
               EXISTS (SELECT 1 FROM payroll_adjustments a WHERE a.payroll_employee_id = pe.payroll_employee_id
                       AND a.is_active AND a.type <> 'DAY_ADJUSTMENT') AS has_amounts
        FROM payroll_employees pe WHERE pe.payroll_run_id = ${run.payroll_run_id} AND NOT (pe.emp_id = ANY(${ids}::int[]));
      `;
      for (const s of stale) {
        if (s.has_amounts) {
          const issue = [{ level: 'ERROR', code: 'NOT_ELIGIBLE', message: 'No longer paid in this month. Remove the additions or deductions.' }];
          await this.prisma.$executeRaw`
            UPDATE payroll_employees SET flag = 'ERROR', validation_message = ${issue[0].message}, issues = ${JSON.stringify(issue)}::jsonb,
              basic_salary = 0, ot_amount = 0, employee_pf = 0, employer_pf = 0, gross_earnings = 0, total_salary = 0, updated_at = clock_timestamp()
            WHERE payroll_employee_id = ${s.payroll_employee_id};
          `;
        } else {
          await this.prisma.$executeRaw`DELETE FROM payroll_ot_entries WHERE payroll_run_id = ${run.payroll_run_id} AND emp_id = ${s.emp_id};`;
          await this.prisma.$executeRaw`DELETE FROM payroll_employees WHERE payroll_employee_id = ${s.payroll_employee_id};`;
        }
      }
    }

    const [data, adjustments, otEntries] = await Promise.all([
      this.calc.monthData(ctx, ids),
      this.prisma.$queryRaw<any[]>`
        SELECT pa.payroll_adjustment_id, pa.type::text AS type, pa.amount, pa.related_date, pa.new_paid_as::text AS new_paid_as, pa.is_active, pe.emp_id
        FROM payroll_adjustments pa JOIN payroll_employees pe ON pe.payroll_employee_id = pa.payroll_employee_id
        WHERE pe.payroll_run_id = ${run.payroll_run_id} AND pa.is_active = true;
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT payroll_ot_entry_id, emp_id, attendance_date, status::text AS status, approved_hours
        FROM payroll_ot_entries WHERE payroll_run_id = ${run.payroll_run_id};
      `,
    ]);

    for (const emp of emps) {
      const c = this.calc.calculate(
        ctx,
        emp,
        data.get(emp.emp_id)!,
        adjustments.filter((a) => Number(a.emp_id) === emp.emp_id),
        otEntries.filter((o) => Number(o.emp_id) === emp.emp_id),
      );
      const r = c.result;
      const [pe] = await this.prisma.$queryRaw<any[]>`
        INSERT INTO payroll_employees (
          payroll_run_id, emp_id, employee_code, employee_name, department_names, role_name, shift_name, monthly_salary, daily_rate,
          pf_applicable, uan, payment_mode, bank_name, account_number, ifsc_code,
          total_working_days, present_days, paid_leave_days, unpaid_leave_days, absent_days, missing_punch_days, not_employed_days,
          full_days, half_days, paid_days, lop_days, basic_salary, ot_hours, ot_rate, ot_amount, pf_wage, employee_pf, employer_pf,
          total_additions, total_deductions, gross_earnings, total_salary, flag, validation_message, issues, calculated_at
        ) VALUES (
          ${run.payroll_run_id}, ${emp.emp_id}, ${empCode(emp.emp_id)}, ${emp.name}, ${emp.department_name}, ${emp.role_name}, ${c.shiftName},
          ${r.monthly_salary}, ${r.daily_rate}, ${emp.pay.pfApplicable}, ${emp.pay.uan}, ${emp.pay.paymentMode}::payroll_payment_mode,
          ${emp.pay.bankName}, ${emp.pay.accountNumber}, ${emp.pay.ifsc},
          ${r.total_working_days}, ${r.present_days}, ${r.paid_leave_days}, ${r.unpaid_leave_days}, ${r.absent_days}, ${r.missing_punch_days},
          ${r.not_employed_days}, ${r.full_days}, ${r.half_days}, ${r.paid_days}, ${r.lop_days}, ${r.basic_salary}, ${r.ot_hours}, ${r.ot_rate},
          ${r.ot_amount}, ${r.pf_wage}, ${r.employee_pf}, ${r.employer_pf}, ${r.total_additions}, ${r.total_deductions}, ${r.gross_earnings},
          ${r.total_salary}, ${r.flag}::payroll_employee_flag, ${r.validation_message}, ${JSON.stringify(r.issues)}::jsonb, clock_timestamp()
        )
        ON CONFLICT (payroll_run_id, emp_id) DO UPDATE SET
          employee_name = EXCLUDED.employee_name, department_names = EXCLUDED.department_names, role_name = EXCLUDED.role_name,
          shift_name = EXCLUDED.shift_name, monthly_salary = EXCLUDED.monthly_salary, daily_rate = EXCLUDED.daily_rate,
          pf_applicable = EXCLUDED.pf_applicable, uan = EXCLUDED.uan, payment_mode = EXCLUDED.payment_mode, bank_name = EXCLUDED.bank_name,
          account_number = EXCLUDED.account_number, ifsc_code = EXCLUDED.ifsc_code, total_working_days = EXCLUDED.total_working_days,
          present_days = EXCLUDED.present_days, paid_leave_days = EXCLUDED.paid_leave_days, unpaid_leave_days = EXCLUDED.unpaid_leave_days,
          absent_days = EXCLUDED.absent_days, missing_punch_days = EXCLUDED.missing_punch_days, not_employed_days = EXCLUDED.not_employed_days,
          full_days = EXCLUDED.full_days, half_days = EXCLUDED.half_days, paid_days = EXCLUDED.paid_days, lop_days = EXCLUDED.lop_days,
          basic_salary = EXCLUDED.basic_salary, ot_hours = EXCLUDED.ot_hours, ot_rate = EXCLUDED.ot_rate, ot_amount = EXCLUDED.ot_amount,
          pf_wage = EXCLUDED.pf_wage, employee_pf = EXCLUDED.employee_pf, employer_pf = EXCLUDED.employer_pf,
          total_additions = EXCLUDED.total_additions, total_deductions = EXCLUDED.total_deductions, gross_earnings = EXCLUDED.gross_earnings,
          total_salary = EXCLUDED.total_salary, flag = EXCLUDED.flag, validation_message = EXCLUDED.validation_message,
          issues = EXCLUDED.issues, calculated_at = clock_timestamp(), updated_at = clock_timestamp()
        RETURNING payroll_employee_id;
      `;
      const peId = Number(pe.payroll_employee_id);
      const dayRows = r.days.map(
        (d) => Prisma.sql`(${peId}, ${d.date}::date, ${d.attendance_code}, ${d.day_type}, ${d.is_working_day}, ${d.holiday_name},
          ${d.paid_as}::payroll_paid_as, ${d.daily_rate}, ${d.calculated_amount}, ${d.is_adjusted}, ${d.original_paid_as}::payroll_paid_as)`,
      );
      await this.prisma.$executeRaw`
        INSERT INTO payroll_employee_days (payroll_employee_id, attendance_date, attendance_code, day_type, is_working_day, holiday_name,
          paid_as, daily_rate, calculated_amount, is_adjusted, original_paid_as)
        VALUES ${Prisma.join(dayRows)}
        ON CONFLICT (payroll_employee_id, attendance_date) DO UPDATE SET
          attendance_code = EXCLUDED.attendance_code, day_type = EXCLUDED.day_type, is_working_day = EXCLUDED.is_working_day,
          holiday_name = EXCLUDED.holiday_name, paid_as = EXCLUDED.paid_as, daily_rate = EXCLUDED.daily_rate,
          calculated_amount = EXCLUDED.calculated_amount, is_adjusted = EXCLUDED.is_adjusted, original_paid_as = EXCLUDED.original_paid_as;
      `;

      // OT entries proposed from Attendance (BFD Section 9). Decisions already made stay.
      const pay = emp.pay;
      const proposalDates = c.proposals.map((p) => p.date);
      for (const p of c.proposals) {
        const fixed = pay.otRateType === 'FIXED';
        const hourly = fixed ? Number(pay.otRate) || 0 : c.hourlyRateOf(p.date);
        const mult = fixed ? 1 : Number(pay.otMultiplier) || 1;
        await this.prisma.$executeRaw`
          INSERT INTO payroll_ot_entries (payroll_run_id, emp_id, payroll_employee_id, attendance_date, day_type, worked_hours, proposed_hours,
            approved_hours, hourly_rate, ot_multiplier, ot_amount, ot_paid_as, status)
          VALUES (${run.payroll_run_id}, ${emp.emp_id}, ${peId}, ${p.date}::date, ${p.day_type}, ${p.worked_hours}, ${p.proposed_hours},
            0, ${hourly}, ${mult}, 0, ${pay.otPaidAs}::payroll_ot_paid_as, 'PENDING')
          ON CONFLICT (payroll_run_id, emp_id, attendance_date) DO UPDATE SET
            payroll_employee_id = EXCLUDED.payroll_employee_id, day_type = EXCLUDED.day_type, worked_hours = EXCLUDED.worked_hours,
            proposed_hours = EXCLUDED.proposed_hours, hourly_rate = EXCLUDED.hourly_rate, ot_multiplier = EXCLUDED.ot_multiplier,
            ot_paid_as = EXCLUDED.ot_paid_as,
            ot_amount = CASE WHEN EXCLUDED.ot_paid_as = 'SALARY' THEN round(payroll_ot_entries.approved_hours * EXCLUDED.hourly_rate * EXCLUDED.ot_multiplier, 2) ELSE 0 END,
            updated_at = clock_timestamp();
        `;
      }
      await this.prisma.$executeRaw`
        DELETE FROM payroll_ot_entries
        WHERE payroll_run_id = ${run.payroll_run_id} AND emp_id = ${emp.emp_id} AND status = 'PENDING'
          AND NOT (attendance_date = ANY(${proposalDates}::date[]));
      `;
    }

    await this.refreshTotals(run.payroll_run_id);
    if (full) {
      const fp = await this.fingerprint(ctx);
      await this.prisma.$executeRaw`
        UPDATE payroll_runs SET calculated_at = clock_timestamp(), calculated_by = ${actorId}, source_fingerprint = ${fp},
          full_day_hours = ${ctx.fullDayHours}, apply_pf_wage_limit = ${ctx.settings.apply_pf_wage_limit}, pf_wage_limit = ${ctx.settings.pf_wage_limit},
          missing_punch_default = ${ctx.settings.missing_punch_default}::payroll_missing_punch, ot_rounding = ${ctx.settings.ot_rounding}::payroll_ot_rounding,
          total_salary_rounding = ${ctx.settings.total_salary_rounding}::payroll_total_rounding,
          attendance_locked = ${ctx.attendanceLocked}, attendance_locked_at = ${ctx.attendanceLockedAt}, updated_at = clock_timestamp(), updated_by = ${actorId}
        WHERE payroll_run_id = ${run.payroll_run_id};
      `;
    }
    if (opts.action) {
      await this.history(run.payroll_run_id, null, opts.action, opts.action === 'CALCULATED' ? 'Payroll calculated' : 'Payroll recalculated', actorId);
      this.notifier.notify({
        recipients: (await this.access.adminIds()).filter((id) => id !== actorId),
        kind: 'payroll_calculated',
        title: `Payroll ${monthLabel(year, month)} calculated`,
        body: `Payroll for ${monthLabel(year, month)} was ${opts.action === 'CALCULATED' ? 'calculated' : 'recalculated'} as a Draft.`,
        entityId: run.payroll_run_id,
        actorId,
        link: `/admin/payroll/${year}/${month}`,
      });
    }
  }

  private async refreshTotals(runId: number) {
    await this.prisma.$executeRaw`
      UPDATE payroll_runs pr SET
        total_employees = t.n, gross_earnings = t.gross, employee_pf_total = t.epf, employer_pf_total = t.erpf, total_salary = t.total,
        updated_at = clock_timestamp()
      FROM (
        SELECT count(*)::int AS n, COALESCE(sum(gross_earnings), 0) AS gross, COALESCE(sum(employee_pf), 0) AS epf,
               COALESCE(sum(employer_pf), 0) AS erpf, COALESCE(sum(total_salary), 0) AS total
        FROM payroll_employees WHERE payroll_run_id = ${runId}
      ) t
      WHERE pr.payroll_run_id = ${runId};
    `;
  }

  private async history(runId: number, peId: number | null, action: string, reason: string, by: number) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO payroll_run_history (payroll_run_id, payroll_employee_id, action, reason, performed_by) VALUES ($1, $2, $3::payroll_run_action, $4, $5)`,
      runId,
      peId,
      action,
      reason.slice(0, 250),
      by,
    );
  }

  /** A short signature of every source Payroll reads; it changes when any source changes (BFD 6 Rules). */
  private async fingerprint(ctx: MonthContext): Promise<string> {
    try {
      const [r] = await this.prisma.$queryRaw<any[]>`
        SELECT md5(concat_ws('|',
          (SELECT count(*) || ':' || COALESCE(max(GREATEST(created_at, COALESCE(updated_at, created_at), COALESCE(deleted_at, created_at)))::text, '')
             FROM attendance_days WHERE work_date BETWEEN ${ctx.start}::date AND ${ctx.end}::date),
          (SELECT count(*) || ':' || COALESCE(max(COALESCE(updated_at, created_at))::text, '') FROM employees),
          (SELECT COALESCE(max(COALESCE(updated_at, created_at))::text, '') FROM employee_pay_policies),
          (SELECT count(*) || ':' || COALESCE(max(GREATEST(r.created_at, COALESCE(r.updated_at, r.created_at)))::text, '')
             FROM leave_requests r WHERE EXISTS (SELECT 1 FROM leave_request_days d WHERE d.request_id = r.request_id
               AND d.leave_date BETWEEN ${ctx.start}::date AND ${ctx.end}::date)),
          (SELECT count(*) || ':' || COALESCE(max(GREATEST(created_at, COALESCE(updated_at, created_at), COALESCE(deleted_at, created_at)))::text, '')
             FROM company_holidays WHERE holiday_date BETWEEN ${ctx.start}::date AND ${ctx.end}::date),
          (SELECT COALESCE(max(COALESCE(updated_at, created_at))::text, '') FROM app_settings
             WHERE setting_key IN ('attendance_employee_shifts', 'attendance_default_hours')),
          (SELECT COALESCE(max(COALESCE(updated_at, created_at))::text, '') FROM attendance_shifts)
        )) AS fp;
      `;
      return r?.fp || '';
    } catch (err: any) {
      this.logger.warn(`Payroll fingerprint failed: ${err?.message}`);
      return '';
    }
  }

  // ===========================================================================
  // Section 6: Payroll Register
  // ===========================================================================

  async getPayrollRegister(year: number, month: number) {
    const run = await this.getRun(year, month);
    const ctx = await this.calc.context(year, month);
    const [employees, otEntries, adjustments, calcBy, lockBy, fp] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT payroll_employee_id, emp_id, employee_code, employee_name, department_names, role_name, shift_name, monthly_salary, daily_rate,
               pf_applicable, uan, payment_mode::text AS payment_mode, bank_name, account_number, ifsc_code, total_working_days, present_days,
               paid_leave_days, unpaid_leave_days, absent_days, missing_punch_days, not_employed_days, full_days, half_days, paid_days, lop_days,
               basic_salary, ot_hours, ot_rate, ot_amount, pf_wage, employee_pf, employer_pf, total_additions, total_deductions,
               gross_earnings, total_salary, flag::text AS flag, validation_message, issues, is_paid, paid_on, payment_reference,
               (SELECT count(*)::int FROM payroll_adjustments a WHERE a.payroll_employee_id = pe.payroll_employee_id AND a.is_active) AS adjustment_count
        FROM payroll_employees pe WHERE payroll_run_id = ${run.payroll_run_id} ORDER BY emp_id;
      `,
      this.otEntriesFor(run.payroll_run_id, null),
      this.prisma.$queryRaw<any[]>`
        SELECT pa.payroll_adjustment_id, pa.type::text AS type, pa.amount, pa.related_date, pa.old_paid_as::text AS old_paid_as,
               pa.new_paid_as::text AS new_paid_as, pa.reason, pa.note, pa.reference_number, pa.attachment_url, pa.is_active,
               pa.removed_reason, pa.removed_at, pa.created_at, pe.emp_id, pe.employee_name, pe.employee_code, pe.daily_rate,
               ml.label AS category_label, e.name AS created_by_name
        FROM payroll_adjustments pa
        JOIN payroll_employees pe ON pe.payroll_employee_id = pa.payroll_employee_id
        LEFT JOIN master_lookup ml ON ml.lookup_id = pa.category_id
        LEFT JOIN employees e ON e.emp_id = pa.created_by
        WHERE pe.payroll_run_id = ${run.payroll_run_id}
        ORDER BY pa.created_at DESC;
      `,
      run.calculated_by ? this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${run.calculated_by}` : Promise.resolve([]),
      run.locked_by ? this.prisma.$queryRaw<any[]>`SELECT name FROM employees WHERE emp_id = ${run.locked_by}` : Promise.resolve([]),
      run.status === 'DRAFT' ? this.fingerprint(ctx) : Promise.resolve(run.source_fingerprint),
    ]);

    const errors: any[] = [];
    const warnings: any[] = [];
    for (const e of employees) {
      for (const i of (e.issues || []) as Issue[]) {
        const item = { emp_id: e.emp_id, employee_code: e.employee_code, employee_name: e.employee_name, code: i.code, message: i.message };
        if (i.level === 'ERROR') errors.push(item);
        else if (i.level === 'WARNING') warnings.push(item);
      }
    }
    const pendingOt = otEntries.filter((o) => o.status === 'PENDING').length;
    if (pendingOt) warnings.push({ emp_id: null, employee_code: '—', employee_name: 'OT Hours', code: 'OT_PENDING', message: `${pendingOt} OT entries are pending` });
    const dataChanged = run.status === 'DRAFT' && Boolean(run.source_fingerprint) && fp !== run.source_fingerprint;
    const lockChecks = [
      {
        key: 'attendance',
        ok: ctx.attendanceLocked,
        label: ctx.attendanceLocked ? `${MONTHS[month - 1]} attendance is locked (${istDate(ctx.attendanceLockedAt)})` : `Lock ${MONTHS[month - 1]} attendance first`,
      },
      { key: 'ot', ok: pendingOt === 0, label: pendingOt === 0 ? `All ${otEntries.length} OT entries are approved or rejected` : `${pendingOt} OT entries are pending` },
      { key: 'errors', ok: errors.length === 0, label: errors.length === 0 ? 'No employee has an error' : `${errors.length} employee error${errors.length === 1 ? '' : 's'}` },
      {
        key: 'fresh',
        ok: !dataChanged && Boolean(run.calculated_at),
        label: dataChanged ? 'Data has changed since the last calculation. Recalculate.' : `Calculated after the last change (${fmtStamp(run.calculated_at)})`,
      },
    ];
    const departments = Array.from(new Set(employees.map((e) => e.department_names).filter(Boolean))).sort();
    const num = (v: any) => Number(v) || 0;
    return {
      run: {
        ...run,
        month_label: monthLabel(year, month),
        total_employees: num(run.total_employees),
        gross_earnings: num(run.gross_earnings),
        employee_pf_total: num(run.employee_pf_total),
        employer_pf_total: num(run.employer_pf_total),
        total_salary: num(run.total_salary),
        calculated_by_name: calcBy[0]?.name ?? null,
        locked_by_name: lockBy[0]?.name ?? null,
        attendance_locked: ctx.attendanceLocked,
        attendance_locked_at: ctx.attendanceLockedAt,
        data_changed: dataChanged,
        paid_count: employees.filter((e) => e.is_paid).length,
      },
      employees: employees.map((e) => ({
        ...e,
        monthly_salary: num(e.monthly_salary),
        daily_rate: num(e.daily_rate),
        total_working_days: num(e.total_working_days),
        full_days: num(e.full_days),
        half_days: num(e.half_days),
        lop_days: num(e.lop_days),
        paid_days: num(e.paid_days),
        basic_salary: num(e.basic_salary),
        ot_hours: num(e.ot_hours),
        ot_rate: num(e.ot_rate),
        ot_amount: num(e.ot_amount),
        employee_pf: num(e.employee_pf),
        employer_pf: num(e.employer_pf),
        total_additions: num(e.total_additions),
        total_deductions: num(e.total_deductions),
        adj_net: round2(num(e.total_additions) - num(e.total_deductions)),
        gross_earnings: num(e.gross_earnings),
        total_salary: num(e.total_salary),
        issues: e.issues || [],
      })),
      departments,
      ot_entries: otEntries,
      adjustments: adjustments.map((a) => ({ ...a, amount: num(a.amount), effect: this.effectOf(a) })),
      checks: {
        errors,
        warnings,
        lock_checks: lockChecks,
        can_lock: run.status === 'DRAFT' && lockChecks.every((c) => c.ok),
      },
    };
  }

  /** Change to Basic Salary of a day adjustment, or the amount of an addition/deduction. */
  private effectOf(a: any) {
    if (a.type === 'ADDITION') return Number(a.amount) || 0;
    if (a.type === 'DEDUCTION') return -(Number(a.amount) || 0);
    const v = (p: string) => (p === 'FULL' ? 1 : p === 'HALF' ? 0.5 : 0);
    return round2((v(a.new_paid_as) - v(a.old_paid_as)) * (Number(a.daily_rate) || 0));
  }

  private async otEntriesFor(runId: number, empIds: number[] | null) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT o.payroll_ot_entry_id, o.emp_id, o.attendance_date, o.day_type, o.worked_hours, o.proposed_hours, o.approved_hours,
             o.hourly_rate, o.ot_multiplier, o.ot_amount, o.ot_paid_as::text AS ot_paid_as, o.status::text AS status, o.comment, o.approved_at,
             e.name AS employee_name, e.reporting_manager, a.name AS approver_name, m.name AS reporting_manager_name
      FROM payroll_ot_entries o
      JOIN employees e ON e.emp_id = o.emp_id
      LEFT JOIN employees a ON a.emp_id = o.approver_id
      LEFT JOIN employees m ON m.emp_id = e.reporting_manager
      WHERE o.payroll_run_id = ${runId} AND (${empIds}::int[] IS NULL OR o.emp_id = ANY(${empIds}::int[]))
      ORDER BY o.attendance_date, e.name;
    `;
    return rows.map((r) => ({
      ...r,
      attendance_date: ymd(r.attendance_date),
      employee_code: empCode(Number(r.emp_id)),
      worked_hours: Number(r.worked_hours) || 0,
      proposed_hours: Number(r.proposed_hours) || 0,
      approved_hours: Number(r.approved_hours) || 0,
      ot_rate: round2((Number(r.hourly_rate) || 0) * (Number(r.ot_multiplier) || 1)),
      ot_amount: Number(r.ot_amount) || 0,
    }));
  }

  // ===========================================================================
  // Section 7: Employee Salary Sheet
  // ===========================================================================

  async getEmployeeSalarySheet(year: number, month: number, empId: number) {
    const register = await this.getPayrollRegister(year, month);
    const index = register.employees.findIndex((e: any) => e.emp_id === empId);
    if (index < 0) throw new NotFoundException(`${empCode(empId)} is not in the ${monthLabel(year, month)} payroll run.`);
    const emp = register.employees[index];
    const [days, history, pay] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT payroll_employee_day_id, attendance_date, attendance_code, day_type, is_working_day, holiday_name, paid_as::text AS paid_as,
               original_paid_as::text AS original_paid_as, daily_rate, calculated_amount, is_adjusted
        FROM payroll_employee_days WHERE payroll_employee_id = ${emp.payroll_employee_id} ORDER BY attendance_date;
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT h.history_id, h.action::text AS action, h.reason, h.performed_at, e.name AS performed_by_name, (h.payroll_employee_id IS NULL) AS run_level
        FROM payroll_run_history h LEFT JOIN employees e ON e.emp_id = h.performed_by
        WHERE h.payroll_run_id = ${register.run.payroll_run_id} AND (h.payroll_employee_id = ${emp.payroll_employee_id} OR h.payroll_employee_id IS NULL)
        ORDER BY h.performed_at DESC;
      `,
      this.prisma.$queryRaw<any[]>`SELECT ot_eligible, ot_rate_type::text AS ot_rate_type, ot_multiplier, ot_rate FROM employee_pay_policies WHERE emp_id = ${empId}`,
    ]);
    const p = pay[0];
    return {
      run: register.run,
      employee: {
        ...emp,
        ot_eligible: Boolean(p?.ot_eligible),
        ot_label: p?.ot_eligible ? (p.ot_rate_type === 'FIXED' ? `₹ ${inr(Number(p.ot_rate))}/h` : `${Number(p.ot_multiplier) || 1}×`) : null,
      },
      previous_emp_id: register.employees[index - 1]?.emp_id ?? null,
      next_emp_id: register.employees[index + 1]?.emp_id ?? null,
      full_day_hours: Number(register.run.full_day_hours) || 8,
      days: days.map((d) => ({ ...d, attendance_date: ymd(d.attendance_date), daily_rate: Number(d.daily_rate) || 0, calculated_amount: Number(d.calculated_amount) || 0 })),
      adjustments: register.adjustments.filter((a: any) => a.emp_id === empId),
      ot_entries: register.ot_entries.filter((o: any) => Number(o.emp_id) === empId),
      history,
    };
  }

  // ===========================================================================
  // Section 8: Salary Adjustments
  // ===========================================================================

  private async employeeOfRun(payrollEmployeeId: number) {
    const [pe] = await this.prisma.$queryRaw<any[]>`
      SELECT pe.payroll_employee_id, pe.emp_id, pe.total_salary, pe.employee_name, pr.payroll_run_id, pr.status::text AS run_status,
             pr.payroll_year, pr.payroll_month
      FROM payroll_employees pe JOIN payroll_runs pr ON pr.payroll_run_id = pe.payroll_run_id
      WHERE pe.payroll_employee_id = ${payrollEmployeeId};
    `;
    if (!pe) throw new NotFoundException('This employee is not in the payroll run.');
    if (pe.run_status !== 'DRAFT') throw new ConflictException('Payroll is locked. Ask the Admin to unlock.');
    return pe;
  }

  async saveDayAdjustment(payrollEmployeeId: number, dayId: number, dto: DayAdjustmentDto, actorId: number) {
    const pe = await this.employeeOfRun(payrollEmployeeId);
    const [day] = await this.prisma.$queryRaw<any[]>`
      SELECT d.payroll_employee_day_id, d.attendance_date, d.day_type, d.is_working_day, d.paid_as::text AS paid_as,
             d.original_paid_as::text AS original_paid_as, d.is_adjusted
      FROM payroll_employee_days d WHERE d.payroll_employee_day_id = ${dayId} AND d.payroll_employee_id = ${payrollEmployeeId};
    `;
    if (!day) throw new NotFoundException('Day not found.');
    if (day.day_type !== 'WORKING_DAY') throw fieldError('pay_this_day_as', 'Only working days in employment can be adjusted.');
    if (day.paid_as === dto.pay_this_day_as) {
      const word = dto.pay_this_day_as === 'FULL' ? 'Full day' : dto.pay_this_day_as === 'HALF' ? 'Half day' : 'Unpaid';
      throw fieldError('pay_this_day_as', `This day is already paid as ${word}.`);
    }
    const attendanceValue = day.is_adjusted ? day.original_paid_as : day.paid_as;
    // One per day: a new adjustment replaces the old one (the old one stays in History).
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE payroll_adjustments SET is_active = false, removed_at = clock_timestamp(), removed_by = ${actorId},
          removed_reason = 'Replaced by a new day adjustment', updated_at = clock_timestamp()
        WHERE payroll_employee_day_id = ${dayId} AND type = 'DAY_ADJUSTMENT' AND is_active = true;
      `;
      if (dto.pay_this_day_as !== attendanceValue) {
        await tx.$executeRaw`
          INSERT INTO payroll_adjustments (payroll_employee_id, payroll_employee_day_id, type, old_paid_as, new_paid_as, amount, related_date,
            reason, note, is_active, created_by)
          VALUES (${payrollEmployeeId}, ${dayId}, 'DAY_ADJUSTMENT', ${attendanceValue}::payroll_paid_as, ${dto.pay_this_day_as}::payroll_paid_as,
            0, ${day.attendance_date}, ${dto.reason}, ${dto.note.trim()}, true, ${actorId});
        `;
      }
    });
    await this.history(pe.payroll_run_id, payrollEmployeeId, 'ADJUSTED', `Day ${ymd(day.attendance_date)}: ${day.paid_as} → ${dto.pay_this_day_as}. ${dto.reason}: ${dto.note.trim()}`, actorId);
    await this.calculateRun(pe.payroll_year, pe.payroll_month, actorId, { empIds: [pe.emp_id], action: null });
    return this.getEmployeeSalarySheet(pe.payroll_year, pe.payroll_month, pe.emp_id);
  }

  /** "Remove adjustment": back to the attendance value. Reason required. */
  async removeDayAdjustment(payrollEmployeeId: number, dayId: number, reason: string, actorId: number) {
    const pe = await this.employeeOfRun(payrollEmployeeId);
    const n = await this.prisma.$executeRaw`
      UPDATE payroll_adjustments SET is_active = false, removed_at = clock_timestamp(), removed_by = ${actorId}, removed_reason = ${reason.trim()},
        updated_at = clock_timestamp()
      WHERE payroll_employee_day_id = ${dayId} AND payroll_employee_id = ${payrollEmployeeId} AND type = 'DAY_ADJUSTMENT' AND is_active = true;
    `;
    if (!n) throw new NotFoundException('This day has no adjustment.');
    await this.history(pe.payroll_run_id, payrollEmployeeId, 'ADJUSTED', `Day adjustment removed: ${reason.trim()}`, actorId);
    await this.calculateRun(pe.payroll_year, pe.payroll_month, actorId, { empIds: [pe.emp_id], action: null });
    return this.getEmployeeSalarySheet(pe.payroll_year, pe.payroll_month, pe.emp_id);
  }

  /** Addition or Deduction (BFD 8 Part 2). Also used by Expense Management for reimbursements. */
  async addAdjustment(payrollEmployeeId: number, dto: AddAdjustmentDto, actorId: number) {
    const pe = await this.employeeOfRun(payrollEmployeeId);
    const type = dto.kind === 'ADDITION' ? 'addition_category' : 'deduction_category';
    const [cat] = dto.category_id
      ? await this.prisma.$queryRaw<any[]>`SELECT lookup_id, label, is_active FROM master_lookup WHERE lookup_id = ${dto.category_id} AND lookup_type = ${type} AND deleted_at IS NULL`
      : await this.prisma.$queryRaw<any[]>`SELECT lookup_id, label, is_active FROM master_lookup WHERE code = ${dto.category_code || ''} AND lookup_type = ${type} AND deleted_at IS NULL`;
    if (!cat) throw fieldError('category_id', 'Please fill this field.');
    if (!cat.is_active) throw fieldError('category_id', 'This category is switched off. Please choose another.');
    const amount = round2(Number(dto.amount));
    if (!(amount > 0)) throw fieldError('amount', 'Please enter an amount more than 0.');
    if (dto.related_date) {
      const run = await this.getRun(pe.payroll_year, pe.payroll_month);
      if (dto.related_date < ymd(run.start_date)! || dto.related_date > ymd(run.end_date)!) throw fieldError('related_date', 'The related date must be in the payroll month.');
    }
    if (dto.kind === 'DEDUCTION' && Number(pe.total_salary) - amount < 0) {
      throw fieldError('amount', 'Total Salary cannot be less than 0. Reduce the deduction.');
    }
    await this.prisma.$executeRaw`
      INSERT INTO payroll_adjustments (payroll_employee_id, type, category_id, amount, related_date, reference_number, reason, attachment_url, is_active, created_by)
      VALUES (${payrollEmployeeId}, ${dto.kind}::payroll_adjustment_type, ${cat.lookup_id}, ${amount}, ${dto.related_date ?? null}::date,
        ${dto.reference_number?.trim() || null}, ${dto.reason.trim()}, ${dto.attachment_url || null}, true, ${actorId});
    `;
    await this.history(pe.payroll_run_id, payrollEmployeeId, 'ADJUSTED', `${dto.kind === 'ADDITION' ? 'Addition' : 'Deduction'} ${cat.label} ₹ ${inr(amount)}: ${dto.reason.trim()}`, actorId);
    await this.calculateRun(pe.payroll_year, pe.payroll_month, actorId, { empIds: [pe.emp_id], action: null });
    return this.getEmployeeSalarySheet(pe.payroll_year, pe.payroll_month, pe.emp_id);
  }

  async removeAdjustment(adjustmentId: number, reason: string, actorId: number) {
    const [a] = await this.prisma.$queryRaw<any[]>`
      SELECT payroll_employee_id, type::text AS type FROM payroll_adjustments WHERE payroll_adjustment_id = ${adjustmentId} AND is_active = true;
    `;
    if (!a) throw new NotFoundException('Adjustment not found.');
    if (a.type === 'DAY_ADJUSTMENT') throw new BadRequestException('Use "Remove adjustment" on the day.');
    const pe = await this.employeeOfRun(Number(a.payroll_employee_id));
    await this.prisma.$executeRaw`
      UPDATE payroll_adjustments SET is_active = false, removed_at = clock_timestamp(), removed_by = ${actorId}, removed_reason = ${reason.trim()},
        updated_at = clock_timestamp()
      WHERE payroll_adjustment_id = ${adjustmentId};
    `;
    await this.history(pe.payroll_run_id, pe.payroll_employee_id, 'ADJUSTED', `${a.type === 'ADDITION' ? 'Addition' : 'Deduction'} removed: ${reason.trim()}`, actorId);
    await this.calculateRun(pe.payroll_year, pe.payroll_month, actorId, { empIds: [pe.emp_id], action: null });
    return this.getEmployeeSalarySheet(pe.payroll_year, pe.payroll_month, pe.emp_id);
  }

  // ===========================================================================
  // Section 9: OT Hours for the Month
  // ===========================================================================

  /** Entries the viewer may decide: the Admin all (except own); a Reporting Manager their team. */
  async listOtEntries(viewer: PayrollViewer, year: number, month: number) {
    const [run] = await this.prisma.$queryRaw<any[]>`SELECT payroll_run_id, status::text AS status FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};`;
    if (!run) return { run: null, entries: [], can_decide: false };
    const all = await this.otEntriesFor(run.payroll_run_id, null);
    const seesAll = viewer.isAdmin || viewer.isAccounts;
    const entries = all
      .filter((o) => seesAll || Number(o.reporting_manager) === viewer.empId)
      .map((o) => {
        const approver = o.reporting_manager ? Number(o.reporting_manager) : null;
        const canDecide = run.status === 'DRAFT' && Number(o.emp_id) !== viewer.empId && (viewer.isAdmin || approver === viewer.empId);
        // Reporting Managers see no salary amounts (BFD Section 1).
        const amounts = seesAll ? { ot_rate: o.ot_rate, ot_amount: o.ot_amount } : { ot_rate: null, ot_amount: null };
        return { ...o, ...amounts, approver: approver ? o.reporting_manager_name : 'Admin', can_decide: canDecide };
      });
    return { run: { payroll_run_id: run.payroll_run_id, status: run.status, month_label: monthLabel(year, month) }, entries };
  }

  async decideOt(entryId: number, dto: ApproveOtDto, viewer: PayrollViewer) {
    const [o] = await this.prisma.$queryRaw<any[]>`
      SELECT o.payroll_ot_entry_id, o.emp_id, o.proposed_hours, o.hourly_rate, o.ot_multiplier, o.ot_paid_as::text AS ot_paid_as, o.attendance_date,
             e.reporting_manager, pr.payroll_year, pr.payroll_month, pr.status::text AS run_status, pr.payroll_run_id
      FROM payroll_ot_entries o JOIN employees e ON e.emp_id = o.emp_id JOIN payroll_runs pr ON pr.payroll_run_id = o.payroll_run_id
      WHERE o.payroll_ot_entry_id = ${entryId};
    `;
    if (!o) throw new NotFoundException('OT entry not found.');
    if (o.run_status !== 'DRAFT') throw new ConflictException('Payroll is locked. Ask the Admin to unlock.');
    if (Number(o.emp_id) === viewer.empId) throw new ForbiddenException('Nobody approves their own OT.');
    const manager = o.reporting_manager ? Number(o.reporting_manager) : null;
    if (!viewer.isAdmin && manager !== viewer.empId) throw new ForbiddenException('Only the Reporting Manager or the Admin can decide this OT entry.');
    const proposed = Number(o.proposed_hours) || 0;
    const comment = dto.comment?.trim() || null;
    let hours = proposed;
    if (dto.status === 'REJECTED') hours = 0;
    if (dto.status === 'REDUCED') {
      hours = Number(dto.approved_hours);
      if (!(hours > 0) || hours >= proposed) throw fieldError('approved_hours', `Enter hours more than 0 and less than ${proposed}.`);
    }
    if (dto.status !== 'APPROVED' && (!comment || comment.length < 10)) throw fieldError('comment', 'Please write at least 10 characters.');
    const amount = o.ot_paid_as === 'SALARY' ? round2(hours * Number(o.hourly_rate) * (Number(o.ot_multiplier) || 1)) : 0;
    await this.prisma.$executeRaw`
      UPDATE payroll_ot_entries SET status = ${dto.status}::payroll_ot_status, approved_hours = ${hours}, ot_amount = ${amount},
        approver_id = ${viewer.empId}, comment = ${comment}, approved_at = clock_timestamp(), updated_at = clock_timestamp()
      WHERE payroll_ot_entry_id = ${entryId};
    `;
    await this.history(o.payroll_run_id, null, 'OT_DECIDED', `OT ${ymd(o.attendance_date)} of ${empCode(o.emp_id)}: ${dto.status.toLowerCase()} ${hours} h${comment ? `. ${comment}` : ''}`, viewer.empId);
    if (dto.status !== 'APPROVED') {
      this.notifier.notify({
        recipients: [Number(o.emp_id)],
        kind: dto.status === 'REJECTED' ? 'payroll_ot_rejected' : 'payroll_ot_reduced',
        title: dto.status === 'REJECTED' ? 'OT entry rejected' : 'OT entry reduced',
        body: `Your OT of ${fmtDay(ymd(o.attendance_date)!)} (${proposed} h) was ${dto.status === 'REJECTED' ? 'rejected' : `reduced to ${hours} h`}. ${comment}`,
        entityId: entryId,
        actorId: viewer.empId,
      });
    }
    await this.calculateRun(o.payroll_year, o.payroll_month, viewer.empId, { empIds: [Number(o.emp_id)], action: null });
    return { success: true };
  }

  /** "Approve Selected". */
  async bulkApproveOt(ids: number[], viewer: PayrollViewer) {
    let done = 0;
    const skipped: string[] = [];
    for (const id of ids) {
      try {
        await this.decideOt(id, { status: 'APPROVED' } as ApproveOtDto, viewer);
        done++;
      } catch (err: any) {
        skipped.push(`#${id}: ${err?.message || 'not allowed'}`);
      }
    }
    return { approved: done, skipped };
  }

  // ===========================================================================
  // Section 10: Lock, Salary Slips and Payment
  // ===========================================================================

  async lockPayroll(year: number, month: number, dto: LockPayrollDto, actorId: number) {
    if (!dto.confirmed) throw fieldError('confirmed', 'Please tick that you have checked the Payroll Register and the warnings.');
    const reg = await this.getPayrollRegister(year, month);
    if (reg.run.status !== 'DRAFT') throw new ConflictException(`Payroll ${monthLabel(year, month)} is already ${String(reg.run.status).toLowerCase()}.`);
    const blocking = reg.checks.lock_checks.filter((c: any) => !c.ok);
    if (blocking.length) throw new ConflictException(`Cannot lock: ${blocking.map((c: any) => c.label).join('; ')}`);
    const n = await this.prisma.$executeRaw`
      UPDATE payroll_runs SET status = 'LOCKED', locked_at = clock_timestamp(), locked_by = ${actorId}, updated_at = clock_timestamp(), updated_by = ${actorId}
      WHERE payroll_run_id = ${reg.run.payroll_run_id} AND status = 'DRAFT';
    `;
    if (!n) throw new ConflictException('This payroll run was changed by someone else. Please reload.');
    await this.history(reg.run.payroll_run_id, null, 'LOCKED', 'Payroll locked', actorId);
    this.notifier.notify({
      recipients: (await this.access.adminIds()).filter((id) => id !== actorId),
      kind: 'payroll_locked',
      title: `Payroll ${monthLabel(year, month)} locked`,
      body: `Payroll for ${monthLabel(year, month)} was locked: ${reg.run.total_employees} employees, Total Salary ₹ ${inr(reg.run.total_salary)}.`,
      entityId: reg.run.payroll_run_id,
      actorId,
      link: `/admin/payroll/${year}/${month}`,
    });
    return this.getPayrollRegister(year, month);
  }

  /** Admin only. Paid runs cannot be unlocked. */
  async unlockPayroll(year: number, month: number, dto: UnlockPayrollDto, actorId: number) {
    const run = await this.getRun(year, month);
    if (run.status === 'PAID') throw new ConflictException('A paid run cannot be unlocked. Correct it next month as Arrears or a Deduction.');
    if (run.status !== 'LOCKED') throw new ConflictException('Only a locked run can be unlocked.');
    const reason = dto.reason.trim();
    await this.prisma.$executeRaw`
      UPDATE payroll_runs SET status = 'DRAFT', unlocked_at = clock_timestamp(), unlocked_by = ${actorId}, unlock_reason = ${reason},
        updated_at = clock_timestamp(), updated_by = ${actorId}
      WHERE payroll_run_id = ${run.payroll_run_id} AND status = 'LOCKED';
    `;
    await this.history(run.payroll_run_id, null, 'UNLOCKED', reason, actorId);
    this.notifier.notify({
      recipients: await this.access.accountsIds(),
      kind: 'payroll_unlocked',
      title: `Payroll ${monthLabel(year, month)} unlocked`,
      body: `The Admin unlocked payroll for ${monthLabel(year, month)}. Reason: ${reason}`,
      email: true,
      entityId: run.payroll_run_id,
      actorId,
      link: `/admin/payroll/${year}/${month}`,
    });
    return this.getPayrollRegister(year, month);
  }

  /** Mark as Paid: all or the ticked employees; the run is Paid when everyone is paid. */
  async markAsPaid(year: number, month: number, dto: MarkPaidDto, actorId: number) {
    const run = await this.getRun(year, month);
    if (run.status !== 'LOCKED') throw new ConflictException('Lock the payroll before recording the payment.');
    const today = todayIST();
    if (dto.payment_date > today) throw fieldError('payment_date', 'The payment date cannot be in the future.');
    const lockedOn = istDate(run.locked_at);
    if (lockedOn && dto.payment_date < lockedOn) throw fieldError('payment_date', `The payment date cannot be before the lock date (${fmtDay(lockedOn)}).`);
    const unpaid = await this.prisma.$queryRaw<any[]>`
      SELECT payroll_employee_id, emp_id, payment_mode::text AS payment_mode, employee_name
      FROM payroll_employees WHERE payroll_run_id = ${run.payroll_run_id} AND is_paid = false;
    `;
    const selected = dto.emp_ids?.length ? unpaid.filter((u) => dto.emp_ids!.includes(Number(u.emp_id))) : unpaid;
    if (!selected.length) throw fieldError('emp_ids', 'Please select at least one employee who is not paid yet.');
    const bank = selected.filter((s) => s.payment_mode === 'BANK_TRANSFER');
    if (bank.length && !dto.batch_reference?.trim()) throw fieldError('batch_reference', 'Please enter the bank batch reference.');
    const cheques = selected.filter((s) => s.payment_mode === 'CHEQUE');
    for (const c of cheques) {
      if (!dto.cheque_numbers?.[String(c.emp_id)]?.trim()) throw fieldError('cheque_numbers', `Please enter the cheque number for ${c.employee_name}.`);
    }
    await this.prisma.$transaction(async (tx) => {
      for (const s of selected) {
        const ref =
          s.payment_mode === 'BANK_TRANSFER'
            ? dto.batch_reference!.trim()
            : s.payment_mode === 'CHEQUE'
              ? `Cheque ${dto.cheque_numbers![String(s.emp_id)].trim()}`
              : dto.cash_reference?.trim() || 'Cash';
        await tx.$executeRaw`
          UPDATE payroll_employees SET is_paid = true, paid_on = ${dto.payment_date}::date, payment_reference = ${ref}, updated_at = clock_timestamp()
          WHERE payroll_employee_id = ${s.payroll_employee_id};
        `;
      }
    });
    const [left] = await this.prisma.$queryRaw<any[]>`SELECT count(*)::int AS n FROM payroll_employees WHERE payroll_run_id = ${run.payroll_run_id} AND is_paid = false;`;
    const allPaid = Number(left?.n) === 0;
    if (allPaid) {
      await this.prisma.$executeRaw`
        UPDATE payroll_runs SET status = 'PAID', payment_date = ${dto.payment_date}::date, payment_reference = ${dto.batch_reference?.trim() || dto.cash_reference?.trim() || null},
          paid_at = clock_timestamp(), paid_by = ${actorId}, updated_at = clock_timestamp()
        WHERE payroll_run_id = ${run.payroll_run_id};
      `;
      this.notifier.notify({
        recipients: (await this.access.adminIds()).filter((id) => id !== actorId),
        kind: 'payroll_paid',
        title: `Payroll ${monthLabel(year, month)} paid`,
        body: `Payroll for ${monthLabel(year, month)} was marked as Paid on ${fmtDay(dto.payment_date)}.`,
        entityId: run.payroll_run_id,
        actorId,
        link: `/admin/payroll/${year}/${month}`,
      });
    }
    await this.history(run.payroll_run_id, null, 'PAID', `${selected.length} employee(s) paid on ${dto.payment_date}${allPaid ? '. Run is Paid.' : ''}`, actorId);
    return this.getPayrollRegister(year, month);
  }

  /** "Download bank file": one row per bank-transfer employee with complete details. */
  async bankFile(year: number, month: number) {
    const run = await this.getRun(year, month);
    if (run.status === 'DRAFT') throw new ConflictException('Lock the payroll first.');
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT employee_code, employee_name, bank_name, account_number, ifsc_code, total_salary
      FROM payroll_employees
      WHERE payroll_run_id = ${run.payroll_run_id} AND payment_mode = 'BANK_TRANSFER' AND total_salary > 0
        AND COALESCE(account_number, '') <> '' AND COALESCE(ifsc_code, '') <> ''
      ORDER BY emp_id;
    `;
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Name', 'Emp ID', 'Bank', 'Account Number', 'IFSC', 'Total Salary'].join(',')];
    for (const r of rows) lines.push([r.employee_name, r.employee_code, r.bank_name, r.account_number, r.ifsc_code, Number(r.total_salary).toFixed(2)].map(esc).join(','));
    return { filename: `bank-file-${year}-${String(month).padStart(2, '0')}.csv`, csv: lines.join('\n') };
  }

  /** Bulk Salary Slips from the active Salary Slip template (Template Management). */
  async generateSalarySlips(year: number, month: number, actorId: number) {
    const run = await this.getRun(year, month);
    if (run.status === 'DRAFT') throw new ConflictException('Lock payroll first.');
    const [tpl] = await this.prisma.$queryRaw<any[]>`
      SELECT template_id, content_html, COALESCE(updated_at, created_at) AS version
      FROM document_templates WHERE document_type = 'payroll_salary_slip' AND COALESCE(is_active, true)
      ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 1;
    `;
    if (!tpl) throw new ConflictException('There is no active Salary Slip template in Template Management.');
    // template_version is varchar(40): keep a short ISO timestamp of the template's last change.
    const tplVersion = tpl.version ? new Date(tpl.version).toISOString().slice(0, 19) : null;
    const settings = await this.calc.settings();
    const employees = await this.prisma.$queryRaw<any[]>`SELECT ${PE_SLIP_COLUMNS} FROM payroll_employees WHERE payroll_run_id = ${run.payroll_run_id} ORDER BY emp_id;`;
    const adjustments = await this.prisma.$queryRaw<any[]>`
      SELECT pa.payroll_employee_id, pa.type::text AS type, pa.amount, ml.label
      FROM payroll_adjustments pa JOIN payroll_employees pe ON pe.payroll_employee_id = pa.payroll_employee_id
      LEFT JOIN master_lookup ml ON ml.lookup_id = pa.category_id
      WHERE pe.payroll_run_id = ${run.payroll_run_id} AND pa.is_active AND pa.type <> 'DAY_ADJUSTMENT'
      ORDER BY pa.created_at;
    `;
    let count = 0;
    for (const e of employees) {
      if (e.flag === 'ERROR') continue;
      const [last] = await this.prisma.$queryRaw<any[]>`
        SELECT payroll_slip_id, revision_number, status::text AS status FROM payroll_salary_slips
        WHERE payroll_employee_id = ${e.payroll_employee_id} ORDER BY revision_number DESC LIMIT 1;
      `;
      const html = this.renderSlip(tpl.content_html, settings, run, e, adjustments.filter((a) => a.payroll_employee_id === e.payroll_employee_id), null);
      if (last && last.status === 'GENERATED') {
        // Not released yet: made again in place.
        const number = slipNumber(year, month, e.emp_id, last.revision_number);
        await this.prisma.$executeRaw`
          UPDATE payroll_salary_slips SET content_html = ${this.withNumber(html, number)}, template_id = ${tpl.template_id},
            template_version = ${tplVersion}, generated_at = clock_timestamp(), updated_at = clock_timestamp()
          WHERE payroll_slip_id = ${last.payroll_slip_id};
        `;
      } else {
        const revision = last ? Number(last.revision_number) + 1 : 0;
        const number = slipNumber(year, month, e.emp_id, revision);
        await this.prisma.$executeRaw`
          INSERT INTO payroll_salary_slips (payroll_employee_id, template_id, slip_number, revision_number, status, template_version, content_html, generated_at)
          VALUES (${e.payroll_employee_id}, ${tpl.template_id}, ${number}, ${revision}, 'GENERATED', ${tplVersion}, ${this.withNumber(html, number)}, clock_timestamp())
          ON CONFLICT (slip_number) DO NOTHING;
        `;
      }
      count++;
    }
    await this.history(run.payroll_run_id, null, 'SLIPS_GENERATED', `${count} Salary Slips generated`, actorId);
    return { success: true, generated_count: count, message: `${count} Salary Slips generated. Click Release to send them.` };
  }

  private withNumber(html: string, number: string) {
    return html.replace(/\{\{SlipNumber\}\}/g, number);
  }

  private renderSlip(template: string, settings: any, run: any, e: any, adjustments: any[], number: string | null) {
    const n = (v: any) => inr(Number(v) || 0);
    const row = (label: string, amount: any) =>
      `<tr><td style="padding:4px 6px;">${escHtml(label)}</td><td style="padding:4px 6px;text-align:right;">${n(amount)}</td></tr>`;
    const earnings = [row('Basic Salary', e.basic_salary)];
    if (Number(e.ot_amount) > 0) earnings.push(row('Overtime', e.ot_amount));
    for (const a of adjustments.filter((x) => x.type === 'ADDITION')) earnings.push(row(a.label || 'Addition', a.amount));
    const deductions: string[] = [];
    if (e.pf_applicable && Number(e.employee_pf) > 0) deductions.push(row('Provident Fund', e.employee_pf));
    for (const a of adjustments.filter((x) => x.type === 'DEDUCTION')) deductions.push(row(a.label || 'Deduction', a.amount));
    const table = (rows: string[]) => `<table width="100%" style="border-collapse:collapse;font-size:12px;">${rows.join('') || '<tr><td style="padding:4px 6px;">—</td></tr>'}</table>`;
    const values: Record<string, string> = {
      CompanyName: escHtml(settings.company_name || ''),
      CompanyAddress: escHtml(settings.company_address || ''),
      Month: monthLabel(run.payroll_year, run.payroll_month),
      SlipNumber: number ?? '{{SlipNumber}}',
      EmployeeName: escHtml(e.employee_name),
      EmployeeCode: escHtml(e.employee_code),
      Department: escHtml(e.department_names || '—'),
      Designation: escHtml(e.role_name || '—'),
      UAN: escHtml(e.pf_applicable ? e.uan || '—' : 'N/A'),
      BankAccount: e.account_number ? `XXXX${String(e.account_number).slice(-4)}` : '—',
      PaidDays: String(Number(e.paid_days)),
      LOPDays: String(Number(e.lop_days)),
      OTHours: String(Number(e.ot_hours)),
      EarningsRows: table(earnings),
      DeductionsRows: table(deductions),
      Gross: n(e.gross_earnings),
      TotalDeductions: n(Number(e.employee_pf) + Number(e.total_deductions)),
      NetPay: Number(e.total_salary).toLocaleString('en-IN'),
      NetPayInWords: rupeesInWords(Number(e.total_salary)),
    };
    return template.replace(/\{\{(\w+)\}\}/g, (m, k) => (k === 'SlipNumber' && !number ? m : values[k] ?? ''));
  }

  /** "Release": slips go to each employee's profile and office email (personal email if deactivated). */
  async releaseSalarySlips(year: number, month: number, actorId: number) {
    const run = await this.getRun(year, month);
    if (run.status === 'DRAFT') throw new ConflictException('Lock payroll first.');
    const slips = await this.prisma.$queryRaw<any[]>`
      SELECT s.payroll_slip_id, s.slip_number, s.content_html, pe.payroll_employee_id, pe.emp_id, e.status::text AS emp_status
      FROM payroll_salary_slips s JOIN payroll_employees pe ON pe.payroll_employee_id = s.payroll_employee_id
      JOIN employees e ON e.emp_id = pe.emp_id
      WHERE pe.payroll_run_id = ${run.payroll_run_id} AND s.status = 'GENERATED';
    `;
    if (!slips.length) throw new ConflictException('There are no new Salary Slips to release. Generate them first.');
    for (const s of slips) {
      const personal = s.emp_status === 'Inactive';
      const email = await this.notifier.addressFor(Number(s.emp_id), personal);
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE payroll_salary_slips SET status = 'REPLACED', updated_at = clock_timestamp()
          WHERE payroll_employee_id = ${s.payroll_employee_id} AND status = 'RELEASED' AND payroll_slip_id <> ${s.payroll_slip_id};
        `;
        await tx.$executeRaw`
          UPDATE payroll_salary_slips SET status = 'RELEASED', released_at = clock_timestamp(), released_to_email = ${email}, updated_at = clock_timestamp()
          WHERE payroll_slip_id = ${s.payroll_slip_id};
        `;
      });
      this.notifier.notify({
        recipients: [Number(s.emp_id)],
        kind: 'payroll_slip_released',
        title: `Salary Slip ${monthLabel(year, month)}`,
        body: `Your Salary Slip ${s.slip_number} for ${monthLabel(year, month)} is ready.`,
        email: true,
        personalEmail: personal,
        emailHtml: s.content_html,
        entityId: Number(s.payroll_slip_id),
        actorId,
        link: '/salary-slips',
      });
    }
    await this.history(run.payroll_run_id, null, 'SLIPS_RELEASED', `${slips.length} Salary Slips released`, actorId);
    return { success: true, released_count: slips.length, message: `${slips.length} Salary Slips released.` };
  }

  /** Latest slip of one employee in a run (Accounts/Admin), or a preview before slips are made. */
  async getEmployeeSalarySlip(year: number, month: number, empId: number) {
    const run = await this.getRun(year, month);
    const [e] = await this.prisma.$queryRaw<any[]>`SELECT ${PE_SLIP_COLUMNS} FROM payroll_employees WHERE payroll_run_id = ${run.payroll_run_id} AND emp_id = ${empId};`;
    if (!e) throw new NotFoundException(`${empCode(empId)} is not in this run.`);
    const [slip] = await this.prisma.$queryRaw<any[]>`
      SELECT payroll_slip_id, slip_number, revision_number, status::text AS status, content_html, generated_at, released_at, released_to_email
      FROM payroll_salary_slips WHERE payroll_employee_id = ${e.payroll_employee_id} ORDER BY revision_number DESC LIMIT 1;
    `;
    if (slip) return { ...slip, preview: false };
    const [tpl] = await this.prisma.$queryRaw<any[]>`
      SELECT content_html FROM document_templates WHERE document_type = 'payroll_salary_slip' AND COALESCE(is_active, true)
      ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 1;
    `;
    if (!tpl) throw new ConflictException('There is no active Salary Slip template in Template Management.');
    const adjustments = await this.prisma.$queryRaw<any[]>`
      SELECT pa.type::text AS type, pa.amount, ml.label FROM payroll_adjustments pa LEFT JOIN master_lookup ml ON ml.lookup_id = pa.category_id
      WHERE pa.payroll_employee_id = ${e.payroll_employee_id} AND pa.is_active AND pa.type <> 'DAY_ADJUSTMENT' ORDER BY pa.created_at;
    `;
    const settings = await this.calc.settings();
    const number = slipNumber(year, month, empId, 0);
    return {
      slip_number: number,
      status: 'PREVIEW',
      content_html: this.renderSlip(tpl.content_html, settings, run, e, adjustments, number),
      preview: true,
    };
  }

  /** Own released slips (employee profile). Accounts/Admin may pass another employee. */
  async slipsOf(empId: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT s.payroll_slip_id, s.slip_number, s.status::text AS status, s.released_at, pr.payroll_year, pr.payroll_month, pe.total_salary
      FROM payroll_salary_slips s
      JOIN payroll_employees pe ON pe.payroll_employee_id = s.payroll_employee_id
      JOIN payroll_runs pr ON pr.payroll_run_id = pe.payroll_run_id
      WHERE pe.emp_id = ${empId} AND s.status IN ('RELEASED', 'REPLACED')
      ORDER BY pr.payroll_year DESC, pr.payroll_month DESC, s.revision_number DESC;
    `;
    return rows.map((r) => ({ ...r, month_label: monthLabel(r.payroll_year, r.payroll_month), total_salary: Number(r.total_salary) || 0 }));
  }

  async slipById(slipId: number, viewerEmpId: number) {
    const [s] = await this.prisma.$queryRaw<any[]>`
      SELECT s.payroll_slip_id, s.slip_number, s.status::text AS status, s.content_html, s.released_at, pe.emp_id
      FROM payroll_salary_slips s JOIN payroll_employees pe ON pe.payroll_employee_id = s.payroll_employee_id
      WHERE s.payroll_slip_id = ${slipId};
    `;
    if (!s) throw new NotFoundException('Salary Slip not found.');
    if (Number(s.emp_id) !== viewerEmpId) {
      const v = await this.access.viewer(viewerEmpId);
      if (!v.isAdmin && !v.isAccounts) throw new ForbiddenException('You can see only your own Salary Slips.');
    } else if (s.status === 'GENERATED') {
      throw new ForbiddenException('This Salary Slip is not released yet.');
    }
    return s;
  }
}

function escHtml(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDay(ymdStr: string) {
  const [y, m, d] = ymdStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

function fmtStamp(d: Date | string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
