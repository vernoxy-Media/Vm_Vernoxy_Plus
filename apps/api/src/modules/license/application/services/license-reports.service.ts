import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { costPerSeat, daysBetween, seatsCounted, todayStr, yearlyCost } from '../../domain/license-rules';

/**
 * Who a report is for (BFD 12 Part 3 "Who sees what"):
 *  - Admin, License Managers, Accounts: every software;
 *  - Software Owner: only the software they own;
 *  - Reporting Manager: Assignments by Employee for their team only, without costs.
 */
export interface ReportScope {
  ownerId?: number;
  teamOf?: number;
  hideCosts?: boolean;
}

export interface ReportFilters {
  category_id?: number;
  vendor_id?: number;
  owner_id?: number;
  department_id?: number;
  emp_id?: number;
  status?: string;
  from?: string;
  to?: string;
  days?: number;
  event?: string;
  performed_by?: number;
  software_id?: number;
  limit?: number;
}

const d = (v: Date | string | null | undefined) => (v ? (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10) : null);
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class LicenseReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Software filter shared by every report: scope + Category, Vendor, Software Owner, Status. */
  private softwareWhere(scope: ReportScope, f: ReportFilters, defaultStatus: any = { not: 'Discontinued' }) {
    const where: any = {};
    if (scope.ownerId) where.software_owner_id = scope.ownerId;
    else if (f.owner_id) where.software_owner_id = f.owner_id;
    if (f.category_id) where.category_id = f.category_id;
    if (f.vendor_id) where.vendor_id = f.vendor_id;
    if (f.software_id) where.software_id = f.software_id;
    if (f.status && f.status !== 'All') where.status = f.status;
    else if (!f.status && defaultStatus) where.status = defaultStatus;
    return where;
  }

  // ---------------------------------------------------------------------------
  // 1. SOFTWARE REGISTER
  // ---------------------------------------------------------------------------
  async getSoftwareRegisterReport(scope: ReportScope = {}, f: ReportFilters = {}) {
    const list = await this.prisma.software_licenses.findMany({
      where: this.softwareWhere(scope, f),
      orderBy: { software_name: 'asc' },
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        employees_software_licenses_software_owner_idToemployees: { select: { emp_id: true, name: true, email: true } },
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 },
        software_license_assignments: { where: { status: 'Active' }, select: { assignment_id: true } },
      },
    });

    return list.map((sw) => {
      const t = sw.software_license_terms[0] || null;
      const assigned = sw.software_license_assignments.length;
      const total = sw.total_seats;
      return {
        software_id: sw.software_id,
        software_code: sw.software_code,
        software_name: sw.software_name,
        category: sw.software_license_categories?.name,
        vendor: sw.software_license_vendors?.name,
        license_type: sw.license_type,
        status: sw.status,
        total_seats: total,
        assigned_seats: assigned,
        available_seats: total !== null ? Math.max(0, total - assigned) : null,
        owner: sw.employees_software_licenses_software_owner_idToemployees?.name,
        billing_cycle: t?.billing_cycle,
        cost: scope.hideCosts ? null : t ? Number(t.cost) : 0,
        yearly_cost: scope.hideCosts || !t ? null : round2(yearlyCost(t.billing_cycle, Number(t.cost), d(t.start_date), d(t.expiry_date))),
        start_date: t?.start_date,
        expiry_date: t?.expiry_date,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // 2. UPCOMING RENEWALS: next 30, 60 or 90 days, or a date range (Expiry Date basis)
  // ---------------------------------------------------------------------------
  async getUpcomingRenewalsReport(scope: ReportScope = {}, f: ReportFilters = {}) {
    const today = todayStr();
    const from = f.from || today;
    const to = f.to || (() => {
      const dt = new Date(`${today}T00:00:00Z`);
      dt.setUTCDate(dt.getUTCDate() + (f.days || 90));
      return dt.toISOString().slice(0, 10);
    })();

    const softwareList = await this.prisma.software_licenses.findMany({
      where: this.softwareWhere(scope, f, { in: ['Active', 'Expiring Soon', 'Trial', 'Expired'] }),
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        employees_software_licenses_software_owner_idToemployees: { select: { emp_id: true, name: true, email: true } },
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 },
        software_license_assignments: { where: { status: 'Active' }, select: { assignment_id: true } },
      },
    });

    const matching = [];
    for (const sw of softwareList) {
      const term = sw.software_license_terms[0];
      const exp = d(term?.expiry_date);
      if (!term || !exp || exp < from || exp > to) continue;
      const used = sw.software_license_assignments.length;
      matching.push({
        software_id: sw.software_id,
        software_code: sw.software_code,
        software_name: sw.software_name,
        category: sw.software_license_categories?.name,
        vendor: sw.software_license_vendors?.name,
        owner: sw.employees_software_licenses_software_owner_idToemployees?.name,
        owner_email: sw.employees_software_licenses_software_owner_idToemployees?.email,
        expiry_date: term.expiry_date,
        days_remaining: daysBetween(today, exp),
        month: exp.slice(0, 7),
        seats_used: used,
        total_seats: sw.total_seats,
        free_seats: sw.total_seats !== null ? Math.max(0, sw.total_seats - used) : null,
        current_term_cost: scope.hideCosts ? null : Number(term.cost),
        billing_cycle: term.billing_cycle,
        auto_renews: sw.auto_renews,
        status: sw.status,
      });
    }
    matching.sort((a, b) => a.days_remaining - b.days_remaining);
    return matching;
  }

  // ---------------------------------------------------------------------------
  // 3. ASSIGNMENTS BY EMPLOYEE: current and past (joining, exit, audit)
  // ---------------------------------------------------------------------------
  async getAssignmentsByEmployeeReport(scope: ReportScope = {}, f: ReportFilters & { include_past?: boolean } = {}) {
    const where: any = {};
    if (f.include_past === false) where.status = 'Active';
    if (f.emp_id) where.emp_id = f.emp_id;
    const emp: any = {};
    if (f.department_id) emp.dep_id = f.department_id;
    if (scope.teamOf) emp.reporting_manager = scope.teamOf;
    if (Object.keys(emp).length) where.employees_software_license_assignments_emp_idToemployees = emp;
    if (scope.ownerId) where.software_licenses = { software_owner_id: scope.ownerId };
    if (f.from) where.assigned_from = { ...(where.assigned_from || {}), gte: new Date(f.from) };
    if (f.to) where.assigned_from = { ...(where.assigned_from || {}), lte: new Date(f.to) };
    if (f.software_id) where.software_id = f.software_id;

    const assignments = await this.prisma.software_license_assignments.findMany({
      where,
      include: {
        software_licenses: { include: { software_license_vendors: true, software_license_categories: true } },
        software_license_revoke_reasons: { select: { label: true } },
        employees_software_license_assignments_emp_idToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
            dep_id: true,
            departments_employees_dep_idTodepartments: { select: { dep_id: true, name: true } },
          },
        },
      },
      orderBy: [{ emp_id: 'asc' }, { assigned_from: 'desc' }],
    });

    return assignments.map((a) => ({
      assignment_id: a.assignment_id,
      employee_id: a.emp_id,
      employee_name: a.employees_software_license_assignments_emp_idToemployees?.name,
      employee_email: a.employees_software_license_assignments_emp_idToemployees?.email,
      department: a.employees_software_license_assignments_emp_idToemployees?.departments_employees_dep_idTodepartments?.name,
      software_id: a.software_id,
      software_code: a.software_licenses.software_code,
      software_name: a.software_licenses.software_name,
      category: a.software_licenses.software_license_categories?.name,
      login_account_id: a.login_account_id,
      assigned_from: a.assigned_from,
      status: a.status,
      revoked_on: a.revoked_on,
      revoke_reason: a.software_license_revoke_reasons?.label || a.revoke_remarks || null,
      is_flagged_to_recover: a.is_flagged_to_recover,
    }));
  }

  // ---------------------------------------------------------------------------
  // 4. SEAT USE: Free, Free 90+ days, cost of free seats per year
  // ---------------------------------------------------------------------------
  async getSeatUtilizationReport(scope: ReportScope = {}, f: ReportFilters = {}, unusedDays = 90) {
    const cutoff = new Date(Date.now() - unusedDays * 86_400_000);
    const softwareList = await this.prisma.software_licenses.findMany({
      where: { ...this.softwareWhere(scope, f, { in: ['Active', 'Expiring Soon', 'Trial'] }), total_seats: { not: null } },
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 },
        software_license_assignments: { select: { assignment_id: true, status: true, revoked_on: true } },
      },
    });

    return softwareList
      .filter((sw) => seatsCounted(sw.license_type))
      .map((sw) => {
        const total = sw.total_seats || 0;
        const active = sw.software_license_assignments.filter((a) => a.status === 'Active').length;
        const unused = Math.max(0, total - active);
        const freedRecently = sw.software_license_assignments.filter((a) => a.status !== 'Active' && a.revoked_on && a.revoked_on > cutoff).length;
        const unusedLong = Math.max(0, unused - freedRecently);
        const t = sw.software_license_terms[0];
        const yearly = t ? yearlyCost(t.billing_cycle, Number(t.cost), d(t.start_date), d(t.expiry_date)) : 0;
        const perSeatYear = costPerSeat(yearly, total) ?? 0;
        return {
          software_id: sw.software_id,
          software_code: sw.software_code,
          software_name: sw.software_name,
          category: sw.software_license_categories?.name,
          vendor: sw.software_license_vendors?.name,
          total_seats: total,
          assigned_seats: active,
          unused_seats: unused,
          unused_seats_long: unusedLong,
          utilization_rate_pct: total > 0 ? Math.round((active / total) * 100) : 0,
          current_term_cost: scope.hideCosts ? null : t ? Number(t.cost) : 0,
          // Cost of free seats = cost per seat per year x free seats (BFD 12 Part 3)
          estimated_wastage_cost: scope.hideCosts ? null : Math.round(perSeatYear * unused),
          is_low_adoption: total > 0 && active / total < 0.5,
        };
      });
  }

  // ---------------------------------------------------------------------------
  // 5. COST: yearly cost by category, vendor and department, and one-time purchases in the period.
  //    A term that crosses the period edge is split by days (BFD 12 Part 3).
  // ---------------------------------------------------------------------------
  async getCostBreakdownReport(scope: ReportScope = {}, f: ReportFilters = {}) {
    const year = todayStr().slice(0, 4);
    const from = f.from || `${year}-01-01`;
    const to = f.to || `${year}-12-31`;
    const periodDays = daysBetween(from, to) + 1;

    const softwareList = await this.prisma.software_licenses.findMany({
      where: this.softwareWhere(scope, f, null),
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        software_license_terms: true,
        software_license_assignments: {
          where: { status: 'Active' },
          select: {
            employees_software_license_assignments_emp_idToemployees: {
              select: { departments_employees_dep_idTodepartments: { select: { name: true } } },
            },
          },
        },
      },
    });

    const categorySpend: Record<string, { count: number; spend: number }> = {};
    const vendorSpend: Record<string, { count: number; spend: number }> = {};
    const deptSpend: Record<string, { count: number; spend: number }> = {};
    const bySoftware: Array<{ software_id: number; software_name: string; category: string; vendor: string; yearly_cost: number; period_cost: number; one_time: number }> = [];
    let totalSpend = 0;
    let oneTimeTotal = 0;

    for (const sw of softwareList) {
      const cat = sw.software_license_categories?.name || 'Uncategorized';
      const ven = sw.software_license_vendors?.name || 'Unknown';
      let periodCost = 0;
      let oneTime = 0;
      let currentYearly = 0;
      const latest = [...sw.software_license_terms].sort((a, b) => b.term_number - a.term_number)[0];

      for (const t of sw.software_license_terms) {
        const start = d(t.start_date)!;
        const expiry = d(t.expiry_date);
        if (t.billing_cycle === 'One-time' || !t.billing_cycle) {
          // One-time purchases are shown in the period they were bought.
          const bought = d(t.purchase_date) || start;
          if (bought >= from && bought <= to) oneTime += Number(t.cost);
          continue;
        }
        const yc = yearlyCost(t.billing_cycle, Number(t.cost), start, expiry);
        if (t === latest) currentYearly = yc;
        const end = expiry || to;
        const overlapStart = start > from ? start : from;
        const overlapEnd = end < to ? end : to;
        if (overlapEnd < overlapStart) continue;
        periodCost += (yc / 365) * (daysBetween(overlapStart, overlapEnd) + 1);
      }
      periodCost = round2(periodCost);
      if (!periodCost && !oneTime) continue;
      totalSpend += periodCost;
      oneTimeTotal += oneTime;
      bySoftware.push({ software_id: sw.software_id, software_name: sw.software_name, category: cat, vendor: ven, yearly_cost: round2(currentYearly), period_cost: periodCost, one_time: oneTime });

      (categorySpend[cat] ||= { count: 0, spend: 0 }).count += 1;
      categorySpend[cat].spend += periodCost;
      (vendorSpend[ven] ||= { count: 0, spend: 0 }).count += 1;
      vendorSpend[ven].spend += periodCost;

      // Department cost = cost per seat x seats assigned to the department's employees;
      // Organisation and Free software are "Company-wide".
      if (seatsCounted(sw.license_type) && sw.total_seats) {
        const perSeat = periodCost / sw.total_seats;
        const counts: Record<string, number> = {};
        for (const a of sw.software_license_assignments) {
          const dep = a.employees_software_license_assignments_emp_idToemployees?.departments_employees_dep_idTodepartments?.name || 'No department';
          counts[dep] = (counts[dep] || 0) + 1;
        }
        for (const [dep, n] of Object.entries(counts)) {
          (deptSpend[dep] ||= { count: 0, spend: 0 }).count += 1;
          deptSpend[dep].spend += perSeat * n;
        }
        const unassigned = Math.max(0, sw.total_seats - sw.software_license_assignments.length);
        if (unassigned) {
          (deptSpend['Unassigned seats'] ||= { count: 0, spend: 0 }).count += 1;
          deptSpend['Unassigned seats'].spend += perSeat * unassigned;
        }
      } else {
        (deptSpend['Company-wide'] ||= { count: 0, spend: 0 }).count += 1;
        deptSpend['Company-wide'].spend += periodCost;
      }
    }

    const share = (n: number) => (totalSpend > 0 ? Math.round((n / totalSpend) * 100) : 0);
    const group = (rec: Record<string, { count: number; spend: number }>, key: string) =>
      Object.entries(rec)
        .map(([name, data]) => ({ [key]: name, software_count: data.count, total_cost: round2(data.spend), percentage_of_total: share(data.spend) }))
        .sort((a: any, b: any) => b.total_cost - a.total_cost);

    return {
      period: { from, to, days: periodDays },
      total_active_software: bySoftware.length,
      total_spend: round2(totalSpend),
      one_time_total: round2(oneTimeTotal),
      by_category: group(categorySpend, 'category'),
      by_vendor: group(vendorSpend, 'vendor'),
      by_department: group(deptSpend, 'department'),
      by_software: bySoftware.sort((a, b) => b.period_cost - a.period_cost),
    };
  }

  // ---------------------------------------------------------------------------
  // 6. EXPIRED & DISCONTINUED
  // ---------------------------------------------------------------------------
  async getExpiredAndDiscontinuedReport(scope: ReportScope = {}, f: ReportFilters = {}) {
    const where = this.softwareWhere(scope, { ...f, status: undefined }, null);
    where.status = f.status && f.status !== 'All' ? f.status : { in: ['Expired', 'Discontinued'] };
    const rows = await this.prisma.software_licenses.findMany({
      where,
      include: {
        software_license_categories: true,
        software_license_vendors: true,
        software_license_discontinue_reasons: true,
        software_licenses: { select: { software_id: true, software_code: true, software_name: true } },
        software_license_terms: { orderBy: { term_number: 'desc' }, take: 1 },
        software_license_assignments: { select: { status: true, revoked_on: true } },
      },
      orderBy: { updated_at: 'desc' },
    });
    // Seats at the end: active seats, or for a discontinued software the seats revoked on its date.
    return rows.map((r) => {
      const ended = d(r.discontinue_date);
      const seatsAtEnd = r.status === 'Discontinued' && ended
        ? r.software_license_assignments.filter((a) => d(a.revoked_on) === ended).length
        : r.software_license_assignments.filter((a) => a.status === 'Active').length;
      const { software_license_assignments: _a, license_key: _k, ...rest } = r as any;
      return { ...rest, seats_at_end: seatsAtEnd };
    });
  }

  // ---------------------------------------------------------------------------
  // 7. HISTORY LOG: every History entry in a date range; filter by event and person
  // ---------------------------------------------------------------------------
  async getActivityLogsReport(scope: ReportScope = {}, f: ReportFilters = {}) {
    const where: any = { entity_type: 'SOFTWARE_LICENSE' };
    if (f.from || f.to) {
      where.performed_at = {};
      if (f.from) where.performed_at.gte = new Date(`${f.from}T00:00:00`);
      if (f.to) where.performed_at.lte = new Date(`${f.to}T23:59:59`);
    }
    if (f.event) where.event = f.event;
    if (f.performed_by) where.performed_by = f.performed_by;
    if (f.software_id) where.entity_id = f.software_id;
    if (scope.ownerId) {
      const own = await this.prisma.software_licenses.findMany({ where: { software_owner_id: scope.ownerId }, select: { software_id: true } });
      where.entity_id = f.software_id && own.some((o) => o.software_id === f.software_id) ? f.software_id : { in: own.map((o) => o.software_id) };
    }

    const logs = await this.prisma.activity_logs.findMany({
      where,
      take: Math.min(Math.max(f.limit || 500, 1), 5000),
      orderBy: { performed_at: 'desc' },
      include: { employees: { select: { emp_id: true, name: true, email: true, profile_picture: true } } },
    });
    const names = new Map(
      (await this.prisma.software_licenses.findMany({
        where: { software_id: { in: Array.from(new Set(logs.map((l) => l.entity_id))) } },
        select: { software_id: true, software_name: true, software_code: true },
      })).map((s) => [s.software_id, `${s.software_code} ${s.software_name}`]),
    );

    return logs.map((l) => ({
      log_id: l.log_id.toString(),
      software_id: l.entity_id,
      software: names.get(l.entity_id) || `#${l.entity_id}`,
      event: l.event,
      summary: l.summary,
      details: l.details,
      performed_at: l.performed_at,
      performed_by: l.employees,
      performed_by_name: l.employees?.name || 'System',
    }));
  }
}
