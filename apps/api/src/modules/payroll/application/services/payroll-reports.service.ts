import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { ReportQueryDto } from '../../presentation/dto/payroll.dto';
import { monthLabel } from './payroll.service';

export interface ReportColumn {
  header: string;
  key: string;
  money?: boolean;
  width?: number;
}
export interface Report {
  type: string;
  title: string;
  columns: ReportColumn[];
  rows: Array<Record<string, any>>;
  totals?: Record<string, number>;
}

export const REPORT_TYPES = ['register', 'salary-summary', 'pf', 'ot', 'adjustments', 'lop', 'bank', 'employee-history'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const num = (v: any) => Math.round((Number(v) || 0) * 100) / 100;
const ymd = (d: any) => (d ? (typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)) : '');

/** BFD Section 13: reports built from the run (Draft or Locked). */
@Injectable()
export class PayrollReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async run(year?: number, month?: number) {
    if (!year || !month) throw new BadRequestException('Please choose a Payroll Month.');
    const [r] = await this.prisma.$queryRaw<any[]>`
      SELECT payroll_run_id, payroll_year, payroll_month, status::text AS status FROM payroll_runs WHERE payroll_year = ${year} AND payroll_month = ${month};
    `;
    if (!r) throw new NotFoundException(`No payroll run for ${monthLabel(year, month)}.`);
    return r;
  }

  async build(type: ReportType, q: ReportQueryDto): Promise<Report> {
    switch (type) {
      case 'register':
        return this.register(q);
      case 'salary-summary':
        return this.salarySummary(q);
      case 'pf':
        return this.pf(q);
      case 'ot':
        return this.ot(q);
      case 'adjustments':
        return this.adjustments(q);
      case 'lop':
        return this.lop(q);
      case 'bank':
        return this.bank(q);
      case 'employee-history':
        return this.employeeHistory(q);
      default:
        throw new BadRequestException('Unknown report.');
    }
  }

  private deptFilter(q: ReportQueryDto) {
    return q.department_id ? Number(q.department_id) : null;
  }

  private async register(q: ReportQueryDto): Promise<Report> {
    const r = await this.run(q.year, q.month);
    const dep = this.deptFilter(q);
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT pe.employee_code, pe.employee_name, pe.department_names, pe.total_working_days, pe.full_days, pe.half_days, pe.lop_days,
             pe.paid_days, pe.basic_salary, pe.ot_amount, pe.total_additions, pe.employee_pf, pe.total_deductions, pe.total_salary
      FROM payroll_employees pe JOIN employees e ON e.emp_id = pe.emp_id
      WHERE pe.payroll_run_id = ${r.payroll_run_id} AND (${dep}::int IS NULL OR e.dep_id = ${dep}::int)
      ORDER BY pe.emp_id;
    `;
    return {
      type: 'register',
      title: `Payroll Register · ${monthLabel(r.payroll_year, r.payroll_month)} (${r.status})`,
      columns: [
        { header: 'Emp ID', key: 'employee_code', width: 12 },
        { header: 'Name', key: 'employee_name', width: 24 },
        { header: 'Department', key: 'department_names', width: 18 },
        { header: 'Work Days', key: 'total_working_days' },
        { header: 'Full', key: 'full_days' },
        { header: 'Half', key: 'half_days' },
        { header: 'LOP', key: 'lop_days' },
        { header: 'Paid Days', key: 'paid_days' },
        { header: 'Basic Salary', key: 'basic_salary', money: true },
        { header: 'OT', key: 'ot_amount', money: true },
        { header: 'Additions', key: 'total_additions', money: true },
        { header: 'PF', key: 'employee_pf', money: true },
        { header: 'Deductions', key: 'total_deductions', money: true },
        { header: 'Total Salary', key: 'total_salary', money: true },
      ],
      rows: rows.map((x) => this.numbers(x)),
      totals: this.sum(rows, ['basic_salary', 'ot_amount', 'total_additions', 'employee_pf', 'total_deductions', 'total_salary']),
    };
  }

  /** Totals per department for a month or a range of months. */
  private async salarySummary(q: ReportQueryDto): Promise<Report> {
    const from = q.from || (q.year && q.month ? `${q.year}-${String(q.month).padStart(2, '0')}` : null);
    const to = q.to || from;
    if (!from || !to) throw new BadRequestException('Please choose a month or a range of months.');
    if (to < from) throw new BadRequestException('The To month cannot be before the From month.');
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(pe.department_names, '—') AS department, count(DISTINCT pe.emp_id)::int AS employees,
             sum(pe.gross_earnings) AS gross, sum(pe.employee_pf) AS pf, sum(pe.total_deductions) AS deductions, sum(pe.total_salary) AS total_salary
      FROM payroll_employees pe JOIN payroll_runs pr ON pr.payroll_run_id = pe.payroll_run_id
      WHERE to_char(make_date(pr.payroll_year, pr.payroll_month, 1), 'YYYY-MM') BETWEEN ${from} AND ${to}
      GROUP BY 1 ORDER BY 1;
    `;
    return {
      type: 'salary-summary',
      title: `Salary Summary · ${from}${to !== from ? ` to ${to}` : ''}`,
      columns: [
        { header: 'Department', key: 'department', width: 24 },
        { header: 'Employees', key: 'employees' },
        { header: 'Gross', key: 'gross', money: true },
        { header: 'PF', key: 'pf', money: true },
        { header: 'Deductions', key: 'deductions', money: true },
        { header: 'Total Salary', key: 'total_salary', money: true },
      ],
      rows: rows.map((x) => this.numbers(x)),
      totals: this.sum(rows, ['gross', 'pf', 'deductions', 'total_salary']),
    };
  }

  private async pf(q: ReportQueryDto): Promise<Report> {
    const r = await this.run(q.year, q.month);
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT employee_code, employee_name, COALESCE(uan, '—') AS uan, pf_wage, employee_pf, employer_pf
      FROM payroll_employees WHERE payroll_run_id = ${r.payroll_run_id} AND pf_applicable = true ORDER BY emp_id;
    `;
    return {
      type: 'pf',
      title: `PF Report · ${monthLabel(r.payroll_year, r.payroll_month)}`,
      columns: [
        { header: 'Emp ID', key: 'employee_code', width: 12 },
        { header: 'Name', key: 'employee_name', width: 24 },
        { header: 'UAN', key: 'uan', width: 16 },
        { header: 'PF Wage', key: 'pf_wage', money: true },
        { header: 'Employee PF', key: 'employee_pf', money: true },
        { header: 'Employer PF', key: 'employer_pf', money: true },
      ],
      rows: rows.map((x) => this.numbers(x)),
      totals: this.sum(rows, ['pf_wage', 'employee_pf', 'employer_pf']),
    };
  }

  private async ot(q: ReportQueryDto): Promise<Report> {
    const r = await this.run(q.year, q.month);
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT e.name AS employee, o.attendance_date, o.day_type, o.status::text AS status, o.approved_hours,
             round(o.hourly_rate * COALESCE(o.ot_multiplier, 1), 2) AS ot_rate, o.ot_amount, o.ot_paid_as::text AS paid_as, a.name AS approver
      FROM payroll_ot_entries o JOIN employees e ON e.emp_id = o.emp_id LEFT JOIN employees a ON a.emp_id = o.approver_id
      WHERE o.payroll_run_id = ${r.payroll_run_id} ORDER BY o.attendance_date, e.name;
    `;
    return {
      type: 'ot',
      title: `OT Report · ${monthLabel(r.payroll_year, r.payroll_month)}`,
      columns: [
        { header: 'Employee', key: 'employee', width: 24 },
        { header: 'Date', key: 'attendance_date', width: 12 },
        { header: 'Day type', key: 'day_type', width: 14 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Approved Hours', key: 'approved_hours' },
        { header: 'OT Rate', key: 'ot_rate', money: true },
        { header: 'OT Amount', key: 'ot_amount', money: true },
        { header: 'Paid as', key: 'paid_as', width: 10 },
        { header: 'Approver', key: 'approver', width: 20 },
      ],
      rows: rows.map((x) => ({ ...this.numbers(x), attendance_date: ymd(x.attendance_date) })),
      totals: this.sum(rows, ['approved_hours', 'ot_amount']),
    };
  }

  private async adjustments(q: ReportQueryDto): Promise<Report> {
    const r = await this.run(q.year, q.month);
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT pe.employee_name AS employee,
             CASE pa.type WHEN 'DAY_ADJUSTMENT' THEN 'Day' WHEN 'ADDITION' THEN 'Addition' ELSE 'Deduction' END AS kind,
             CASE WHEN pa.type = 'DAY_ADJUSTMENT' THEN to_char(pa.related_date, 'DD Mon') || ': ' || pa.old_paid_as || ' → ' || pa.new_paid_as
                  ELSE COALESCE(ml.label, '') END AS category_or_day,
             CASE pa.type WHEN 'ADDITION' THEN pa.amount WHEN 'DEDUCTION' THEN -pa.amount
                  ELSE round(((CASE pa.new_paid_as WHEN 'FULL' THEN 1 WHEN 'HALF' THEN 0.5 ELSE 0 END)
                            - (CASE pa.old_paid_as WHEN 'FULL' THEN 1 WHEN 'HALF' THEN 0.5 ELSE 0 END)) * pe.daily_rate, 2) END AS amount,
             pa.reason || COALESCE(' · ' || pa.note, '') AS reason, e.name AS by_name, pa.created_at,
             CASE WHEN pa.is_active THEN 'Active' ELSE 'Removed' END AS state
      FROM payroll_adjustments pa JOIN payroll_employees pe ON pe.payroll_employee_id = pa.payroll_employee_id
      LEFT JOIN master_lookup ml ON ml.lookup_id = pa.category_id LEFT JOIN employees e ON e.emp_id = pa.created_by
      WHERE pe.payroll_run_id = ${r.payroll_run_id} ORDER BY pa.created_at;
    `;
    return {
      type: 'adjustments',
      title: `Adjustments Report · ${monthLabel(r.payroll_year, r.payroll_month)}`,
      columns: [
        { header: 'Employee', key: 'employee', width: 24 },
        { header: 'Kind', key: 'kind', width: 10 },
        { header: 'Category or Day', key: 'category_or_day', width: 26 },
        { header: 'Amount or Effect', key: 'amount', money: true },
        { header: 'Reason', key: 'reason', width: 40 },
        { header: 'By', key: 'by_name', width: 18 },
        { header: 'Date', key: 'created_at', width: 12 },
        { header: 'State', key: 'state', width: 10 },
      ],
      rows: rows.map((x) => ({ ...this.numbers(x), created_at: ymd(x.created_at) })),
    };
  }

  private async lop(q: ReportQueryDto): Promise<Report> {
    const r = await this.run(q.year, q.month);
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT employee_name AS employee, absent_days, unpaid_leave_days, missing_punch_days, half_days, lop_days,
             round(lop_days * daily_rate, 2) AS amount_not_paid
      FROM payroll_employees WHERE payroll_run_id = ${r.payroll_run_id} AND lop_days > 0 ORDER BY lop_days DESC, emp_id;
    `;
    return {
      type: 'lop',
      title: `LOP Report · ${monthLabel(r.payroll_year, r.payroll_month)}`,
      columns: [
        { header: 'Employee', key: 'employee', width: 24 },
        { header: 'Absent', key: 'absent_days' },
        { header: 'Unpaid Leave', key: 'unpaid_leave_days' },
        { header: 'Missing Punch', key: 'missing_punch_days' },
        { header: 'Half Days', key: 'half_days' },
        { header: 'LOP Days', key: 'lop_days' },
        { header: 'Amount not paid', key: 'amount_not_paid', money: true },
      ],
      rows: rows.map((x) => this.numbers(x)),
      totals: this.sum(rows, ['lop_days', 'amount_not_paid']),
    };
  }

  private async bank(q: ReportQueryDto): Promise<Report> {
    const r = await this.run(q.year, q.month);
    if (r.status === 'DRAFT') throw new BadRequestException('The Bank Transfer Statement is made from a locked run.');
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT employee_name AS name, COALESCE(account_number, '') AS account_number, COALESCE(ifsc_code, '') AS ifsc, total_salary
      FROM payroll_employees WHERE payroll_run_id = ${r.payroll_run_id} AND payment_mode = 'BANK_TRANSFER' ORDER BY emp_id;
    `;
    return {
      type: 'bank',
      title: `Bank Transfer Statement · ${monthLabel(r.payroll_year, r.payroll_month)}`,
      columns: [
        { header: 'Name', key: 'name', width: 24 },
        { header: 'Account Number', key: 'account_number', width: 20 },
        { header: 'IFSC', key: 'ifsc', width: 14 },
        { header: 'Total Salary', key: 'total_salary', money: true },
      ],
      rows: rows.map((x) => this.numbers(x)),
      totals: this.sum(rows, ['total_salary']),
    };
  }

  private async employeeHistory(q: ReportQueryDto): Promise<Report> {
    if (!q.emp_id) throw new BadRequestException('Please choose an employee.');
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT pr.payroll_year, pr.payroll_month, pe.paid_days, pe.basic_salary, pe.ot_amount, pe.employee_pf,
             (pe.total_additions - pe.total_deductions) AS adjustments, pe.total_salary, pe.employee_name,
             (SELECT s.slip_number FROM payroll_salary_slips s WHERE s.payroll_employee_id = pe.payroll_employee_id
              AND s.status = 'RELEASED' ORDER BY s.revision_number DESC LIMIT 1) AS slip_number
      FROM payroll_employees pe JOIN payroll_runs pr ON pr.payroll_run_id = pe.payroll_run_id
      WHERE pe.emp_id = ${Number(q.emp_id)} ORDER BY pr.payroll_year DESC, pr.payroll_month DESC;
    `;
    return {
      type: 'employee-history',
      title: `Employee Salary History · ${rows[0]?.employee_name ?? `#${q.emp_id}`}`,
      columns: [
        { header: 'Month', key: 'month', width: 16 },
        { header: 'Paid Days', key: 'paid_days' },
        { header: 'Basic Salary', key: 'basic_salary', money: true },
        { header: 'OT', key: 'ot_amount', money: true },
        { header: 'PF', key: 'employee_pf', money: true },
        { header: 'Adjustments', key: 'adjustments', money: true },
        { header: 'Total Salary', key: 'total_salary', money: true },
        { header: 'Slip number', key: 'slip_number', width: 22 },
      ],
      rows: rows.map((x) => ({ ...this.numbers(x), month: monthLabel(x.payroll_year, x.payroll_month), slip_number: x.slip_number || '—' })),
    };
  }

  private numbers(x: Record<string, any>) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(x)) out[k] = typeof v === 'object' && v !== null && !(v instanceof Date) ? num(v) : typeof v === 'bigint' ? Number(v) : v;
    for (const [k, v] of Object.entries(out)) if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && !/code|account|ifsc|uan|slip/i.test(k)) out[k] = num(v);
    return out;
  }

  private sum(rows: any[], keys: string[]) {
    const t: Record<string, number> = {};
    for (const k of keys) t[k] = num(rows.reduce((s, r) => s + (Number(r[k]) || 0), 0));
    return t;
  }

  async toXlsx(report: Report): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(report.type.slice(0, 31));
    ws.addRow([report.title]).font = { bold: true, size: 13 };
    ws.addRow([]);
    const head = ws.addRow(report.columns.map((c) => c.header));
    head.font = { bold: true };
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    report.columns.forEach((c, i) => {
      ws.getColumn(i + 1).width = c.width ?? Math.max(12, c.header.length + 2);
      if (c.money) ws.getColumn(i + 1).numFmt = '#,##,##0.00';
    });
    for (const r of report.rows) ws.addRow(report.columns.map((c) => r[c.key] ?? ''));
    if (report.totals) {
      const t = ws.addRow(report.columns.map((c, i) => (i === 0 ? 'Total' : report.totals![c.key] ?? '')));
      t.font = { bold: true };
    }
    ws.views = [{ state: 'frozen', ySplit: 3 }];
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  toCsv(report: Report): string {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [report.columns.map((c) => esc(c.header)).join(',')];
    for (const r of report.rows) lines.push(report.columns.map((c) => esc(r[c.key])).join(','));
    return lines.join('\n');
  }
}
