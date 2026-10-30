import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

export interface EmployeeCalculationInput {
  emp_id: number;
  name: string;
  employee_code?: string;
  department_names?: string;
  role_name?: string;
  status: string;
  joining_date: Date;
  exit_date?: Date | null;
  termination_date?: Date | null;
  salary: number; // Monthly gross
  pf: number;
  payPolicy?: any;
}

export interface DayCalculationItem {
  date: string; // YYYY-MM-DD
  attendance_code: string; // P, HD, L, A, MP, WO, H
  day_type: string; // WORKING_DAY, WEEKLY_OFF, HOLIDAY, NOT_EMPLOYED
  is_working_day: boolean;
  holiday_name?: string | null;
  paid_as: 'FULL' | 'HALF' | 'UNPAID' | 'NOT_APPLICABLE';
  daily_rate: number;
  calculated_amount: number;
  is_adjusted: boolean;
  original_paid_as?: 'FULL' | 'HALF' | 'UNPAID' | 'NOT_APPLICABLE';
}

export interface EmployeeCalculationOutput {
  emp_id: number;
  employee_code: string;
  employee_name: string;
  department_names: string;
  role_name: string;
  shift_name: string;
  monthly_salary: number;
  daily_rate: number;
  pf_applicable: boolean;
  uan: string | null;
  payment_mode: string;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  total_working_days: number;
  present_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  absent_days: number;
  missing_punch_days: number;
  not_employed_days: number;
  full_days: number;
  half_days: number;
  paid_days: number;
  lop_days: number;
  basic_salary: number;
  ot_hours: number;
  ot_rate: number;
  ot_amount: number;
  pf_wage: number;
  employee_pf: number;
  employer_pf: number;
  total_additions: number;
  total_deductions: number;
  gross_earnings: number;
  total_salary: number;
  flag: 'NONE' | 'ERROR' | 'WARNING' | 'JOINED_IN_MONTH' | 'LEFT_IN_MONTH' | 'ADJUSTED';
  validation_message: string | null;
  days: DayCalculationItem[];
}

