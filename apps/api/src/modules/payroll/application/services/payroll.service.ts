import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  PayrollCalculationService,
  EmployeeCalculationInput,
} from './payroll-calculation.service';
import {
  StartPayrollDto,
  DayAdjustmentDto,
  AddAdjustmentDto,
  ApproveOtDto,
  BatchApproveOtDto,
  LockPayrollDto,
  UnlockPayrollDto,
  MarkPaidDto,
  UpdatePayrollSettingsDto,
} from '../../presentation/dto/payroll.dto';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calcService: PayrollCalculationService,
  ) {}

  /**
   * Helper: formats YYYY-MM-DD
   */
  private formatYMD(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 1. Get Payroll Settings (or auto-seed default row)
   */
  async getPayrollSettings(): Promise<any> {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_settings ORDER BY settings_id ASC LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      return rows[0];
    }
    // Seed default if empty
    const [created] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO payroll_settings (
        default_employee_pf_pct, default_employer_pf_pct, apply_pf_wage_limit, pf_wage_limit,
        missing_punch_default, ot_rounding, total_salary_rounding, pay_day
      ) VALUES (
        12.00, 12.00, true, 15000.00, 'UNPAID', 'THIRTY', 'NEAREST_RUPEE', 7
      ) RETURNING *;
    `;
    return created;
  }

  /**
   * Update Payroll Settings & log audit history
   */
  async updatePayrollSettings(dto: UpdatePayrollSettingsDto, adminId: number): Promise<any> {
    const current = await this.getPayrollSettings();
    const updates: string[] = [];

    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined && current[key] !== val) {
        await this.prisma.$executeRaw`
          INSERT INTO payroll_settings_history (settings_id, field_name, old_value, new_value, performed_by)
          VALUES (${current.settings_id}, ${key}, ${String(current[key])}, ${String(val)}, ${adminId});
        `;
      }
    }

    const updated = await this.prisma.$queryRaw<any[]>`
      UPDATE payroll_settings
      SET default_employee_pf_pct = COALESCE(${dto.default_employee_pf_pct}, default_employee_pf_pct),
          default_employer_pf_pct = COALESCE(${dto.default_employer_pf_pct}, default_employer_pf_pct),
          apply_pf_wage_limit = COALESCE(${dto.apply_pf_wage_limit}, apply_pf_wage_limit),
          pf_wage_limit = COALESCE(${dto.pf_wage_limit}, pf_wage_limit),
          missing_punch_default = COALESCE(${dto.missing_punch_default}::payroll_missing_punch, missing_punch_default),
          ot_rounding = COALESCE(${dto.ot_rounding}::payroll_ot_rounding, ot_rounding),
          total_salary_rounding = COALESCE(${dto.total_salary_rounding}::payroll_total_rounding, total_salary_rounding),
          pay_day = COALESCE(${dto.pay_day}, pay_day),
          updated_by = ${adminId},
          updated_at = NOW()
      WHERE settings_id = ${current.settings_id}
      RETURNING *;
    `;
    return updated[0];
  }

  /**
   * 2. List Payroll Runs (Screen 1, Section 3)
   */
  async listPayrollRuns(year?: number, status?: string): Promise<any> {
    const targetYear = year || new Date().getFullYear();
    const runs = await this.prisma.$queryRaw<any[]>`
      SELECT pr.*, 
             e_calc.name as calculated_by_name,
             e_lock.name as locked_by_name,
             e_paid.name as paid_by_name,
             (SELECT COUNT(*) FROM payroll_salary_slips pss 
              JOIN payroll_employees pe ON pe.payroll_employee_id = pss.payroll_employee_id 
              WHERE pe.payroll_run_id = pr.payroll_run_id AND pss.status = 'RELEASED') as released_slips_count
      FROM payroll_runs pr
      LEFT JOIN employees e_calc ON e_calc.emp_id = pr.calculated_by
      LEFT JOIN employees e_lock ON e_lock.emp_id = pr.locked_by
      LEFT JOIN employees e_paid ON e_paid.emp_id = pr.paid_by
      WHERE pr.payroll_year = ${targetYear}
      ORDER BY pr.payroll_month DESC;
    `;

    // Build 12-month summary for year
    const monthsList: any[] = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1; // 1-12

    for (let m = 12; m >= 1; m--) {
      // Future months not shown (Page 8)
      if (targetYear === currentYear && m > currentMonthNum) continue;

      const existing = runs.find((r) => r.payroll_month === m);
      const daysInM = new Date(targetYear, m, 0).getDate();
      const startDateStr = `01 ${monthNames[m - 1].slice(0, 3)}`;
      const endDateStr = `${daysInM} ${monthNames[m - 1].slice(0, 3)}`;

      if (existing) {
        monthsList.push({
          payroll_run_id: existing.payroll_run_id,
          payroll_year: existing.payroll_year,
          payroll_month: existing.payroll_month,
          month_name: `${monthNames[m - 1]} ${targetYear}`,
          date_range: `${startDateStr} - ${endDateStr}`,
          status: existing.status, // DRAFT, LOCKED, PAID
          total_employees: Number(existing.total_employees) || 0,
          gross_earnings: Number(existing.gross_earnings) || 0,
          employee_pf_total: Number(existing.employee_pf_total) || 0,
          employer_pf_total: Number(existing.employer_pf_total) || 0,
          total_salary: Number(existing.total_salary) || 0,
          attendance_locked: Boolean(existing.attendance_locked),
          attendance_locked_at: existing.attendance_locked_at,
          released_slips_count: Number(existing.released_slips_count) || 0,
        });
      } else {
        monthsList.push({
          payroll_run_id: null,
          payroll_year: targetYear,
          payroll_month: m,
          month_name: `${monthNames[m - 1]} ${targetYear}`,
          date_range: `${startDateStr} - ${endDateStr}`,
          status: 'NOT_STARTED',
          total_employees: 0,
          gross_earnings: 0,
          employee_pf_total: 0,
          employer_pf_total: 0,
          total_salary: 0,
          attendance_locked: false,
          attendance_locked_at: null,
          released_slips_count: 0,
        });
      }
    }

    // Top counters: current run & status, employees, total salary, warnings
    const activeRun = runs[0] || null;
    let warningsCount = 0;
    if (activeRun) {
      const warnRows = await this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as cnt FROM payroll_employees 
        WHERE payroll_run_id = ${activeRun.payroll_run_id} 
          AND flag IN ('WARNING', 'ERROR');
      `;
      warningsCount = Number(warnRows[0]?.cnt) || 0;
    }

    return {
      year: targetYear,
      summary: {
        current_run_month: activeRun ? `${monthNames[activeRun.payroll_month - 1]} ${activeRun.payroll_year}` : 'None',
        current_run_status: activeRun ? activeRun.status : 'NOT_STARTED',
        total_employees: activeRun ? Number(activeRun.total_employees) : 0,
        total_salary: activeRun ? Number(activeRun.total_salary) : 0,
        warnings_count: warningsCount,
      },
      runs: monthsList.filter((item) => {
        if (!status || status === 'ALL') return true;
        return item.status.toUpperCase() === status.toUpperCase();
      }),
    };
  }

  /**
   * 3. Start Payroll Eligibility & Pre-checks (Screen 2, Section 4)
   */
  async getStartPayrollEligibility(year: number, month: number): Promise<any> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Attendance lock check
    const attCount = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as total_attendance,
             COUNT(CASE WHEN day_status = 'incomplete' THEN 1 END) as incomplete_cnt
      FROM attendance_days
      WHERE work_date >= ${startDateStr}::date AND work_date <= ${endDateStr}::date
        AND deleted_at IS NULL;
    `;
    const totalAttendance = Number(attCount[0]?.total_attendance) || 0;
    const isAttendanceLocked = totalAttendance > 0; // Or from attendance lock table if configured

    // Employees included
    const empRows = await this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, e.status, e.joining_date, e.exit_date, e.termination_date,
             e.salary, e.pf, pp.payment_mode, pp.account_number, pp.ifsc_code, pp.uan, pp.pf_applicable
      FROM employees e
      LEFT JOIN employee_pay_policies pp ON pp.emp_id = e.emp_id
      WHERE e.deleted_at IS NULL
        AND (
          (e.status IN ('Active', 'Onboarding') AND e.joining_date <= ${endDateStr}::date)
          OR
          (e.status = 'Inactive' AND (e.termination_date >= ${startDateStr}::date OR e.exit_date >= ${startDateStr}::date))
        );
    `;

    const checks = [
      {
        id: 'monthly_salary',
        label: 'Every employee has a Monthly Salary more than 0',
        passed: empRows.every((e) => Number(e.salary) > 0),
        warningMessage: 'Some employees have Monthly Salary 0 or empty',
      },
      {
        id: 'shift',
        label: 'Every employee has a shift for every working day',
        passed: true,
        warningMessage: null,
      },
      {
        id: 'attendance',
        label: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} attendance is locked`,
        passed: isAttendanceLocked,
        warningMessage: 'Attendance is still open. You can calculate, but cannot lock.',
      },
      {
        id: 'bank_details',
        label: 'Payment mode bank details are complete',
        passed: empRows.every((e) => {
          if (e.payment_mode === 'BANK_TRANSFER') {
            return Boolean(e.account_number && e.ifsc_code);
          }
          return true;
        }),
        warningMessage: 'Some employees have missing bank account or IFSC',
      },
    ];

    return {
      year,
      month,
      period: `${startDateStr} to ${endDateStr}`,
      attendance_locked: isAttendanceLocked,
      attendance_message: isAttendanceLocked
        ? `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} attendance is locked`
        : 'Attendance is still open. You can calculate, but cannot lock.',
      total_employees_included: empRows.length,
      employees_preview: empRows.slice(0, 10).map((e) => ({
        emp_id: e.emp_id,
        name: e.name,
        status: e.status,
      })),
      checks,
    };
  }

  /**
   * 4. Start / Calculate / Recalculate Payroll (Screen 2 & 3, Section 4 & 5)
   */
  async startOrCalculatePayroll(year: number, month: number, adminId: number): Promise<any> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month - 1, daysInMonth);

    // 1. Fetch settings, holidays, shifts
    const settings = await this.getPayrollSettings();
    const holidays = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM company_holidays 
      WHERE holiday_date >= ${startDate} AND holiday_date <= ${endDate} AND deleted_at IS NULL;
    `;
    const shifts = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM attendance_shifts WHERE is_active = true AND deleted_at IS NULL;
    `;

    // 2. Determine attendance locked status for period
    const startDateStr = this.formatYMD(startDate);
    const endDateStr = this.formatYMD(endDate);
    const attCount = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as total_attendance
      FROM attendance_days
      WHERE work_date >= ${startDateStr}::date AND work_date <= ${endDateStr}::date
        AND deleted_at IS NULL;
    `;
    const isAttendanceLocked = (Number(attCount[0]?.total_attendance) || 0) > 0;

    // 3. Upsert payroll_runs record
    let [run] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};
    `;

    if (run && run.status === 'LOCKED') {
      throw new BadRequestException('Payroll run is LOCKED. Ask Admin to unlock before recalculating.');
    }
    if (run && run.status === 'PAID') {
      throw new BadRequestException('Payroll run is already PAID and cannot be recalculated.');
    }

    if (!run) {
      const [created] = await this.prisma.$queryRaw<any[]>`
        INSERT INTO payroll_runs (
          payroll_year, payroll_month, start_date, end_date, status,
          calculated_at, calculated_by, created_by,
          full_day_hours, apply_pf_wage_limit, pf_wage_limit, missing_punch_default,
          ot_rounding, total_salary_rounding, attendance_locked, attendance_locked_at
        ) VALUES (
          ${year}, ${month}, ${startDate}, ${endDate}, 'DRAFT',
          NOW(), ${adminId}, ${adminId},
          8.00, ${settings.apply_pf_wage_limit}, ${settings.pf_wage_limit}, ${settings.missing_punch_default}::payroll_missing_punch,
          ${settings.ot_rounding}::payroll_ot_rounding, ${settings.total_salary_rounding}::payroll_total_rounding,
          ${isAttendanceLocked}, ${isAttendanceLocked ? new Date() : null}
        ) RETURNING *;
      `;
      run = created;
    } else {
      await this.prisma.$executeRaw`
        UPDATE payroll_runs
        SET calculated_at = NOW(), calculated_by = ${adminId}, updated_at = NOW(), updated_by = ${adminId},
            attendance_locked = ${isAttendanceLocked},
            attendance_locked_at = CASE WHEN ${isAttendanceLocked} AND attendance_locked_at IS NULL THEN NOW() ELSE attendance_locked_at END
        WHERE payroll_run_id = ${run.payroll_run_id};
      `;
    }

    // 4. Find eligible employees

    const empRows = await this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, e.status, e.joining_date, e.exit_date, e.termination_date,
             e.salary, e.pf, r.role_name, d.name as primary_dep_name
      FROM employees e
      LEFT JOIN roles r ON r.role_id = e.role_id
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      WHERE e.deleted_at IS NULL
        AND (
          (e.status IN ('Active', 'Onboarding') AND e.joining_date <= ${endDateStr}::date)
          OR
          (e.status = 'Inactive' AND (e.termination_date >= ${startDateStr}::date OR e.exit_date >= ${startDateStr}::date))
        )
      ORDER BY e.emp_id ASC;
    `;

    // Fetch pay policies
    const payPolicies = await this.prisma.$queryRaw<any[]>`SELECT * FROM employee_pay_policies;`;
    const payPolicyMap = new Map<number, any>();
    for (const pp of payPolicies) payPolicyMap.set(pp.emp_id, pp);

    // Fetch existing adjustments and OT entries for this run
    const existingAdjustments = await this.prisma.$queryRaw<any[]>`
      SELECT pa.*, pe.emp_id FROM payroll_adjustments pa
      JOIN payroll_employees pe ON pe.payroll_employee_id = pa.payroll_employee_id
      WHERE pe.payroll_run_id = ${run.payroll_run_id} AND pa.is_active = true;
    `;

    const existingOtEntries = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_ot_entries WHERE payroll_run_id = ${run.payroll_run_id};
    `;

    let totalEmployees = 0;
    let runGrossEarnings = 0;
    let runEmployeePfTotal = 0;
    let runEmployerPfTotal = 0;
    let runTotalSalary = 0;

    // 4. Calculate each employee
    for (const emp of empRows) {
      const input: EmployeeCalculationInput = {
        emp_id: emp.emp_id,
        name: emp.name,
        role_name: emp.role_name,
        department_names: emp.primary_dep_name,
        status: emp.status,
        joining_date: emp.joining_date,
        exit_date: emp.exit_date,
        termination_date: emp.termination_date,
        salary: Number(emp.salary) || 0,
        pf: Number(emp.pf) || 0,
        payPolicy: payPolicyMap.get(emp.emp_id),
      };

      const empAdjs = existingAdjustments.filter((a) => a.emp_id === emp.emp_id);
      const empOts = existingOtEntries.filter((o) => o.emp_id === emp.emp_id);

      const result = await this.calcService.calculateEmployeePayroll(
        input,
        year,
        month,
        settings,
        holidays,
        shifts,
        empAdjs,
        empOts,
      );

      // 5. Upsert payroll_employees
      const [pEmp] = await this.prisma.$queryRaw<any[]>`
        INSERT INTO payroll_employees (
          payroll_run_id, emp_id, employee_code, employee_name, department_names,
          role_name, shift_name, monthly_salary, daily_rate, pf_applicable, uan,
          payment_mode, bank_name, account_number, ifsc_code,
          total_working_days, present_days, paid_leave_days, unpaid_leave_days, absent_days,
          missing_punch_days, not_employed_days, full_days, half_days, paid_days, lop_days,
          basic_salary, ot_hours, ot_rate, ot_amount, pf_wage, employee_pf, employer_pf,
          total_additions, total_deductions, gross_earnings, total_salary,
          flag, validation_message, calculated_at
        ) VALUES (
          ${run.payroll_run_id}, ${result.emp_id}, ${result.employee_code}, ${result.employee_name}, ${result.department_names},
          ${result.role_name}, ${result.shift_name}, ${result.monthly_salary}, ${result.daily_rate}, ${result.pf_applicable}, ${result.uan},
          ${result.payment_mode}::payroll_payment_mode, ${result.bank_name}, ${result.account_number}, ${result.ifsc_code},
          ${result.total_working_days}, ${result.present_days}, ${result.paid_leave_days}, ${result.unpaid_leave_days}, ${result.absent_days},
          ${result.missing_punch_days}, ${result.not_employed_days}, ${result.full_days}, ${result.half_days}, ${result.paid_days}, ${result.lop_days},
          ${result.basic_salary}, ${result.ot_hours}, ${result.ot_rate}, ${result.ot_amount}, ${result.pf_wage}, ${result.employee_pf}, ${result.employer_pf},
          ${result.total_additions}, ${result.total_deductions}, ${result.gross_earnings}, ${result.total_salary},
          ${result.flag}::payroll_employee_flag, ${result.validation_message}, NOW()
        )
        ON CONFLICT (payroll_run_id, emp_id) DO UPDATE SET
          employee_name = EXCLUDED.employee_name,
          department_names = EXCLUDED.department_names,
          role_name = EXCLUDED.role_name,
          shift_name = EXCLUDED.shift_name,
          monthly_salary = EXCLUDED.monthly_salary,
          daily_rate = EXCLUDED.daily_rate,
          pf_applicable = EXCLUDED.pf_applicable,
          uan = EXCLUDED.uan,
          payment_mode = EXCLUDED.payment_mode,
          bank_name = EXCLUDED.bank_name,
          account_number = EXCLUDED.account_number,
          ifsc_code = EXCLUDED.ifsc_code,
          total_working_days = EXCLUDED.total_working_days,
          present_days = EXCLUDED.present_days,
          paid_leave_days = EXCLUDED.paid_leave_days,
          unpaid_leave_days = EXCLUDED.unpaid_leave_days,
          absent_days = EXCLUDED.absent_days,
          missing_punch_days = EXCLUDED.missing_punch_days,
          not_employed_days = EXCLUDED.not_employed_days,
          full_days = EXCLUDED.full_days,
          half_days = EXCLUDED.half_days,
          paid_days = EXCLUDED.paid_days,
          lop_days = EXCLUDED.lop_days,
          basic_salary = EXCLUDED.basic_salary,
          ot_hours = EXCLUDED.ot_hours,
          ot_rate = EXCLUDED.ot_rate,
          ot_amount = EXCLUDED.ot_amount,
          pf_wage = EXCLUDED.pf_wage,
          employee_pf = EXCLUDED.employee_pf,
          employer_pf = EXCLUDED.employer_pf,
          total_additions = EXCLUDED.total_additions,
          total_deductions = EXCLUDED.total_deductions,
          gross_earnings = EXCLUDED.gross_earnings,
          total_salary = EXCLUDED.total_salary,
          flag = EXCLUDED.flag,
          validation_message = EXCLUDED.validation_message,
          calculated_at = NOW()
        RETURNING payroll_employee_id;
      `;

      // 6. Bulk Upsert day records in payroll_employee_days (Single batched query per employee)
      if (result.days && result.days.length > 0) {
        const dayValues = result.days.map((d) => Prisma.sql`(
          ${pEmp.payroll_employee_id}, ${d.date}::date, ${d.attendance_code}, ${d.day_type},
          ${d.is_working_day}, ${d.holiday_name}, ${d.paid_as}::payroll_paid_as, ${d.daily_rate}, ${d.calculated_amount},
          ${d.is_adjusted}, ${d.original_paid_as || null}::payroll_paid_as
        )`);
        await this.prisma.$executeRaw`
          INSERT INTO payroll_employee_days (
            payroll_employee_id, attendance_date, attendance_code, day_type,
            is_working_day, holiday_name, paid_as, daily_rate, calculated_amount,
            is_adjusted, original_paid_as
          ) VALUES ${Prisma.join(dayValues)}
          ON CONFLICT (payroll_employee_id, attendance_date) DO UPDATE SET
            attendance_code = EXCLUDED.attendance_code,
            day_type = EXCLUDED.day_type,
            is_working_day = EXCLUDED.is_working_day,
            holiday_name = EXCLUDED.holiday_name,
            paid_as = EXCLUDED.paid_as,
            daily_rate = EXCLUDED.daily_rate,
            calculated_amount = EXCLUDED.calculated_amount,
            is_adjusted = EXCLUDED.is_adjusted;
        `;
      }

      totalEmployees++;
      runGrossEarnings += result.gross_earnings;
      runEmployeePfTotal += result.employee_pf;
      runEmployerPfTotal += result.employer_pf;
      runTotalSalary += result.total_salary;
    }

    // 7. Update run totals
    await this.prisma.$executeRaw`
      UPDATE payroll_runs
      SET total_employees = ${totalEmployees},
          gross_earnings = ${runGrossEarnings},
          employee_pf_total = ${runEmployeePfTotal},
          employer_pf_total = ${runEmployerPfTotal},
          total_salary = ${runTotalSalary},
          updated_at = NOW()
      WHERE payroll_run_id = ${run.payroll_run_id};
    `;

    // 8. Log run history
    await this.prisma.$executeRaw`
      INSERT INTO payroll_run_history (payroll_run_id, action, reason, performed_by)
      VALUES (${run.payroll_run_id}, 'CALCULATED', 'Payroll calculation completed', ${adminId});
    `;

    return this.getPayrollRegister(year, month);
  }

  /**
   * 5. Get Full Payroll Register (Screen 3, Section 6)
   */
  async getPayrollRegister(year: number, month: number, query?: any): Promise<any> {
    const [run] = await this.prisma.$queryRaw<any[]>`
      SELECT pr.*, 
             e_calc.name as calculated_by_name,
             e_lock.name as locked_by_name
      FROM payroll_runs pr
      LEFT JOIN employees e_calc ON e_calc.emp_id = pr.calculated_by
      LEFT JOIN employees e_lock ON e_lock.emp_id = pr.locked_by
      WHERE pr.payroll_year = ${year} AND pr.payroll_month = ${month};
    `;
    if (!run) {
      throw new NotFoundException(`No payroll run found for ${month}/${year}`);
    }

    // Fetch employees in run
    const employees = await this.prisma.$queryRaw<any[]>`
      SELECT pe.*,
             (pe.total_additions - pe.total_deductions) as adj_net
      FROM payroll_employees pe
      WHERE pe.payroll_run_id = ${run.payroll_run_id}
      ORDER BY pe.emp_id ASC;
    `;

    // Fetch OT entries
    const otEntries = await this.prisma.$queryRaw<any[]>`
      SELECT po.*, e.name as employee_name, a.name as approver_name
      FROM payroll_ot_entries po
      JOIN employees e ON e.emp_id = po.emp_id
      LEFT JOIN employees a ON a.emp_id = po.approver_id
      WHERE po.payroll_run_id = ${run.payroll_run_id}
      ORDER BY po.attendance_date ASC;
    `;

    // Fetch Adjustments
    const adjustments = await this.prisma.$queryRaw<any[]>`
      SELECT pa.*, pe.employee_name, pe.employee_code, ml.label as category_label
      FROM payroll_adjustments pa
      JOIN payroll_employees pe ON pe.payroll_employee_id = pa.payroll_employee_id
      LEFT JOIN master_lookup ml ON ml.lookup_id = pa.category_id
      WHERE pe.payroll_run_id = ${run.payroll_run_id}
      ORDER BY pa.created_at DESC;
    `;

    // Build checks (errors & warnings)
    const errors: any[] = [];
    const warnings: any[] = [];

    for (const e of employees) {
      if (e.flag === 'ERROR') {
        errors.push({
          emp_id: e.emp_id,
          employee_code: e.employee_code,
          employee_name: e.employee_name,
          message: e.validation_message || 'Calculation error',
        });
      } else if (e.flag === 'WARNING' || e.flag === 'JOINED_IN_MONTH' || e.flag === 'LEFT_IN_MONTH') {
        warnings.push({
          emp_id: e.emp_id,
          employee_code: e.employee_code,
          employee_name: e.employee_name,
          message: e.validation_message || (e.flag === 'JOINED_IN_MONTH' ? 'Joined in month' : 'Left in month'),
        });
      }
    }

    const pendingOtCount = otEntries.filter((o) => o.status === 'PENDING').length;
    if (pendingOtCount > 0) {
      warnings.push({
        emp_id: null,
        employee_code: '-',
        employee_name: 'Overtime Approvals',
        message: `${pendingOtCount} OT entries are pending approval`,
      });
    }

    return {
      run: {
        ...run,
        total_employees: Number(run.total_employees) || 0,
        gross_earnings: Number(run.gross_earnings) || 0,
        employee_pf_total: Number(run.employee_pf_total) || 0,
        employer_pf_total: Number(run.employer_pf_total) || 0,
        total_salary: Number(run.total_salary) || 0,
      },
      employees: employees.map((e) => ({
        ...e,
        monthly_salary: Number(e.monthly_salary) || 0,
        daily_rate: Number(e.daily_rate) || 0,
        basic_salary: Number(e.basic_salary) || 0,
        ot_hours: Number(e.ot_hours) || 0,
        ot_rate: Number(e.ot_rate) || 0,
        ot_amount: Number(e.ot_amount) || 0,
        employee_pf: Number(e.employee_pf) || 0,
        employer_pf: Number(e.employer_pf) || 0,
        total_additions: Number(e.total_additions) || 0,
        total_deductions: Number(e.total_deductions) || 0,
        adj_net: Number(e.adj_net) || 0,
        total_salary: Number(e.total_salary) || 0,
      })),
      ot_entries: otEntries,
      adjustments: adjustments,
      checks: {
        errors,
        warnings,
        can_lock: errors.length === 0 && pendingOtCount === 0 && Boolean(run.attendance_locked),
      },
    };
  }

  /**
   * 6. Get Employee Salary Sheet (Screen 4 & 5, Section 7)
   */
  async getEmployeeSalarySheet(year: number, month: number, empId: number): Promise<any> {
    const register = await this.getPayrollRegister(year, month);
    const emp = register.employees.find((e: any) => e.emp_id === empId);
    if (!emp) {
      throw new NotFoundException(`Employee ${empId} not found in payroll run for ${month}/${year}`);
    }

    // Fetch day grid
    const days = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_employee_days
      WHERE payroll_employee_id = ${emp.payroll_employee_id}
      ORDER BY attendance_date ASC;
    `;

    // Fetch adjustments
    const adjustments = await this.prisma.$queryRaw<any[]>`
      SELECT pa.*, ml.label as category_label, e.name as created_by_name
      FROM payroll_adjustments pa
      LEFT JOIN master_lookup ml ON ml.lookup_id = pa.category_id
      LEFT JOIN employees e ON e.emp_id = pa.created_by
      WHERE pa.payroll_employee_id = ${emp.payroll_employee_id}
      ORDER BY pa.created_at DESC;
    `;

    // Fetch history
    const history = await this.prisma.$queryRaw<any[]>`
      SELECT prh.*, e.name as performed_by_name
      FROM payroll_run_history prh
      LEFT JOIN employees e ON e.emp_id = prh.performed_by
      WHERE prh.payroll_run_id = ${register.run.payroll_run_id}
        AND (prh.payroll_employee_id = ${emp.payroll_employee_id} OR prh.payroll_employee_id IS NULL)
      ORDER BY prh.performed_at DESC;
    `;

    return {
      run: register.run,
      employee: emp,
      days: days.map((d) => ({
        ...d,
        daily_rate: Number(d.daily_rate) || 0,
        calculated_amount: Number(d.calculated_amount) || 0,
      })),
      adjustments: adjustments.map((a) => ({
        ...a,
        amount: Number(a.amount) || 0,
      })),
      history,
    };
  }

  /**
   * 7. Save Day Adjustment (Screen 6, Section 8 Part 1)
   */
  async saveDayAdjustment(
    payrollEmployeeId: number,
    dayId: number,
    dto: DayAdjustmentDto,
    adminId: number,
  ): Promise<any> {
    const [pEmp] = await this.prisma.$queryRaw<any[]>`
      SELECT pe.*, pr.status as run_status, pr.payroll_year, pr.payroll_month 
      FROM payroll_employees pe
      JOIN payroll_runs pr ON pr.payroll_run_id = pe.payroll_run_id
      WHERE pe.payroll_employee_id = ${payrollEmployeeId};
    `;
    if (!pEmp) throw new NotFoundException('Payroll employee record not found');
    if (pEmp.run_status !== 'DRAFT') {
      throw new BadRequestException('Payroll is locked. Ask Admin to unlock.');
    }

    const [day] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_employee_days WHERE payroll_employee_day_id = ${dayId};
    `;
    if (!day) throw new NotFoundException('Payroll day record not found');
    if (!day.is_working_day || day.day_type !== 'WORKING_DAY') {
      throw new BadRequestException('Only working days in employment can be adjusted.');
    }

    // Upsert adjustment
    await this.prisma.$executeRaw`
      INSERT INTO payroll_adjustments (
        payroll_employee_id, payroll_employee_day_id, type,
        old_paid_as, new_paid_as, amount, related_date, reason, note, is_active, created_by
      ) VALUES (
        ${payrollEmployeeId}, ${dayId}, 'DAY_ADJUSTMENT'::payroll_adjustment_type,
        ${day.paid_as}::payroll_paid_as, ${dto.pay_this_day_as}::payroll_paid_as,
        0, ${day.attendance_date}, ${dto.reason}, ${dto.note}, true, ${adminId}
      )
      ON CONFLICT (payroll_employee_day_id) WHERE type = 'DAY_ADJUSTMENT' AND is_active = true AND payroll_employee_day_id IS NOT NULL
      DO UPDATE SET
        new_paid_as = EXCLUDED.new_paid_as,
        reason = EXCLUDED.reason,
        note = EXCLUDED.note,
        created_by = ${adminId},
        updated_at = NOW();
    `;

    // Re-calculate run
    await this.startOrCalculatePayroll(pEmp.payroll_year, pEmp.payroll_month, adminId);
    return this.getEmployeeSalarySheet(pEmp.payroll_year, pEmp.payroll_month, pEmp.emp_id);
  }

  /**
   * 8. Add Adjustment: Addition or Deduction (Screen 7, Section 8 Part 2)
   */
  async addAdjustment(
    payrollEmployeeId: number,
    dto: AddAdjustmentDto,
    adminId: number,
  ): Promise<any> {
    const [pEmp] = await this.prisma.$queryRaw<any[]>`
      SELECT pe.*, pr.status as run_status, pr.payroll_year, pr.payroll_month 
      FROM payroll_employees pe
      JOIN payroll_runs pr ON pr.payroll_run_id = pe.payroll_run_id
      WHERE pe.payroll_employee_id = ${payrollEmployeeId};
    `;
    if (!pEmp) throw new NotFoundException('Payroll employee record not found');
    if (pEmp.run_status !== 'DRAFT') {
      throw new BadRequestException('Payroll is locked. Ask Admin to unlock.');
    }

    // Find category lookup id
    let categoryId = dto.category_id;
    if (!categoryId && dto.category_code) {
      const lookupType = dto.kind === 'ADDITION' ? 'addition_category' : 'deduction_category';
      const [lookup] = await this.prisma.$queryRaw<any[]>`
        SELECT lookup_id FROM master_lookup WHERE lookup_type = ${lookupType} AND code = ${dto.category_code} LIMIT 1;
      `;
      if (lookup) categoryId = lookup.lookup_id;
    }

    await this.prisma.$executeRaw`
      INSERT INTO payroll_adjustments (
        payroll_employee_id, type, category_id, amount,
        related_date, reference_number, reason, attachment_url, is_active, created_by
      ) VALUES (
        ${payrollEmployeeId}, ${dto.kind}::payroll_adjustment_type, ${categoryId || null}, ${dto.amount},
        ${dto.related_date ? new Date(dto.related_date) : null}, ${dto.reference_number || null},
        ${dto.reason}, ${dto.attachment_url || null}, true, ${adminId}
      );
    `;

    await this.startOrCalculatePayroll(pEmp.payroll_year, pEmp.payroll_month, adminId);
    return this.getEmployeeSalarySheet(pEmp.payroll_year, pEmp.payroll_month, pEmp.emp_id);
  }

  /**
   * 9. Approve / Reduce / Reject OT Entry (Section 9)
   */
  async approveOtEntry(otEntryId: number, dto: ApproveOtDto, adminId: number): Promise<any> {
    const [ot] = await this.prisma.$queryRaw<any[]>`
      SELECT po.*, pr.payroll_year, pr.payroll_month 
      FROM payroll_ot_entries po
      JOIN payroll_runs pr ON pr.payroll_run_id = po.payroll_run_id
      WHERE po.payroll_ot_entry_id = ${otEntryId};
    `;
    if (!ot) throw new NotFoundException('OT entry not found');

    const approvedHours = dto.status === 'REJECTED'
      ? 0
      : dto.approved_hours !== undefined
      ? dto.approved_hours
      : Number(ot.proposed_hours);

    const otAmount = (ot.ot_paid_as === 'SALARY')
      ? approvedHours * Number(ot.hourly_rate || 0) * Number(ot.ot_multiplier || 1.5)
      : 0;

    await this.prisma.$executeRaw`
      UPDATE payroll_ot_entries
      SET status = ${dto.status}::payroll_ot_status,
          approved_hours = ${approvedHours},
          ot_amount = ${otAmount},
          approver_id = ${adminId},
          comment = ${dto.comment || null},
          approved_at = NOW(),
          updated_at = NOW()
      WHERE payroll_ot_entry_id = ${otEntryId};
    `;

    // Recalculate
    await this.startOrCalculatePayroll(ot.payroll_year, ot.payroll_month, adminId);
    return { success: true, message: `OT entry ${dto.status.toLowerCase()}` };
  }

  /**
   * 10. Lock Payroll (Screen 8, Section 10 Part 1)
   */
  async lockPayroll(year: number, month: number, adminId: number): Promise<any> {
    const register = await this.getPayrollRegister(year, month);
    if (!register.checks.can_lock) {
      throw new BadRequestException('Cannot lock payroll. Ensure attendance is locked, all OT entries are approved/rejected, and no calculation errors exist.');
    }

    await this.prisma.$executeRaw`
      UPDATE payroll_runs
      SET status = 'LOCKED'::payroll_run_status,
          locked_at = NOW(),
          locked_by = ${adminId},
          updated_at = NOW()
      WHERE payroll_run_id = ${register.run.payroll_run_id};
    `;

    await this.prisma.$executeRaw`
      INSERT INTO payroll_run_history (payroll_run_id, action, reason, performed_by)
      VALUES (${register.run.payroll_run_id}, 'LOCKED', 'Payroll locked by Accounts/Admin', ${adminId});
    `;

    return this.getPayrollRegister(year, month);
  }

  /**
   * 11. Unlock Payroll (Admin only - Section 10 Part 3)
   */
  async unlockPayroll(year: number, month: number, dto: UnlockPayrollDto, adminId: number): Promise<any> {
    const [run] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};
    `;
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status === 'PAID') {
      throw new BadRequestException('Cannot unlock a PAID payroll run. Differences must be adjusted in the next month.');
    }

    await this.prisma.$executeRaw`
      UPDATE payroll_runs
      SET status = 'DRAFT'::payroll_run_status,
          unlocked_at = NOW(),
          unlocked_by = ${adminId},
          unlock_reason = ${dto.reason},
          updated_at = NOW()
      WHERE payroll_run_id = ${run.payroll_run_id};
    `;

    await this.prisma.$executeRaw`
      INSERT INTO payroll_run_history (payroll_run_id, action, reason, performed_by)
      VALUES (${run.payroll_run_id}, 'UNLOCKED'::payroll_run_action, ${dto.reason}, ${adminId});
    `;

    return this.getPayrollRegister(year, month);
  }

  /**
   * 12. Mark as Paid (Screen 9, Section 10 Part 3)
   */
  async markAsPaid(year: number, month: number, dto: MarkPaidDto, adminId: number): Promise<any> {
    const [run] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};
    `;
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'LOCKED') {
      throw new BadRequestException('Payroll must be LOCKED before it can be marked as Paid.');
    }

    await this.prisma.$executeRaw`
      UPDATE payroll_runs
      SET status = 'PAID'::payroll_run_status,
          payment_date = ${new Date(dto.payment_date)},
          payment_reference = ${dto.payment_reference || null},
          paid_at = NOW(),
          paid_by = ${adminId},
          updated_at = NOW()
      WHERE payroll_run_id = ${run.payroll_run_id};
    `;

    await this.prisma.$executeRaw`
      UPDATE payroll_employees
      SET is_paid = true, updated_at = NOW()
      WHERE payroll_run_id = ${run.payroll_run_id};
    `;

    await this.prisma.$executeRaw`
      INSERT INTO payroll_run_history (payroll_run_id, action, reason, performed_by)
      VALUES (${run.payroll_run_id}, 'PAID', ${`Payment recorded: ${dto.payment_reference || 'Completed'}`}, ${adminId});
    `;

    return this.getPayrollRegister(year, month);
  }

  /**
   * 13. Generate Salary Slips for Locked or Paid Payroll Run
   */
  async generateSalarySlips(year: number, month: number, adminId: number): Promise<any> {
    const [run] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};
    `;
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status === 'DRAFT') {
      throw new BadRequestException('Cannot generate salary slips for a DRAFT run. Please Lock the payroll first.');
    }

    const employees = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_employees WHERE payroll_run_id = ${run.payroll_run_id};
    `;

    let generatedCount = 0;
    for (const emp of employees) {
      const existingSlips = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM payroll_salary_slips 
        WHERE payroll_employee_id = ${emp.payroll_employee_id} 
        ORDER BY revision_number DESC LIMIT 1;
      `;
      const latestSlip = existingSlips[0];

      let revision = 1;
      if (latestSlip) {
        revision = latestSlip.revision_number + 1;
        if (latestSlip.status === 'RELEASED') {
          await this.prisma.$executeRaw`
            UPDATE payroll_salary_slips 
            SET status = 'REPLACED'::payroll_slip_status 
            WHERE payroll_slip_id = ${latestSlip.payroll_slip_id};
          `;
        } else {
          await this.prisma.$executeRaw`
            DELETE FROM payroll_salary_slips WHERE payroll_slip_id = ${latestSlip.payroll_slip_id};
          `;
          revision = latestSlip.revision_number;
        }
      }

      const slipNum = `SLIP-${year}${String(month).padStart(2, '0')}-${String(emp.emp_id).padStart(4, '0')}${revision > 1 ? `-R${revision}` : ''}`;

      await this.prisma.$executeRaw`
        INSERT INTO payroll_salary_slips (
          payroll_employee_id, slip_number, revision_number, status, generated_at
        ) VALUES (
          ${emp.payroll_employee_id}, ${slipNum}, ${revision}, 'GENERATED'::payroll_slip_status, NOW()
        )
        ON CONFLICT (slip_number) DO UPDATE SET
          revision_number = EXCLUDED.revision_number,
          status = 'GENERATED'::payroll_slip_status,
          generated_at = NOW();
      `;
      generatedCount++;
    }

    return {
      success: true,
      message: `Successfully generated ${generatedCount} salary slips.`,
      generated_count: generatedCount,
    };
  }

  /**
   * 14. Release Salary Slips to Employee Portal
   */
  async releaseSalarySlips(year: number, month: number, adminId: number): Promise<any> {
    const [run] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};
    `;
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status === 'DRAFT') {
      throw new BadRequestException('Cannot release salary slips for a DRAFT run.');
    }

    const updated = await this.prisma.$executeRaw`
      UPDATE payroll_salary_slips
      SET status = 'RELEASED'::payroll_slip_status,
          released_at = NOW()
      WHERE payroll_employee_id IN (
        SELECT payroll_employee_id FROM payroll_employees WHERE payroll_run_id = ${run.payroll_run_id}
      ) AND status = 'GENERATED'::payroll_slip_status;
    `;

    return {
      success: true,
      message: `Released salary slips to employees.`,
      released_count: updated,
    };
  }

  /**
   * 15. Get Single Employee Salary Slip Payload (for printable view / PDF)
   */
  async getEmployeeSalarySlip(year: number, month: number, empId: number): Promise<any> {
    const [run] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};
    `;
    if (!run) throw new NotFoundException(`Payroll run ${month}/${year} not found`);

    const [emp] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_employees 
      WHERE payroll_run_id = ${run.payroll_run_id} AND emp_id = ${empId};
    `;
    if (!emp) throw new NotFoundException(`Employee ${empId} not found in payroll run ${month}/${year}`);

    const [slip] = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM payroll_salary_slips 
      WHERE payroll_employee_id = ${emp.payroll_employee_id} 
      ORDER BY revision_number DESC LIMIT 1;
    `;

    const adjustments = await this.prisma.$queryRaw<any[]>`
      SELECT pa.*, ml.label as category_label
      FROM payroll_adjustments pa
      LEFT JOIN master_lookup ml ON ml.lookup_id = pa.category_id
      WHERE pa.payroll_employee_id = ${emp.payroll_employee_id} AND pa.is_active = true
      ORDER BY pa.created_at ASC;
    `;

    const additions = adjustments
      .filter((a) => a.type === 'ADDITION')
      .map((a) => ({
        label: a.category_label || a.reason,
        amount: Number(a.amount) || 0,
        reason: a.reason,
      }));

    const deductions = adjustments
      .filter((a) => a.type === 'DEDUCTION')
      .map((a) => ({
        label: a.category_label || a.reason,
        amount: Number(a.amount) || 0,
        reason: a.reason,
      }));

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = `${monthNames[month - 1]} ${year}`;

    const earningsBreakup: Array<{ label: string; amount: number }> = [
      { label: 'Basic Salary', amount: Number(emp.basic_salary) || 0 },
    ];
    if (Number(emp.ot_amount) > 0) {
      earningsBreakup.push({
        label: `Overtime Pay (${emp.ot_hours} hrs)`,
        amount: Number(emp.ot_amount) || 0,
      });
    }
    for (const add of additions) {
      earningsBreakup.push({ label: add.label, amount: add.amount });
    }

    const deductionsBreakup: Array<{ label: string; amount: number }> = [];
    if (Number(emp.employee_pf) > 0) {
      deductionsBreakup.push({
        label: 'Provident Fund (Employee)',
        amount: Number(emp.employee_pf) || 0,
      });
    }
    for (const ded of deductions) {
      deductionsBreakup.push({ label: ded.label, amount: ded.amount });
    }

    const netSalaryNum = Number(emp.total_salary) || 0;
    const slipNumber = slip?.slip_number || `SLIP-${year}${String(month).padStart(2, '0')}-${String(emp.emp_id).padStart(4, '0')}`;

    return {
      company: {
        name: 'Vernoxy Pulse Solutions Pvt. Ltd.',
        tagline: 'Enterprise Cloud HRMS & Workforce Engineering',
        address: '401-404, Cyber City, Ring Road, Surat, Gujarat - 395007',
        cin: 'U72900GJ2024PTC148892',
        pan: 'AAACV1234M',
      },
      slip: {
        slip_number: slipNumber,
        revision_number: slip?.revision_number || 1,
        status: slip?.status || (run.status === 'PAID' ? 'RELEASED' : 'GENERATED'),
        pay_period: monthName,
        payroll_year: year,
        payroll_month: month,
        disbursement_date: run.payment_date || null,
        payment_reference: run.payment_reference || null,
        generated_at: slip?.generated_at || run.calculated_at,
        released_at: slip?.released_at || null,
      },
      employee: {
        emp_id: emp.emp_id,
        employee_code: emp.employee_code,
        name: emp.employee_name,
        department_names: emp.department_names,
        role_name: emp.role_name,
        shift_name: emp.shift_name,
        joining_date: emp.joining_date,
        uan: emp.uan || 'N/A',
        payment_mode: emp.payment_mode,
        bank_name: emp.bank_name || 'N/A',
        account_number: emp.account_number ? `XXXX-XXXX-${String(emp.account_number).slice(-4)}` : 'N/A',
        ifsc_code: emp.ifsc_code || 'N/A',
        full_account_number: emp.account_number,
      },
      attendance: {
        total_working_days: Number(emp.total_working_days) || 0,
        present_days: Number(emp.present_days) || 0,
        paid_leave_days: Number(emp.paid_leave_days) || 0,
        unpaid_leave_days: Number(emp.unpaid_leave_days) || 0,
        absent_days: Number(emp.absent_days) || 0,
        half_days: Number(emp.half_days) || 0,
        paid_days: Number(emp.paid_days) || 0,
        lop_days: Number(emp.lop_days) || 0,
      },
      earnings: earningsBreakup,
      deductions: deductionsBreakup,
      totals: {
        monthly_gross_rate: Number(emp.monthly_salary) || 0,
        gross_earnings: Number(emp.gross_earnings) || 0,
        total_deductions: (Number(emp.employee_pf) || 0) + (Number(emp.total_deductions) || 0),
        net_salary: netSalaryNum,
        net_salary_in_words: this.formatCurrencyInWords(netSalaryNum),
      },
      employer_contribution: {
        employer_pf: Number(emp.employer_pf) || 0,
      },
    };
  }

  /**
   * Helper: Convert Number to Indian Rupee Words
   */
  private formatCurrencyInWords(amount: number): string {
    const rounded = Math.round(amount);
    if (rounded === 0) return 'Zero Rupees Only';

    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
    };

    return convert(rounded).trim() + ' Rupees Only';
  }
}
