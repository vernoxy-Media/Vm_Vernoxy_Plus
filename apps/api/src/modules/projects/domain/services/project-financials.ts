/**
 * Actual Expenses by Project and Project Profit (pure, no database access).
 *
 *   Total Actual Project Expense = Employee Cost + Direct Project Expenses + Allocated Office Expenses
 *   Project Profit               = Project Revenue - Total Actual Project Expense
 *   Project Profit %             = Project Profit / Project Revenue x 100
 */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Working days of a month: every day except the weekly off days (0 = Sunday ... 6 = Saturday).
 * Vernoxy works Monday to Saturday, so only Sundays are off.
 */
export function workingDaysInMonth(year: number, month0: number, weeklyOffDays: number[] = [0]): number {
  const days = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  let n = 0;
  for (let d = 1; d <= days; d++) {
    if (!weeklyOffDays.includes(new Date(Date.UTC(year, month0, d)).getUTCDay())) n++;
  }
  return n;
}

/** Hourly Rate = (Monthly Salary / Monthly Working Days) / Daily Working Hours. */
export function hourlyRate(monthlySalary: number, workingDays: number, dailyHours: number): number {
  if (!(monthlySalary > 0) || !(workingDays > 0) || !(dailyHours > 0)) return 0;
  return monthlySalary / workingDays / dailyHours;
}

/** Employee Project Cost = Hourly Rate x Project Hours. */
export function employeeCost(rate: number, hours: number): number {
  return round2(rate * hours);
}

/** Allocated Office Expense = (Project Hours / Total Hours Across All Projects) x Total Office Expenses. */
export function allocateOffice(projectHours: number, totalHours: number, totalOffice: number): number {
  if (!(totalHours > 0) || !(totalOffice > 0) || !(projectHours > 0)) return 0;
  return round2((projectHours / totalHours) * totalOffice);
}

export interface RevenueProject {
  project_id: number;
  client_id: number | null;
  /** Revenue set on the project itself (the override), if any. */
  project_revenue: number | null;
}

/**
 * Revenue of each project. A project's own revenue wins. Otherwise the client's revenue, after taking
 * away the projects that have their own, is split equally between the client's other projects.
 */
export function resolveRevenue(projects: RevenueProject[], clientRevenue: Map<number, number | null>): Map<number, number | null> {
  const out = new Map<number, number | null>();
  const byClient = new Map<number, RevenueProject[]>();
  for (const p of projects) {
    if (p.project_revenue != null) out.set(p.project_id, round2(p.project_revenue));
    if (p.client_id != null) byClient.set(p.client_id, [...(byClient.get(p.client_id) ?? []), p]);
  }
  for (const p of projects) {
    if (out.has(p.project_id)) continue;
    const rev = p.client_id != null ? clientRevenue.get(p.client_id) ?? null : null;
    if (rev == null) {
      out.set(p.project_id, null);
      continue;
    }
    const siblings = byClient.get(p.client_id!) ?? [];
    const overridden = siblings.reduce((s, x) => s + (x.project_revenue ?? 0), 0);
    const open = siblings.filter((x) => x.project_revenue == null).length || 1;
    out.set(p.project_id, round2(Math.max(0, rev - overridden) / open));
  }
  return out;
}

export interface ProjectFinancial {
  employee_cost: number;
  direct_expense: number;
  office_expense: number;
  actual_expense: number;
  revenue: number | null;
  profit: number | null;
  profit_percent: number | null;
}

export function summarise(employee_cost: number, direct_expense: number, office_expense: number, revenue: number | null): ProjectFinancial {
  const actual = round2(employee_cost + direct_expense + office_expense);
  const profit = revenue == null ? null : round2(revenue - actual);
  return {
    employee_cost: round2(employee_cost),
    direct_expense: round2(direct_expense),
    office_expense: round2(office_expense),
    actual_expense: actual,
    revenue,
    profit,
    profit_percent: profit == null || !revenue ? null : round2((profit / revenue) * 100),
  };
}