@Injectable()
export class PayrollCalculationService {
  private readonly logger = new Logger(PayrollCalculationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: round to 2 decimals
   */
  round2(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  /**
   * Helper: round to nearest integer rupee
   */
  roundRupee(num: number): number {
    return Math.round(num);
  }

  /**
   * Helper: formats YYYY-MM-DD
   */
  formatYMD(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calculate single employee's payroll for given month
   */
  async calculateEmployeePayroll(
    emp: EmployeeCalculationInput,
    year: number,
    month: number,
    settings: any,
    holidays: any[],
    shifts: any[],
    existingAdjustments: any[] = [],
    existingOtEntries: any[] = [],
  ): Promise<EmployeeCalculationOutput> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // 1. Shift & Weekly Off assignment
    const defaultShift = shifts.find((s) => s.is_default) || shifts[0] || {
      shift_id: 1,
      shift_name: 'General Shift',
      full_day_hours: 8.0,
      weekly_off_days: [0], // Sunday
    };
    const shift = defaultShift;
    const weeklyOffDays: number[] = Array.isArray(shift.weekly_off_days)
      ? shift.weekly_off_days
      : [0];
    const fullDayHours = Number(shift.full_day_hours) || 8.0;

    // 2. Fetch attendance days for this employee in the month
    const attendanceRecords = await this.prisma.$queryRaw<any[]>`
      SELECT attendance_id, work_date, check_in_at, check_out_at, day_status, production_minutes
      FROM attendance_days
      WHERE emp_id = ${emp.emp_id}
        AND work_date >= ${startDateStr}::date
        AND work_date <= ${endDateStr}::date
        AND deleted_at IS NULL
    `;
    const attendanceMap = new Map<string, any>();
    for (const rec of attendanceRecords) {
      attendanceMap.set(this.formatYMD(new Date(rec.work_date)), rec);
    }

    // 3. Holiday map
    const holidayMap = new Map<string, string>();
    for (const h of holidays) {
      holidayMap.set(this.formatYMD(new Date(h.holiday_date)), h.name);
    }

    // 4. Employee Dates
    const empJoiningStr = emp.joining_date ? this.formatYMD(new Date(emp.joining_date)) : '1970-01-01';
    const empTermDate = emp.termination_date || emp.exit_date;
    const empTermStr = empTermDate ? this.formatYMD(new Date(empTermDate)) : '2099-12-31';

    // 5. Build Day Grid
    const dayItems: DayCalculationItem[] = [];
    let totalWorkingDaysCount = 0;
    let presentDaysCount = 0;
    let paidLeaveDaysCount = 0;
    let unpaidLeaveDaysCount = 0;
    let absentDaysCount = 0;
    let missingPunchDaysCount = 0;
    let notEmployedDaysCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = this.formatYMD(dateObj);
      const dayOfWeek = dateObj.getDay();

      const isHoliday = holidayMap.has(dateStr);
      const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);
      const isBeforeJoining = dateStr < empJoiningStr;
      const isAfterTerm = dateStr > empTermStr;

      if (isBeforeJoining || isAfterTerm) {
        dayItems.push({
          date: dateStr,
          attendance_code: '-',
          day_type: 'NOT_EMPLOYED',
          is_working_day: true,
          holiday_name: null,
          paid_as: 'UNPAID',
          daily_rate: 0,
          calculated_amount: 0,
          is_adjusted: false,
        });
        totalWorkingDaysCount++;
        notEmployedDaysCount++;
        continue;
      }

      if (isHoliday) {
        dayItems.push({
          date: dateStr,
          attendance_code: 'H',
          day_type: 'HOLIDAY',
          is_working_day: false,
          holiday_name: holidayMap.get(dateStr) || 'Holiday',
          paid_as: 'NOT_APPLICABLE',
          daily_rate: 0,
          calculated_amount: 0,
          is_adjusted: false,
        });
        continue;
      }

      if (isWeeklyOff) {
        dayItems.push({
          date: dateStr,
          attendance_code: 'WO',
          day_type: 'WEEKLY_OFF',
          is_working_day: false,
          holiday_name: null,
          paid_as: 'NOT_APPLICABLE',
          daily_rate: 0,
          calculated_amount: 0,
          is_adjusted: false,
        });
        continue;
      }

      // Normal Working Day
      totalWorkingDaysCount++;
      const att = attendanceMap.get(dateStr);
      let code = 'A';
      let paidAs: 'FULL' | 'HALF' | 'UNPAID' = 'UNPAID';

      if (att) {
        const status = (att.day_status || '').toLowerCase();
        if (status === 'present' || status === 'completed') {
          code = 'P';
          paidAs = 'FULL';
          presentDaysCount++;
        } else if (status === 'half_day') {
          code = 'HD';
          paidAs = 'HALF';
        } else if (status === 'leave') {
          // Paid vs unpaid
          code = 'L';
          paidAs = 'FULL'; // Default paid leave
          paidLeaveDaysCount++;
        } else if (status === 'unpaid_leave' || status === 'lwp') {
          code = 'L';
          paidAs = 'UNPAID';
          unpaidLeaveDaysCount++;
        } else if (status === 'incomplete' || (att.check_in_at && !att.check_out_at)) {
          code = 'MP';
          missingPunchDaysCount++;
          paidAs = settings.missing_punch_default === 'FULL' ? 'FULL' : 'UNPAID';
        } else {
          code = 'A';
          paidAs = 'UNPAID';
          absentDaysCount++;
        }
      } else {
        code = 'A';
        paidAs = 'UNPAID';
        absentDaysCount++;
      }

      dayItems.push({
        date: dateStr,
        attendance_code: code,
        day_type: 'WORKING_DAY',
        is_working_day: true,
        holiday_name: null,
        paid_as: paidAs,
        daily_rate: 0,
        calculated_amount: 0,
        is_adjusted: false,
      });
    }

    // 6. Day Adjustments Application
    const empDayAdjustments = existingAdjustments.filter(
      (adj) => adj.type === 'DAY_ADJUSTMENT' && adj.is_active,
    );
    for (const adj of empDayAdjustments) {
      if (!adj.related_date) continue;
      const targetDateStr = this.formatYMD(new Date(adj.related_date));
      const dayItem = dayItems.find((d) => d.date === targetDateStr && d.is_working_day && d.day_type === 'WORKING_DAY');
      if (dayItem) {
        dayItem.original_paid_as = dayItem.paid_as;
        dayItem.paid_as = adj.new_paid_as || 'FULL';
        dayItem.is_adjusted = true;
      }
    }

    // 7. Calculate Counts & Basic Salary
    const monthlySalary = Number(emp.salary) || 0;
    const dailyRate = totalWorkingDaysCount > 0 ? this.round2(monthlySalary / totalWorkingDaysCount) : 0;

    let fullDaysCount = 0;
    let halfDaysCount = 0;

    for (const day of dayItems) {
      day.daily_rate = dailyRate;
      if (day.paid_as === 'FULL') {
        fullDaysCount += 1;
        day.calculated_amount = dailyRate;
      } else if (day.paid_as === 'HALF') {
        halfDaysCount += 1;
        day.calculated_amount = this.round2(dailyRate * 0.5);
      } else {
        day.calculated_amount = 0;
      }
    }

    const paidDays = this.round2(fullDaysCount + halfDaysCount * 0.5);
    const lopDays = Math.max(0, this.round2(totalWorkingDaysCount - notEmployedDaysCount - paidDays));
    const basicSalary = this.round2(fullDaysCount * dailyRate + halfDaysCount * dailyRate * 0.5);

    // 8. Overtime Calculation
    const payPolicy = emp.payPolicy || {};
    const otEligible = Boolean(payPolicy.ot_eligible);
    const otPaidAs = payPolicy.ot_paid_as || 'SALARY';
    let otHours = 0;
    let otRate = 0;
    let otAmount = 0;

    if (otEligible && otPaidAs === 'SALARY') {
      if (payPolicy.ot_rate_type === 'FIXED') {
        otRate = Number(payPolicy.ot_rate) || 0;
      } else {
        // Multiplier
        const multiplier = Number(payPolicy.ot_multiplier) || 1.5;
        const hourlyRate = fullDayHours > 0 ? dailyRate / fullDayHours : 0;
        otRate = this.round2(hourlyRate * multiplier);
      }

      // Sum approved OT entries (only if paid as SALARY, not COMP_OFF)
      for (const ot of existingOtEntries) {
        if ((ot.status === 'APPROVED' || ot.status === 'REDUCED') && ot.ot_paid_as !== 'COMP_OFF') {
          otHours += Number(ot.approved_hours) || 0;
        }
      }
      otAmount = this.round2(otHours * otRate);
    }

    // 9. Provident Fund (PF)
    const pfApplicable = Boolean(payPolicy.pf_applicable ?? (Number(emp.pf) > 0));
    const uan = payPolicy.uan || null;
    const employeePfPct = Number(payPolicy.employee_pf_pct ?? settings.default_employee_pf_pct) || 12.0;
    const employerPfPct = Number(payPolicy.employer_pf_pct ?? settings.default_employer_pf_pct) || 12.0;
    const applyPfWageLimit = settings.apply_pf_wage_limit !== false;
    const pfWageLimit = Number(settings.pf_wage_limit) || 15000.0;

    let pfWage = 0;
    let employeePf = 0;
    let employerPf = 0;

    if (pfApplicable) {
      pfWage = applyPfWageLimit ? Math.min(basicSalary, pfWageLimit) : basicSalary;
      employeePf = this.round2((pfWage * employeePfPct) / 100);
      employerPf = this.round2((pfWage * employerPfPct) / 100);
    }

    // 10. Additions & Deductions
    let totalAdditions = 0;
    let totalDeductions = 0;
    for (const adj of existingAdjustments) {
      if (!adj.is_active) continue;
      if (adj.type === 'ADDITION') {
        totalAdditions += Number(adj.amount) || 0;
      } else if (adj.type === 'DEDUCTION') {
        totalDeductions += Number(adj.amount) || 0;
      }
    }
    totalAdditions = this.round2(totalAdditions);
    totalDeductions = this.round2(totalDeductions);

    // 11. Gross & Total Salary (Net Pay)
    const grossEarnings = this.round2(basicSalary + otAmount + totalAdditions);
    let totalSalary = grossEarnings - (employeePf + totalDeductions);
    if (settings.total_salary_rounding === 'NEAREST_RUPEE') {
      totalSalary = this.roundRupee(totalSalary);
    } else {
      totalSalary = this.round2(totalSalary);
    }

    // 12. Flags & Validation Messages
    let flag: 'NONE' | 'ERROR' | 'WARNING' | 'JOINED_IN_MONTH' | 'LEFT_IN_MONTH' | 'ADJUSTED' = 'NONE';
    let validationMessage: string | null = null;

    if (monthlySalary <= 0) {
      flag = 'ERROR';
      validationMessage = 'Monthly Salary is not set in the Employee Master';
    } else if (totalSalary < 0) {
      flag = 'ERROR';
      validationMessage = 'Total Salary cannot be less than 0. Reduce the deduction.';
    } else if (empJoiningStr >= startDateStr && empJoiningStr <= endDateStr) {
      flag = 'JOINED_IN_MONTH';
      validationMessage = `Joined on ${empJoiningStr}`;
    } else if (empTermStr >= startDateStr && empTermStr <= endDateStr) {
      flag = 'LEFT_IN_MONTH';
      validationMessage = `Left on ${empTermStr}`;
    } else if (empDayAdjustments.length > 0 || existingAdjustments.length > 0) {
      flag = 'ADJUSTED';
    } else if (pfApplicable && !uan) {
      flag = 'WARNING';
      validationMessage = 'PF Applicable is Yes, but UAN is empty';
    } else if (payPolicy.payment_mode === 'BANK_TRANSFER' && (!payPolicy.account_number || !payPolicy.ifsc_code)) {
      flag = 'WARNING';
      validationMessage = 'Bank Transfer mode but Account or IFSC is missing';
    }

    return {
      emp_id: emp.emp_id,
      employee_code: emp.employee_code || `EMP-${String(emp.emp_id).padStart(4, '0')}`,
      employee_name: emp.name,
      department_names: emp.department_names || 'General',
      role_name: emp.role_name || '-',
      shift_name: shift.shift_name,
      monthly_salary: monthlySalary,
      daily_rate: dailyRate,
      pf_applicable: pfApplicable,
      uan: uan,
      payment_mode: payPolicy.payment_mode || 'BANK_TRANSFER',
      bank_name: payPolicy.bank_name || null,
      account_number: payPolicy.account_number || null,
      ifsc_code: payPolicy.ifsc_code || null,
      total_working_days: totalWorkingDaysCount,
      present_days: presentDaysCount,
      paid_leave_days: paidLeaveDaysCount,
      unpaid_leave_days: unpaidLeaveDaysCount,
      absent_days: absentDaysCount,
      missing_punch_days: missingPunchDaysCount,
      not_employed_days: notEmployedDaysCount,
      full_days: fullDaysCount,
      half_days: halfDaysCount,
      paid_days: paidDays,
      lop_days: lopDays,
      basic_salary: basicSalary,
      ot_hours: otHours,
      ot_rate: otRate,
      ot_amount: otAmount,
      pf_wage: pfWage,
      employee_pf: employeePf,
      employer_pf: employerPf,
      total_additions: totalAdditions,
      total_deductions: totalDeductions,
      gross_earnings: grossEarnings,
      total_salary: totalSalary,
      flag: flag,
      validation_message: validationMessage,
      days: dayItems,
    };
  }
}
