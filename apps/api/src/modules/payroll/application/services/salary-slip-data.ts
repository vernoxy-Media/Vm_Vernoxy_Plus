import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { DocumentDataRegistry, DocumentDataSource, SALARY_SLIP_KIND, SalarySlipData } from '../../../document-templates/public-api';
import { slipNumber } from '../../domain/payroll-rules';

/**
 * Payroll's side of the Salary Slip template: turns one employee's payroll of the month into the
 * SalarySlipData the template module lays out. Every value is read from the payroll snapshot
 * (payroll_employees) and the month's adjustments, never typed in on the slip, so the slip always
 * matches the register, the bank file and the PF reports.
 */

/** payroll_employees columns a Salary Slip needs. */
export const SLIP_DATA_COLUMNS = Prisma.sql`payroll_employee_id, emp_id, employee_name, employee_code, department_names, role_name,
  pf_applicable, uan, payment_mode::text AS payment_mode, bank_name, account_number, ifsc_code, paid_on,
  monthly_salary, daily_rate, total_working_days, present_days, paid_leave_days, unpaid_leave_days, full_days, half_days,
  paid_days, lop_days, basic_salary, ot_hours, ot_rate, ot_amount, employee_pf, total_deductions, gross_earnings, total_salary,
  flag::text AS flag`;

export interface SlipAdjustment {
  payroll_employee_id?: number;
  type: string;
  amount: unknown;
  label: string | null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const num = (v: unknown) => Number(v) || 0;
const ymd = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** One row per category (two Bonus entries in a month print as one Bonus row). */
function byCategory(adjustments: SlipAdjustment[], type: 'ADDITION' | 'DEDUCTION', fallback: string) {
  const rows = new Map<string, number>();
  for (const a of adjustments) {
    if (a.type !== type) continue;
    const label = (a.label || fallback).trim();
    rows.set(label, Math.round((num(rows.get(label)) + num(a.amount)) * 100) / 100);
  }
  return [...rows.entries()].map(([label, amount]) => ({ label, amount }));
}

export function toSalarySlipData(run: any, e: any, adjustments: SlipAdjustment[], number: string | null): SalarySlipData {
  const employeePf = num(e.employee_pf);
  return {
    pay_month: `${MONTHS[run.payroll_month - 1]} ${run.payroll_year}`,
    pay_date: ymd(e.paid_on) ?? ymd(run.payment_date),
    slip_number: number,
    employee: {
      name: e.employee_name,
      code: e.employee_code,
      department: e.department_names || null,
      designation: e.role_name || null,
      uan: e.uan || null,
      pf_applicable: Boolean(e.pf_applicable),
    },
    salary: {
      monthly_salary: num(e.monthly_salary),
      daily_rate: num(e.daily_rate),
      full_days: num(e.full_days),
      half_days: num(e.half_days),
      paid_days: num(e.paid_days),
      basic: num(e.basic_salary),
    },
    overtime: { hours: num(e.ot_hours), rate: num(e.ot_rate), amount: num(e.ot_amount) },
    additions: byCategory(adjustments, 'ADDITION', 'Addition'),
    provident_fund: e.pf_applicable ? employeePf : 0,
    deductions: byCategory(adjustments, 'DEDUCTION', 'Deduction'),
    attendance: {
      total_working_days: num(e.total_working_days),
      present_days: num(e.present_days),
      half_days: num(e.half_days),
      paid_leave_days: num(e.paid_leave_days),
      unpaid_leave_days: num(e.unpaid_leave_days),
      lop_days: num(e.lop_days),
    },
    gross: num(e.gross_earnings),
    total_deductions: Math.round((employeePf + num(e.total_deductions)) * 100) / 100,
    net_pay: num(e.total_salary),
    payment: {
      mode: e.payment_mode || null,
      bank_name: e.bank_name || null,
      account_number: e.account_number || null,
      ifsc: e.ifsc_code || null,
    },
  };
}

/** Real payroll data for Salary Slip test documents in Template Management: { year, month, emp_id }. */
@Injectable()
export class PayrollSalarySlipSource implements DocumentDataSource<SalarySlipData>, OnModuleInit {
  readonly kind = SALARY_SLIP_KIND;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: DocumentDataRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async load(subject: Record<string, unknown>): Promise<SalarySlipData> {
    const year = Number(subject.year);
    const month = Number(subject.month);
    const empId = Number(subject.emp_id);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(empId) || empId <= 0) {
      throw new BadRequestException('Choose the month and the employee for the test slip.');
    }
    const [run] = await this.prisma.$queryRaw<any[]>`
      SELECT payroll_run_id, payroll_year, payroll_month, payment_date FROM payroll_runs
      WHERE payroll_year = ${year} AND payroll_month = ${month};
    `;
    if (!run) throw new NotFoundException(`There is no payroll for ${MONTHS[month - 1]} ${year} yet. Start it in Payroll, or test with sample data.`);
    const [e] = await this.prisma.$queryRaw<any[]>`
      SELECT ${SLIP_DATA_COLUMNS} FROM payroll_employees WHERE payroll_run_id = ${run.payroll_run_id} AND emp_id = ${empId};
    `;
    if (!e) throw new NotFoundException(`This employee is not in the payroll of ${MONTHS[month - 1]} ${year}.`);
    const adjustments = await slipAdjustments(this.prisma, run.payroll_run_id, e.payroll_employee_id);
    const [slip] = await this.prisma.$queryRaw<any[]>`
      SELECT slip_number FROM payroll_salary_slips WHERE payroll_employee_id = ${e.payroll_employee_id} ORDER BY revision_number DESC LIMIT 1;
    `;
    return toSalarySlipData(run, e, adjustments, slip?.slip_number ?? slipNumber(year, month, empId, 0));
  }
}

/** The month's active Addition / Deduction entries (Day Adjustments change days, not amounts). */
export async function slipAdjustments(prisma: PrismaService, payrollRunId: number, payrollEmployeeId?: number): Promise<SlipAdjustment[]> {
  const onlyOne = payrollEmployeeId ? Prisma.sql`AND pa.payroll_employee_id = ${payrollEmployeeId}` : Prisma.empty;
  return prisma.$queryRaw<SlipAdjustment[]>`
    SELECT pa.payroll_employee_id, pa.type::text AS type, pa.amount, ml.label
    FROM payroll_adjustments pa JOIN payroll_employees pe ON pe.payroll_employee_id = pa.payroll_employee_id
    LEFT JOIN master_lookup ml ON ml.lookup_id = pa.category_id
    WHERE pe.payroll_run_id = ${payrollRunId} AND pa.is_active AND pa.type <> 'DAY_ADJUSTMENT' ${onlyOne}
    ORDER BY pa.created_at;
  `;
}
