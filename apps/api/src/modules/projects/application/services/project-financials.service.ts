import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { timeByEmployee } from '../../../tasks/public-api';
import {
  allocateOffice,
  employeeCost,
  hourlyRate,
  resolveRevenue,
  summarise,
  workingDaysInMonth,
  type ProjectFinancial,
} from '../../domain/services/project-financials';

/** Only approved money counts: Draft, Submitted and Rejected claims are left out. */
const COUNTED = ['APPROVED', 'REIMBURSED'];

export interface ProjectFinancialRow extends ProjectFinancial {
  project_id: number;
  project_no: string;
  project_name: string;
  client_id: number | null;
  client_name: string | null;
  /** Hours worked on the project by everyone (task and sub-task time logs). */
  hours: number;
  revenue_source: 'project' | 'client' | 'none';
}

/**
 * Actual Expenses by Project and Project Profit. Admin only: money figures never leave this service
 * for anybody else (the controller checks the role).
 */
@Injectable()
export class ProjectFinancialsService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(filter: { clientId?: number; projectId?: number } = {}) {
    const [projects, clients, tasks, shift, direct, office] = await Promise.all([
      this.prisma.projects.findMany({
        where: { deleted_at: null },
        select: { project_id: true, project_no: true, project_name: true, client_id: true, client_name: true, project_revenue: true },
        orderBy: { project_name: 'asc' },
      }),
      this.prisma.clients.findMany({ where: { deleted_at: null }, select: { client_id: true, project_revenue: true } }),
      this.prisma.tasks.findMany({ where: { deleted_at: null, project_id: { not: null } }, select: { project_id: true, work_logs: true } }),
      this.prisma.attendance_shifts.findFirst({ where: { is_default: true, deleted_at: null }, select: { full_day_hours: true, weekly_off_days: true } }),
      this.prisma.$queryRaw<Array<{ project_id: number; total: number }>>`
        SELECT project_id, COALESCE(SUM(amount), 0)::float8 AS total FROM expense_claims
        WHERE project_id IS NOT NULL AND expense_type = 'Project Expense' AND status = ANY(${COUNTED}) AND deleted_at IS NULL
        GROUP BY project_id`,
      this.prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(amount), 0)::float8 AS total FROM expense_claims
        WHERE expense_type = 'Office Expense' AND status = ANY(${COUNTED}) AND deleted_at IS NULL`,
    ]);

    // Seconds each employee worked on each project.
    const secs = new Map<number, Map<number, number>>(); // project -> employee -> seconds
    for (const t of tasks) {
      for (const e of timeByEmployee(t.work_logs)) {
        const m = secs.get(t.project_id!) ?? new Map<number, number>();
        m.set(e.employee_id, (m.get(e.employee_id) ?? 0) + e.seconds);
        secs.set(t.project_id!, m);
      }
    }

    const empIds = [...new Set([...secs.values()].flatMap((m) => [...m.keys()]))];
    const emps = empIds.length ? await this.prisma.employees.findMany({ where: { emp_id: { in: empIds } }, select: { emp_id: true, salary: true } }) : [];
    const salary = new Map(emps.map((e) => [e.emp_id, Number(e.salary ?? 0)]));

    // Working days of the current month (every day but the weekly off days) and the shift's daily hours.
    const now = new Date();
    const offDays = shift?.weekly_off_days?.length ? shift.weekly_off_days : [0];
    const days = workingDaysInMonth(now.getUTCFullYear(), now.getUTCMonth(), offDays);
    const dailyHours = Number(shift?.full_day_hours ?? 8);

    const hoursOf = (pid: number) => [...(secs.get(pid)?.values() ?? [])].reduce((a, s) => a + s, 0) / 3600;
    const totalHours = projects.reduce((a, p) => a + hoursOf(p.project_id), 0);
    const totalOffice = office[0]?.total ?? 0;
    const directBy = new Map(direct.map((d) => [d.project_id, d.total]));

    const revenue = resolveRevenue(
      projects.map((p) => ({ project_id: p.project_id, client_id: p.client_id, project_revenue: p.project_revenue != null ? Number(p.project_revenue) : null })),
      new Map(clients.map((c) => [c.client_id, c.project_revenue != null ? Number(c.project_revenue) : null])),
    );

    let rows: ProjectFinancialRow[] = projects.map((p) => {
      let cost = 0;
      for (const [empId, s] of secs.get(p.project_id) ?? []) cost += employeeCost(hourlyRate(salary.get(empId) ?? 0, days, dailyHours), s / 3600);
      const hours = hoursOf(p.project_id);
      const rev = revenue.get(p.project_id) ?? null;
      return {
        project_id: p.project_id,
        project_no: p.project_no,
        project_name: p.project_name,
        client_id: p.client_id,
        client_name: p.client_name,
        hours: Math.round(hours * 100) / 100,
        revenue_source: p.project_revenue != null ? 'project' : rev != null ? 'client' : 'none',
        ...summarise(cost, directBy.get(p.project_id) ?? 0, allocateOffice(hours, totalHours, totalOffice), rev),
      };
    });

    if (filter.clientId) rows = rows.filter((r) => r.client_id === filter.clientId);
    if (filter.projectId) rows = rows.filter((r) => r.project_id === filter.projectId);

    const sum = (f: (r: ProjectFinancialRow) => number) => Math.round(rows.reduce((a, r) => a + f(r), 0) * 100) / 100;
    const withRevenue = rows.filter((r) => r.revenue != null);
    const totalRevenue = withRevenue.reduce((a, r) => a + (r.revenue ?? 0), 0);
    const totalProfit = withRevenue.reduce((a, r) => a + (r.profit ?? 0), 0);
    const client = filter.clientId ? clients.find((c) => c.client_id === filter.clientId) : undefined;
    return {
      client: client ? { client_id: client.client_id, revenue: client.project_revenue != null ? Number(client.project_revenue) : null } : null,
      basis: { working_days: days, daily_hours: dailyHours, weekly_off_days: offDays, counted_statuses: COUNTED },
      totals: {
        employee_cost: sum((r) => r.employee_cost),
        direct_expense: sum((r) => r.direct_expense),
        office_expense: sum((r) => r.office_expense),
        actual_expense: sum((r) => r.actual_expense),
        revenue: withRevenue.length ? Math.round(totalRevenue * 100) / 100 : null,
        profit: withRevenue.length ? Math.round(totalProfit * 100) / 100 : null,
        profit_percent: withRevenue.length && totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : null,
      },
      projects: rows,
    };
  }

  /** Revenue on one project (overrides the client's share). `null` clears it. */
  async setProjectRevenue(projectId: number, revenue: number | null, empId: number) {
    this.assertRevenue(revenue);
    const p = await this.prisma.projects.findFirst({ where: { project_id: projectId, deleted_at: null }, select: { project_id: true } });
    if (!p) throw new NotFoundException('Project not found.');
    await this.prisma.projects.update({ where: { project_id: projectId }, data: { project_revenue: revenue, updated_by: empId, updated_at: new Date() } });
    return this.compute({ projectId });
  }

  private assertRevenue(revenue: number | null) {
    if (revenue === null) return;
    if (!Number.isFinite(revenue) || revenue < 0 || revenue > 99999999999 || Math.round(revenue * 100) !== Number((revenue * 100).toFixed(6))) {
      throw new BadRequestException('Please enter a valid amount (0 or more, up to 2 decimals).');
    }
  }
}
