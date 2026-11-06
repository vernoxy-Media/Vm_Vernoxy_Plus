import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { LeaveCoreService } from './leave-core.service';
import { LeaveRequestsQueryDto, LeaveReportsQueryDto } from '../../presentation/dto/leave.dto';
import {
  addDays,
  dayOfWeek,
  fmtDate,
  leaveYearLabel,
  leaveYearOf,
  monthName,
  num,
  pad2,
  round2,
  toDateStr,
  todayStr,
} from '../../domain/leave-dates';
import { LeaveService } from './leave.service';

export interface ReportTable {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, any>>;
}

const APPROVED = ['APPROVED', 'CANCELLATION_REQUESTED'];

@Injectable()
export class LeaveReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: LeaveCoreService,
    private readonly leave: LeaveService,
  ) {}

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  private period(q: LeaveReportsQueryDto): { from: string; to: string; label: string } {
    if (q.from_date && q.to_date) {
      if (q.to_date < q.from_date) throw new BadRequestException('The To date cannot be before the From date.');
      return { from: q.from_date, to: q.to_date, label: `${fmtDate(q.from_date)} – ${fmtDate(q.to_date)}` };
    }
    const month = q.month || todayStr().slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: `${month}-01`, to: `${month}-${pad2(last)}`, label: `${monthName(m)} ${y}` };
  }

  private statuses(q: LeaveReportsQueryDto, fallback = APPROVED): string[] {
    const s = (q.status || '').toUpperCase();
    if (!s || s === 'APPROVED') return fallback;
    if (s === 'ALL') return ['PENDING', 'APPROVED', 'CANCELLATION_REQUESTED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'];
    return s.split(',');
  }

  private paidFilter(q: LeaveReportsQueryDto): boolean | null {
    const p = (q.paid_unpaid || '').toUpperCase();
    if (p === 'PAID') return true;
    if (p === 'UNPAID') return false;
    return null;
  }

  /** Day rows (date basis) for approved/other statuses with the filters applied. */
  private async dayRows(q: LeaveReportsQueryDto, from: string, to: string, statuses: string[]) {
    const typeId = q.leave_type_id ?? null;
    const dep = q.department_id ?? null;
    const emp = q.employee_id ?? null;
    const paid = this.paidFilter(q);
    return this.prisma.$queryRaw<any[]>`
      SELECT d.leave_date, d.day_fraction, d.day_part, r.request_id, r.request_no, r.emp_id, r.is_paid, r.status,
             r.leave_type_id, r.is_self_approved, t.name AS leave_type_name, t.code AS leave_type_code,
             e.name AS employee_name, e.dep_id, dep.name AS department_name
      FROM leave_request_days d
      JOIN leave_requests r ON r.request_id = d.request_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      JOIN employees e ON e.emp_id = r.emp_id
      LEFT JOIN departments dep ON dep.dep_id = e.dep_id
      WHERE d.leave_date BETWEEN ${from}::date AND ${to}::date
        AND r.status = ANY(${statuses}::text[])
        AND (${typeId}::int IS NULL OR r.leave_type_id = ${typeId}::int)
        AND (${dep}::int IS NULL OR e.dep_id = ${dep}::int)
        AND (${emp}::int IS NULL OR r.emp_id = ${emp}::int)
        AND (${paid}::boolean IS NULL OR r.is_paid = ${paid}::boolean)
      ORDER BY d.leave_date ASC, e.name ASC;
    `;
  }

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------

  async getReport(q: LeaveReportsQueryDto) {
    const type = q.report_type || 'summary';
    switch (type) {
      case 'summary':
        return this.summary(q);
      case 'register':
        return this.register(q);
      case 'balances':
        return this.balancesReport(q);
      case 'lop':
        return this.lop(q);
      case 'on_leave_today':
        return this.onLeaveOn(q);
      case 'pending':
        return this.pending(q);
      case 'calendar':
        return this.calendarReport(q);
      default:
        throw new BadRequestException('Unknown report.');
    }
  }

  async summary(q: LeaveReportsQueryDto) {
    const { from, to, label } = this.period(q);
    const statuses = this.statuses(q);
    const days = await this.dayRows(q, from, to, statuses);
    const total = round2(days.reduce((s, d) => s + num(d.day_fraction), 0));
    const paid = round2(days.filter((d) => d.is_paid).reduce((s, d) => s + num(d.day_fraction), 0));
    const unpaid = round2(total - paid);

    const typeId = q.leave_type_id ?? null;
    const dep = q.department_id ?? null;
    const emp = q.employee_id ?? null;
    const [pendingRow] = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS n FROM leave_requests r JOIN employees e ON e.emp_id = r.emp_id
      WHERE r.status = 'PENDING' AND r.from_date <= ${to}::date AND r.to_date >= ${from}::date
        AND (${typeId}::int IS NULL OR r.leave_type_id = ${typeId}::int)
        AND (${dep}::int IS NULL OR e.dep_id = ${dep}::int)
        AND (${emp}::int IS NULL OR r.emp_id = ${emp}::int);
    `;

    // Trend: 6 months up to the chosen month
    const endMonth = to.slice(0, 7);
    const months: string[] = [];
    let [y, m] = endMonth.split('-').map(Number);
    for (let i = 0; i < 6; i++) {
      months.unshift(`${y}-${pad2(m)}`);
      m--;
      if (m === 0) {
        m = 12;
        y--;
      }
    }
    const trendFrom = `${months[0]}-01`;
    const trendDays = await this.dayRows(q, trendFrom, to, statuses);
    const trend = months.map((mk) => {
      const inMonth = trendDays.filter((d) => toDateStr(d.leave_date).startsWith(mk));
      const p = round2(inMonth.filter((d) => d.is_paid).reduce((s, d) => s + num(d.day_fraction), 0));
      const u = round2(inMonth.filter((d) => !d.is_paid).reduce((s, d) => s + num(d.day_fraction), 0));
      return { month: mk, label: `${monthName(Number(mk.slice(5, 7))).slice(0, 3)} ${mk.slice(2, 4)}`, paid: p, unpaid: u };
    });

    const groupBy = q.group_by || 'type';
    const groups = new Map<string, { key: string; label: string; is_paid?: boolean; days: number; emps: Set<number> }>();
    for (const d of days) {
      const key = groupBy === 'department' ? String(d.dep_id ?? 0) : groupBy === 'employee' ? String(d.emp_id) : String(d.leave_type_id);
      const lbl = groupBy === 'department' ? d.department_name || '—' : groupBy === 'employee' ? d.employee_name : d.leave_type_name;
      const g = groups.get(key) || { key, label: lbl, is_paid: groupBy === 'type' ? d.is_paid : undefined, days: 0, emps: new Set<number>() };
      g.days = round2(g.days + num(d.day_fraction));
      g.emps.add(d.emp_id);
      groups.set(key, g);
    }
    const breakdown = Array.from(groups.values())
      .map((g) => ({
        key: g.key,
        label: g.label,
        is_paid: g.is_paid,
        days: g.days,
        employees: g.emps.size,
        average_days: g.emps.size ? round2(g.days / g.emps.size) : 0,
      }))
      .sort((a, b) => b.days - a.days);

    return {
      report_type: 'summary',
      period_label: label,
      totals: { taken: total, paid, unpaid, pending_requests: pendingRow?.n || 0 },
      trend,
      group_by: groupBy,
      breakdown,
      table: {
        title: `Leave Summary · ${label}`,
        columns: [
          { key: 'label', label: groupBy === 'department' ? 'Department' : groupBy === 'employee' ? 'Employee' : 'Leave Type' },
          ...(groupBy === 'type' ? [{ key: 'paid', label: 'Paid' }] : []),
          { key: 'days', label: 'Days' },
          { key: 'employees', label: 'Employees' },
          { key: 'average_days', label: 'Average days' },
        ],
        rows: breakdown.map((b) => ({ ...b, paid: b.is_paid === undefined ? '' : b.is_paid ? 'Paid' : 'Unpaid' })),
      } as ReportTable,
    };
  }

  async register(q: LeaveReportsQueryDto) {
    const { from, to, label } = this.period(q);
    const statuses = this.statuses(q, ['PENDING', 'APPROVED', 'CANCELLATION_REQUESTED', 'REJECTED', 'WITHDRAWN', 'CANCELLED']);
    const typeId = q.leave_type_id ?? null;
    const dep = q.department_id ?? null;
    const emp = q.employee_id ?? null;
    const paid = this.paidFilter(q);
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT r.request_id, r.request_no, r.emp_id, e.name AS employee_name, dep.name AS department_name,
             t.name AS leave_type_name, r.is_paid, r.from_date, r.to_date, r.duration, r.leave_days, r.status,
             r.applied_at, r.decided_at, r.reason, r.is_self_approved, r.is_short_notice, r.added_by_admin,
             dec.name AS decided_by_name
      FROM leave_requests r
      JOIN employees e ON e.emp_id = r.emp_id
      LEFT JOIN departments dep ON dep.dep_id = e.dep_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      LEFT JOIN employees dec ON dec.emp_id = r.decided_by
      WHERE r.from_date <= ${to}::date AND r.to_date >= ${from}::date
        AND r.status = ANY(${statuses}::text[])
        AND (${typeId}::int IS NULL OR r.leave_type_id = ${typeId}::int)
        AND (${dep}::int IS NULL OR e.dep_id = ${dep}::int)
        AND (${emp}::int IS NULL OR r.emp_id = ${emp}::int)
        AND (${paid}::boolean IS NULL OR r.is_paid = ${paid}::boolean)
      ORDER BY r.from_date ASC, e.name ASC;
    `;
    const data = rows.map((r) => ({
      request_id: r.request_id,
      request_no: r.request_no,
      employee_name: r.employee_name,
      department_name: r.department_name || '—',
      leave_type_name: r.leave_type_name,
      paid: r.is_paid ? 'Paid' : 'Unpaid',
      from_date: toDateStr(r.from_date),
      to_date: toDateStr(r.to_date),
      duration: r.duration === 'FULL_DAY' ? 'Full Day' : r.duration === 'FIRST_HALF' ? 'First Half' : 'Second Half',
      days: num(r.leave_days),
      status: r.status,
      applied_on: toDateStr(new Date(r.applied_at)),
      decided_by: r.added_by_admin ? `${r.decided_by_name || ''} (Added)` : r.decided_by_name || '',
      decided_on: r.decided_at ? toDateStr(new Date(r.decided_at)) : '',
      reason: r.reason,
      self_approved: r.is_self_approved,
      short_notice: r.is_short_notice,
    }));
    return {
      report_type: 'register',
      period_label: label,
      table: {
        title: `Leave Register · ${label}`,
        columns: [
          { key: 'request_no', label: 'Request No.' },
          { key: 'employee_name', label: 'Employee' },
          { key: 'department_name', label: 'Department' },
          { key: 'leave_type_name', label: 'Leave Type' },
          { key: 'paid', label: 'Paid/Unpaid' },
          { key: 'from_date', label: 'From' },
          { key: 'to_date', label: 'To' },
          { key: 'duration', label: 'Duration' },
          { key: 'days', label: 'Days' },
          { key: 'status', label: 'Status' },
          { key: 'applied_on', label: 'Applied on' },
          { key: 'decided_by', label: 'Decided by' },
          { key: 'decided_on', label: 'Decided on' },
          { key: 'reason', label: 'Reason' },
        ],
        rows: data,
      } as ReportTable,
    };
  }

  async balancesReport(q: LeaveReportsQueryDto) {
    const settings = await this.core.getSettings();
    const onDate = q.on_date || todayStr();
    const year = leaveYearOf(onDate, settings.start_month);
    const dep = q.department_id ?? null;
    const emp = q.employee_id ?? null;
    const typeId = q.leave_type_id ?? null;
    const isCurrent = onDate >= todayStr();

    const emps = await this.prisma.$queryRaw<any[]>`
      SELECT e.emp_id, e.name, e.leave_policy_id, d.name AS department_name, p.name AS policy_name
      FROM employees e
      LEFT JOIN departments d ON d.dep_id = e.dep_id
      LEFT JOIN leave_policies p ON p.policy_id = e.leave_policy_id
      WHERE e.deleted_at IS NULL AND e.joining_date <= ${onDate}::date
        AND (e.status = 'Active' OR EXISTS (SELECT 1 FROM leave_balances b WHERE b.emp_id = e.emp_id AND b.leave_year = ${year}))
        AND (${dep}::int IS NULL OR e.dep_id = ${dep}::int)
        AND (${emp}::int IS NULL OR e.emp_id = ${emp}::int)
      ORDER BY e.name;
    `;
    const types = await this.prisma.$queryRaw<any[]>`
      SELECT leave_type_id, name, code FROM leave_types
      WHERE balance_tracked = true AND (${typeId}::int IS NULL OR leave_type_id = ${typeId}::int)
      ORDER BY leave_type_id;
    `;
    const ledger = await this.prisma.$queryRaw<any[]>`
      SELECT emp_id, leave_type_id, entry_type, SUM(days) AS days
      FROM leave_ledger
      WHERE leave_year = ${year} AND performed_at < (${onDate}::date + 1)
      GROUP BY emp_id, leave_type_id, entry_type;
    `;
    const booked = isCurrent
      ? await this.prisma.$queryRaw<any[]>`
          SELECT emp_id, leave_type_id, SUM(leave_days) AS days FROM leave_requests
          WHERE status = 'PENDING' AND COALESCE(leave_year, EXTRACT(YEAR FROM from_date)::int) = ${year}
          GROUP BY emp_id, leave_type_id;`
      : [];

    const rows: any[] = [];
    for (const e of emps) {
      const row: Record<string, any> = {
        emp_id: e.emp_id,
        employee_name: e.name,
        department_name: e.department_name || '—',
        policy_name: e.policy_name || '—',
      };
      let any = false;
      for (const t of types) {
        const sum = (entry: string) =>
          num(ledger.find((l) => l.emp_id === e.emp_id && l.leave_type_id === t.leave_type_id && l.entry_type === entry)?.days);
        const opening = sum('OPENING_BALANCE');
        const credited = round2(sum('MONTHLY_CREDIT') + sum('YEARLY_CREDIT') + sum('PRO_RATA_CREDIT') + sum('COMP_OFF_CREDIT')
          + Math.max(0, sum('CARRIED_FORWARD')) + sum('ADJUSTED'));
        const taken = round2(-(sum('TAKEN') + sum('RETURNED')));
        const lapsed = round2(-sum('LAPSED') + Math.max(0, -sum('CARRIED_FORWARD')));
        const bk = num(booked.find((b: any) => b.emp_id === e.emp_id && b.leave_type_id === t.leave_type_id)?.days);
        const available = round2(opening + credited - taken - lapsed - bk);
        if (opening || credited || taken || lapsed || bk) any = true;
        row[`${t.code}_opening`] = opening;
        row[`${t.code}_credited`] = credited;
        row[`${t.code}_taken`] = taken;
        row[`${t.code}_booked`] = bk;
        row[`${t.code}_available`] = available;
        row[`${t.code}_lapsed`] = lapsed;
      }
      if (any || e.leave_policy_id) rows.push(row);
    }
    const columns = [
      { key: 'employee_name', label: 'Employee' },
      { key: 'department_name', label: 'Department' },
      { key: 'policy_name', label: 'Policy' },
    ];
    for (const t of types) {
      for (const [k, l] of [['opening', 'Opening'], ['credited', 'Credited'], ['taken', 'Taken'], ['booked', 'Booked'], ['available', 'Available'], ['lapsed', 'Lapsed']]) {
        columns.push({ key: `${t.code}_${k}`, label: `${t.code} ${l}` });
      }
    }
    return {
      report_type: 'balances',
      period_label: `On ${fmtDate(onDate)} · Leave year ${leaveYearLabel(year, settings.start_month)}`,
      types,
      table: { title: `Leave Balances on ${fmtDate(onDate)}`, columns, rows } as ReportTable,
    };
  }

  async lop(q: LeaveReportsQueryDto) {
    const { from, to, label } = this.period(q);
    const days = await this.dayRows({ ...q, paid_unpaid: 'UNPAID' }, from, to, APPROVED);
    const byReq = new Map<number, any>();
    for (const d of days) {
      const r = byReq.get(d.request_id) || {
        request_no: d.request_no,
        employee_name: d.employee_name,
        department_name: d.department_name || '—',
        leave_type_name: d.leave_type_name,
        dates: [] as string[],
        days: 0,
      };
      r.dates.push(toDateStr(d.leave_date));
      r.days = round2(r.days + num(d.day_fraction));
      byReq.set(d.request_id, r);
    }
    const rows = Array.from(byReq.values()).map((r) => ({
      ...r,
      dates: r.dates.length === 1 ? fmtDate(r.dates[0]) : `${fmtDate(r.dates[0])} – ${fmtDate(r.dates[r.dates.length - 1])}`,
    }));
    const total = round2(rows.reduce((s, r) => s + r.days, 0));
    return {
      report_type: 'lop',
      period_label: label,
      totals: { unpaid: total },
      table: {
        title: `Unpaid Leave (LOP) · ${label}`,
        columns: [
          { key: 'employee_name', label: 'Employee' },
          { key: 'department_name', label: 'Department' },
          { key: 'leave_type_name', label: 'Leave Type' },
          { key: 'dates', label: 'Dates' },
          { key: 'days', label: 'Days' },
          { key: 'request_no', label: 'Request No.' },
        ],
        rows,
      } as ReportTable,
    };
  }

  async onLeaveOn(q: LeaveReportsQueryDto) {
    const date = q.on_date || todayStr();
    const days = await this.dayRows(q, date, date, APPROVED);
    const rows: any[] = [];
    for (const d of days) {
      const [r] = await this.prisma.$queryRaw<any[]>`SELECT to_date FROM leave_requests WHERE request_id = ${d.request_id}`;
      const backOn = await this.nextWorkingDay(d.emp_id, toDateStr(r.to_date), d.day_part);
      rows.push({
        request_no: d.request_no,
        employee_name: d.employee_name,
        department_name: d.department_name || '—',
        leave_type_name: d.leave_type_name,
        part: d.day_part === 'FULL_DAY' ? 'Full' : d.day_part === 'FIRST_HALF' ? 'Half (First)' : 'Half (Second)',
        back_on: backOn ? fmtDate(backOn) : '—',
      });
    }
    return {
      report_type: 'on_leave_today',
      period_label: fmtDate(date),
      table: {
        title: `On Leave · ${fmtDate(date)}`,
        columns: [
          { key: 'employee_name', label: 'Employee' },
          { key: 'department_name', label: 'Department' },
          { key: 'leave_type_name', label: 'Leave Type' },
          { key: 'part', label: 'Full or Half' },
          { key: 'back_on', label: 'Back on' },
        ],
        rows,
      } as ReportTable,
    };
  }

  private async nextWorkingDay(empId: number, lastDay: string, part: string): Promise<string | null> {
    if (part === 'FIRST_HALF') return lastDay;
    const offs = (await this.core.getWeeklyOffDays(empId)) || [0];
    const holidays = await this.core.getHolidays(addDays(lastDay, 1), addDays(lastDay, 30));
    let d = addDays(lastDay, 1);
    for (let i = 0; i < 30; i++) {
      if (!offs.includes(dayOfWeek(d)) && !holidays.has(d)) return d;
      d = addDays(d, 1);
    }
    return null;
  }

  async pending(q: LeaveReportsQueryDto) {
    const typeId = q.leave_type_id ?? null;
    const dep = q.department_id ?? null;
    const emp = q.employee_id ?? null;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT r.request_id, r.request_no, e.name AS employee_name, t.name AS leave_type_name, r.from_date, r.leave_days,
             r.applied_at, r.is_short_notice
      FROM leave_requests r
      JOIN employees e ON e.emp_id = r.emp_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE r.status = 'PENDING'
        AND (${typeId}::int IS NULL OR r.leave_type_id = ${typeId}::int)
        AND (${dep}::int IS NULL OR e.dep_id = ${dep}::int)
        AND (${emp}::int IS NULL OR r.emp_id = ${emp}::int)
      ORDER BY r.applied_at ASC;
    `;
    return {
      report_type: 'pending',
      period_label: 'Waiting for a decision',
      table: {
        title: 'Pending leave requests',
        columns: [
          { key: 'request_no', label: 'Request No.' },
          { key: 'employee_name', label: 'Employee' },
          { key: 'leave_type_name', label: 'Leave Type' },
          { key: 'from_date', label: 'From' },
          { key: 'days', label: 'Days' },
          { key: 'pending_hours', label: 'Pending for (hours)' },
          { key: 'short_notice', label: 'Short notice' },
        ],
        rows: rows.map((r) => ({
          request_id: r.request_id,
          request_no: r.request_no,
          employee_name: r.employee_name,
          leave_type_name: r.leave_type_name,
          from_date: toDateStr(r.from_date),
          days: num(r.leave_days),
          pending_hours: Math.floor((Date.now() - new Date(r.applied_at).getTime()) / 3600000),
          short_notice: r.is_short_notice ? 'Yes' : 'No',
        })),
      } as ReportTable,
    };
  }

  async calendarReport(q: LeaveReportsQueryDto) {
    const { from, to, label } = this.period(q);
    const days = await this.dayRows(q, from, to, APPROVED);
    return {
      report_type: 'calendar',
      period_label: label,
      from,
      to,
      days: days.map((d) => ({
        date: toDateStr(d.leave_date),
        emp_id: d.emp_id,
        employee_name: d.employee_name,
        department_name: d.department_name,
        leave_type_name: d.leave_type_name,
        leave_type_code: d.leave_type_code,
        part: d.day_part === 'FULL_DAY' ? 'Full' : 'Half',
        request_no: d.request_no,
      })),
      table: {
        title: `Leave Calendar · ${label}`,
        columns: [
          { key: 'date', label: 'Day' },
          { key: 'employee_name', label: 'Employee' },
          { key: 'department_name', label: 'Department' },
          { key: 'leave_type_name', label: 'Leave Type' },
          { key: 'part', label: 'Full or Half' },
        ],
        rows: days.map((d) => ({
          date: fmtDate(toDateStr(d.leave_date)),
          employee_name: d.employee_name,
          department_name: d.department_name || '—',
          leave_type_name: d.leave_type_name,
          part: d.day_part === 'FULL_DAY' ? 'Full' : 'Half',
        })),
      } as ReportTable,
    };
  }

  // ---------------------------------------------------------------------------
  // Leave Calendar (Calendar module + Leave Calendar screen), scoped by viewer
  // ---------------------------------------------------------------------------

  async calendar(viewer: { empId: number; isAdmin: boolean }, month?: string, departmentId?: number) {
    const { from, to } = this.period({ month });
    let empIds: number[] | null = null;
    if (!viewer.isAdmin) {
      empIds = [viewer.empId, ...(await this.core.getTeamIds(viewer.empId))];
    }
    const dep = departmentId ?? null;
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT r.request_id, r.request_no, r.emp_id, e.name AS employee_name, dep.name AS department_name, e.dep_id,
             r.leave_type_id, t.name AS leave_type_name, t.code AS leave_type_code, t.calendar_color, r.is_paid,
             r.duration, r.from_date, r.to_date, r.leave_days, r.status
      FROM leave_requests r
      JOIN employees e ON e.emp_id = r.emp_id
      LEFT JOIN departments dep ON dep.dep_id = e.dep_id
      JOIN leave_types t ON t.leave_type_id = r.leave_type_id
      WHERE r.status = ANY(${APPROVED}::text[])
        AND r.from_date <= ${to}::date AND r.to_date >= ${from}::date
        AND (${dep}::int IS NULL OR e.dep_id = ${dep}::int)
        AND (${empIds}::int[] IS NULL OR r.emp_id = ANY(${empIds}::int[]))
      ORDER BY r.from_date ASC, e.name ASC;
    `;
    const ids = rows.map((r) => r.request_id);
    const dayRows = ids.length
      ? await this.prisma.$queryRaw<any[]>`
          SELECT request_id, leave_date, day_part FROM leave_request_days WHERE request_id = ANY(${ids}::int[]) ORDER BY leave_date;`
      : [];
    return rows.map((r) => ({
      request_id: r.request_id,
      request_no: r.request_no,
      emp_id: r.emp_id,
      employee_name: r.employee_name,
      department_name: r.department_name,
      dep_id: r.dep_id,
      leave_type_id: r.leave_type_id,
      leave_type_name: r.leave_type_name,
      leave_type_code: r.leave_type_code,
      calendar_color: r.calendar_color,
      is_paid: r.is_paid,
      duration: r.duration,
      from_date: toDateStr(r.from_date),
      to_date: toDateStr(r.to_date),
      leave_days: num(r.leave_days),
      dates: dayRows.filter((d) => d.request_id === r.request_id).map((d) => toDateStr(d.leave_date)),
    }));
  }

  // ---------------------------------------------------------------------------
  // Exports (Excel / CSV). PDF is printed from the same table in the browser.
  // ---------------------------------------------------------------------------

  async exportReport(q: LeaveReportsQueryDto): Promise<{ buffer: Buffer; filename: string; mime: string }> {
    const report: any = await this.getReport(q);
    const table: ReportTable = report.table;
    const reason = q.report_type === 'register';
    if (!reason) {
      // Reasons and attachments appear only in the Leave Register export (BFD 14).
      table.columns = table.columns.filter((c) => c.key !== 'reason');
    }
    return this.toFile(table, q.format, `leave-${q.report_type || 'summary'}`);
  }

  async exportRequests(q: LeaveRequestsQueryDto, format?: string) {
    const list = await this.leave.listRequests({ ...q, page: 1, page_size: 500 });
    const table: ReportTable = {
      title: `Leave Requests · ${q.tab || 'Pending'}`,
      columns: [
        { key: 'request_no', label: 'Request No.' },
        { key: 'employee_name', label: 'Employee' },
        { key: 'department_name', label: 'Department' },
        { key: 'leave_type_name', label: 'Leave Type' },
        { key: 'paid', label: 'Paid/Unpaid' },
        { key: 'from_date', label: 'From' },
        { key: 'to_date', label: 'To' },
        { key: 'leave_days', label: 'Days' },
        { key: 'balance_after', label: 'Balance after' },
        { key: 'applied', label: 'Applied' },
        { key: 'status_label', label: 'Status' },
      ],
      rows: list.requests.map((r: any) => ({
        ...r,
        paid: r.is_paid ? 'Paid' : 'Unpaid',
        applied: toDateStr(new Date(r.applied_at)),
        balance_after: r.balance_after === null ? '—' : r.balance_after,
      })),
    };
    return this.toFile(table, format, `leave-requests-${(q.tab || 'pending').toLowerCase()}`);
  }

  async exportLedger(rows: any[], empName: string, format?: string) {
    const table: ReportTable = {
      title: `Leave Ledger · ${empName}`,
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'leave_type_name', label: 'Leave Type' },
        { key: 'entry_type', label: 'Entry' },
        { key: 'days', label: 'Days' },
        { key: 'balance_after', label: 'Balance after' },
        { key: 'note', label: 'Note' },
        { key: 'performed_by_name', label: 'By' },
      ],
      rows: rows.map((r) => ({ ...r, date: toDateStr(new Date(r.performed_at)) })),
    };
    return this.toFile(table, format, `leave-ledger-${empName.replace(/\s+/g, '-').toLowerCase()}`);
  }

  private async toFile(table: ReportTable, format: string | undefined, base: string) {
    const stamp = todayStr();
    if ((format || 'xlsx').toLowerCase() === 'csv') {
      const esc = (v: any) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [table.columns.map((c) => esc(c.label)).join(',')];
      for (const r of table.rows) lines.push(table.columns.map((c) => esc(r[c.key])).join(','));
      return { buffer: Buffer.from('﻿' + lines.join('\n'), 'utf8'), filename: `${base}-${stamp}.csv`, mime: 'text/csv; charset=utf-8' };
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Report');
    ws.addRow([table.title]).font = { bold: true, size: 13 };
    ws.addRow([]);
    const header = ws.addRow(table.columns.map((c) => c.label));
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    });
    for (const r of table.rows) ws.addRow(table.columns.map((c) => r[c.key] ?? ''));
    ws.columns.forEach((col) => {
      col.width = 18;
    });
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return {
      buffer,
      filename: `${base}-${stamp}.xlsx`,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}
