import { LEAD_STATUSES, OPEN_STATUSES } from '../entities/sales-lead';

/** One lead, with only what the report needs. */
export interface ReportLeadRow {
  lead_id: number;
  stage: string | null;
  source: string | null;
  service_fit: string | null;
  lead_by_id: number | null;
  lead_by_name: string | null;
  lost_reason: string | null;
  created_at: Date;
  won_on: Date | null;
}

export interface ReportPeriod {
  /** Inclusive start of the first day, or null for "from the beginning". */
  from: Date | null;
  /** Inclusive end of the last day, or null for "until now". */
  to: Date | null;
}

export interface ReportExtras {
  companies_total: number;
  companies_in_period: number;
  overdue_follow_ups: number;
}

export interface CountRow {
  name: string;
  total: number;
  converted: number;
  lost: number;
  conversion_rate: number;
}

export interface SalesReport {
  period: { from: string | null; to: string | null };
  totals: {
    companies: number;
    companies_in_period: number;
    leads: number;
    open: number;
    converted: number;
    lost: number;
    on_hold: number;
    conversion_rate: number;
    avg_days_to_convert: number | null;
    overdue_follow_ups: number;
  };
  by_stage: Array<{ stage: string; count: number }>;
  by_source: CountRow[];
  by_user: Array<CountRow & { emp_id: number | null; open: number }>;
  by_service_fit: CountRow[];
  lost_reasons: Array<{ reason: string; count: number; percent: number }>;
  trend: Array<{ month: string; label: string; created: number; converted: number }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NONE = 'Not set';

/** Percentage with one decimal; 0 when there is nothing to divide by. */
export const percent = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/** A calendar day (YYYY-MM-DD) as the start or the end of that day in India time. */
export function istDayBoundary(day: string, edge: 'start' | 'end'): Date {
  return new Date(`${day}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}+05:30`);
}

/** YYYY-MM of an instant, seen in India time. */
const monthKey = (d: Date): string => {
  const ist = new Date(d.getTime() + IST_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`;
};

const stageOf = (row: ReportLeadRow): string => row.stage || 'New';

/** Service Fit can hold several services, separated by commas. */
const fitsOf = (row: ReportLeadRow): string[] => {
  const parts = (row.service_fit ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [NONE];
};

function group(rows: ReportLeadRow[], keys: (r: ReportLeadRow) => string[]): CountRow[] {
  const map = new Map<string, { total: number; converted: number; lost: number }>();
  for (const r of rows) {
    for (const k of keys(r)) {
      const g = map.get(k) ?? { total: 0, converted: 0, lost: 0 };
      g.total += 1;
      if (stageOf(r) === 'Converted') g.converted += 1;
      if (stageOf(r) === 'Lost') g.lost += 1;
      map.set(k, g);
    }
  }
  return [...map.entries()]
    .map(([name, g]) => ({ name, ...g, conversion_rate: percent(g.converted, g.total) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/**
 * Turns the leads into the numbers of the Sales Reports page.
 * The figures follow the leads ADDED inside the period; the trend always shows the six months up to the end of it.
 */
export function buildSalesReport(
  allRows: ReportLeadRow[],
  period: ReportPeriod,
  extras: ReportExtras,
  now: Date = new Date(),
): SalesReport {
  const inPeriod = allRows.filter(
    (r) => (!period.from || r.created_at >= period.from) && (!period.to || r.created_at <= period.to),
  );

  const count = (stage: string) => inPeriod.filter((r) => stageOf(r) === stage).length;
  const converted = count('Converted');
  const lost = count('Lost');
  const open = inPeriod.filter((r) => (OPEN_STATUSES as readonly string[]).includes(stageOf(r))).length;

  const convertDays = inPeriod
    .filter((r) => stageOf(r) === 'Converted' && r.won_on)
    .map((r) => Math.max(0, (r.won_on!.getTime() - r.created_at.getTime()) / DAY_MS));
  const avgDays = convertDays.length > 0 ? Math.round((convertDays.reduce((a, b) => a + b, 0) / convertDays.length) * 10) / 10 : null;

  const userMap = new Map<string, { emp_id: number | null; name: string; rows: ReportLeadRow[] }>();
  for (const r of inPeriod) {
    const key = r.lead_by_id === null ? 'none' : String(r.lead_by_id);
    const entry = userMap.get(key) ?? { emp_id: r.lead_by_id, name: r.lead_by_name ?? 'Unassigned', rows: [] };
    entry.rows.push(r);
    userMap.set(key, entry);
  }
  const byUser = [...userMap.values()]
    .map((u) => {
      const conv = u.rows.filter((r) => stageOf(r) === 'Converted').length;
      return {
        emp_id: u.emp_id,
        name: u.name,
        total: u.rows.length,
        open: u.rows.filter((r) => (OPEN_STATUSES as readonly string[]).includes(stageOf(r))).length,
        converted: conv,
        lost: u.rows.filter((r) => stageOf(r) === 'Lost').length,
        conversion_rate: percent(conv, u.rows.length),
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const reasonMap = new Map<string, number>();
  for (const r of inPeriod.filter((x) => stageOf(x) === 'Lost')) {
    const k = r.lost_reason?.trim() || NONE;
    reasonMap.set(k, (reasonMap.get(k) ?? 0) + 1);
  }
  const lostReasons = [...reasonMap.entries()]
    .map(([reason, n]) => ({ reason, count: n, percent: percent(n, lost) }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));

  // Six calendar months, oldest first, ending with the month of the period end (or now).
  const end = new Date((period.to ?? now).getTime() + IST_MS);
  const trend: SalesReport['trend'] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    trend.push({
      month: key,
      label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
      created: allRows.filter((r) => monthKey(r.created_at) === key).length,
      converted: allRows.filter((r) => stageOf(r) === 'Converted' && r.won_on && monthKey(r.won_on) === key).length,
    });
  }

  return {
    period: {
      from: period.from ? new Date(period.from.getTime() + IST_MS).toISOString().slice(0, 10) : null,
      to: period.to ? new Date(period.to.getTime() + IST_MS).toISOString().slice(0, 10) : null,
    },
    totals: {
      companies: extras.companies_total,
      companies_in_period: extras.companies_in_period,
      leads: inPeriod.length,
      open,
      converted,
      lost,
      on_hold: count('On Hold'),
      conversion_rate: percent(converted, inPeriod.length),
      avg_days_to_convert: avgDays,
      overdue_follow_ups: extras.overdue_follow_ups,
    },
    by_stage: LEAD_STATUSES.map((stage) => ({ stage, count: count(stage) })),
    by_source: group(inPeriod, (r) => [r.source?.trim() || NONE]),
    by_user: byUser,
    by_service_fit: group(inPeriod, fitsOf),
    lost_reasons: lostReasons,
    trend,
  };
}
