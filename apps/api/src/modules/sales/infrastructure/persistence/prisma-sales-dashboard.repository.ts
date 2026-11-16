import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  SalesDashboardFilters,
  SalesDashboardRepositoryPort,
  SalesDashboardDataResponse,
  UserChartPermission,
  US02LeadStatusOverview,
  US03NewLeadsAddedTrend,
  US04LeadToClientConversionTrend,
  US05LeadSourcePerformance,
  US06ServiceFitDemand,
  US07LeadOwnerPerformance,
  US08LeadConversionCycleTime,
  US09ConversationActivityTrend,
  US10RevenueGenerated,
  US11SalesProfitability,
  US12SalesActivityCounters,
} from '../../application/ports/sales-dashboard.repository.port';

const DEFAULT_CHART_KEYS = [
  'us02', 'us03', 'us04', 'us05', 'us06', 'us07', 'us08', 'us09', 'us10', 'us11',
  'us12_calls', 'us12_emails', 'us12_today_fu', 'us12_total_fu', 'us12_duration', 'us12_unanswered', 'us12_leads', 'us12_companies'
];

const SETTING_KEY_DEFAULTS = 'sales_dashboard:default_filters';
const SETTING_KEY_PERMISSIONS = 'sales_dashboard:chart_permissions';

const LEAD_SOURCES = [
  'Cold calling',
  'Reference',
  'Website enquiry',
  'LinkedIn',
  'Exhibition',
  'Social media',
  'Existing client',
  'Other',
];

const SERVICE_FITS = [
  'Website Development',
  'CRM / ERP Software',
  'Mobile App',
  'Digital Marketing',
  'Custom Software',
];

const STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost', 'On Hold'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toMonthYear(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function resolveDateRange(dateRange: string | undefined, from?: string, to?: string): { start: Date | null; end: Date | null; isAllTime: boolean } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (dateRange) {
    case 'today': {
      const s = new Date(y, m, d, 0, 0, 0);
      const e = new Date(y, m, d, 23, 59, 59, 999);
      return { start: s, end: e, isAllTime: false };
    }
    case 'last_7_days': {
      const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      s.setHours(0, 0, 0, 0);
      return { start: s, end: now, isAllTime: false };
    }
    case 'last_30_days': {
      const s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      s.setHours(0, 0, 0, 0);
      return { start: s, end: now, isAllTime: false };
    }
    case 'this_month': {
      const s = new Date(y, m, 1, 0, 0, 0);
      const e = new Date(y, m + 1, 0, 23, 59, 59, 999);
      return { start: s, end: e, isAllTime: false };
    }
    case 'last_6_months': {
      const s = new Date(y, m - 5, 1, 0, 0, 0);
      const e = new Date(y, m + 1, 0, 23, 59, 59, 999);
      return { start: s, end: e, isAllTime: false };
    }
    case 'this_year': {
      const s = new Date(y, 0, 1, 0, 0, 0);
      const e = new Date(y, 11, 31, 23, 59, 59, 999);
      return { start: s, end: e, isAllTime: false };
    }
    case 'custom': {
      const s = from ? new Date(`${from}T00:00:00`) : null;
      const e = to ? new Date(`${to}T23:59:59.999`) : null;
      return { start: s, end: e, isAllTime: false };
    }
    case 'all_time':
    default:
      return { start: null, end: null, isAllTime: true };
  }
}

@Injectable()
export class PrismaSalesDashboardRepository implements SalesDashboardRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultConfig(): Promise<{ default_filters: any; updated_at?: string; updated_by_name?: string }> {
    const setting = await this.prisma.app_settings.findFirst({
      where: { setting_key: SETTING_KEY_DEFAULTS, deleted_at: null },
      include: { employees_app_settings_updated_byToemployees: { select: { name: true } } },
    });
    if (!setting) {
      return {
        default_filters: {
          date_range: 'this_month',
          lead_source: [],
          lead_by: 'all',
          service_fit: [],
          status: [],
          city: [],
          industry_ids: [],
        },
      };
    }
    try {
      const parsed = JSON.parse(setting.setting_value);
      return {
        default_filters: parsed,
        updated_at: setting.updated_at ? setting.updated_at.toISOString() : undefined,
        updated_by_name: setting.employees_app_settings_updated_byToemployees?.name,
      };
    } catch {
      return {
        default_filters: { date_range: 'this_month' },
      };
    }
  }

  async saveDefaultConfig(defaults: any, actorEmpId: number): Promise<void> {
    const existing = await this.prisma.app_settings.findFirst({
      where: { setting_key: SETTING_KEY_DEFAULTS, deleted_at: null },
    });
    const val = JSON.stringify(defaults);
    if (existing) {
      await this.prisma.app_settings.update({
        where: { setting_id: existing.setting_id },
        data: { setting_value: val, updated_at: new Date(), updated_by: actorEmpId },
      });
    } else {
      await this.prisma.app_settings.create({
        data: {
          setting_key: SETTING_KEY_DEFAULTS,
          setting_value: val,
          description: 'Sales Management Dashboard Default Filters',
          created_by: actorEmpId,
        },
      });
    }
  }

  async getUserPermissions(empId: number, isAdmin: boolean): Promise<Record<string, boolean>> {
    if (isAdmin) {
      const all: Record<string, boolean> = {};
      DEFAULT_CHART_KEYS.forEach((k) => (all[k] = true));
      return all;
    }
    const setting = await this.prisma.app_settings.findFirst({
      where: { setting_key: `${SETTING_KEY_PERMISSIONS}:${empId}`, deleted_at: null },
    });
    if (!setting) {
      // Default: all enabled until configured
      const all: Record<string, boolean> = {};
      DEFAULT_CHART_KEYS.forEach((k) => (all[k] = true));
      return all;
    }
    try {
      return JSON.parse(setting.setting_value);
    } catch {
      const all: Record<string, boolean> = {};
      DEFAULT_CHART_KEYS.forEach((k) => (all[k] = true));
      return all;
    }
  }

  async listAllUserPermissions(): Promise<UserChartPermission[]> {
    const users = await this.prisma.employees.findMany({
      where: {
        deleted_at: null,
        status: 'Active',
        OR: [
          { roles_employees_role_idToroles: { is_admin: true } },
          { departments_employees_dep_idTodepartments: { name: { startsWith: 'Sales', mode: 'insensitive' } } },
        ],
      },
      orderBy: { name: 'asc' },
      select: { emp_id: true, name: true, roles_employees_role_idToroles: { select: { is_admin: true } } },
    });

    const settings = await this.prisma.app_settings.findMany({
      where: {
        setting_key: { startsWith: `${SETTING_KEY_PERMISSIONS}:` },
        deleted_at: null,
      },
    });
    const map = new Map<string, Record<string, boolean>>();
    settings.forEach((s) => {
      try {
        map.set(s.setting_key, JSON.parse(s.setting_value));
      } catch {}
    });

    return users.map((u) => {
      const isAdmin = u.roles_employees_role_idToroles?.is_admin === true;
      let userPerms = map.get(`${SETTING_KEY_PERMISSIONS}:${u.emp_id}`);
      if (!userPerms) {
        userPerms = {};
        DEFAULT_CHART_KEYS.forEach((k) => (userPerms![k] = true));
      }
      return {
        emp_id: u.emp_id,
        name: u.name,
        is_admin: isAdmin,
        permissions: userPerms,
      };
    });
  }

  async saveUserPermissions(targetEmpId: number, permissions: Record<string, boolean>, actorEmpId: number): Promise<void> {
    const key = `${SETTING_KEY_PERMISSIONS}:${targetEmpId}`;
    const existing = await this.prisma.app_settings.findFirst({
      where: { setting_key: key, deleted_at: null },
    });
    const val = JSON.stringify(permissions);
    if (existing) {
      await this.prisma.app_settings.update({
        where: { setting_id: existing.setting_id },
        data: { setting_value: val, updated_at: new Date(), updated_by: actorEmpId },
      });
    } else {
      await this.prisma.app_settings.create({
        data: {
          setting_key: key,
          setting_value: val,
          description: `Sales Dashboard Chart Access for Employee #${targetEmpId}`,
          created_by: actorEmpId,
        },
      });
    }
  }

  async getDashboardData(
    filters: SalesDashboardFilters,
    actorEmpId: number,
    isAdmin: boolean,
    allowedCharts: Record<string, boolean>,
    extraOptions?: {
      us03_group_by?: 'day' | 'week' | 'month';
      us08_compare_by?: 'source' | 'owner';
      us09_group_by?: 'day' | 'week' | 'month';
      us12_date?: string;
      us12_follow_up_from?: string;
      us12_follow_up_to?: string;
    }
  ): Promise<SalesDashboardDataResponse> {
    const { start: dateStart, end: dateEnd, isAllTime } = resolveDateRange(filters.date_range, filters.from, filters.to);

    // 1. Fetch base leads matching general filters
    // For non-admin, if they are restricted to their own leads or if lead_by = 'me'
    let ownerEmpId: number | undefined = undefined;
    if (!isAdmin || filters.lead_by === 'me') {
      ownerEmpId = actorEmpId;
    } else if (filters.lead_by && filters.lead_by !== 'all') {
      const parsed = parseInt(filters.lead_by, 10);
      if (!Number.isNaN(parsed)) ownerEmpId = parsed;
    }

    const leadWhere: any = {
      deleted_at: null,
    };
    if (ownerEmpId) {
      leadWhere.lead_by_id = ownerEmpId;
    }
    if (filters.lead_source && filters.lead_source.length > 0) {
      leadWhere.lead_source = { in: filters.lead_source };
    }
    if (filters.service_fit && filters.service_fit.length > 0) {
      leadWhere.OR = filters.service_fit.map((sf: string) => ({
        service_fit: { contains: sf, mode: 'insensitive' },
      }));
    }
    if (filters.status && filters.status.length > 0) {
      leadWhere.lead_stage = { in: filters.status };
    }
    if (filters.city && filters.city.length > 0) {
      leadWhere.city = { in: filters.city, mode: 'insensitive' };
    }
    if (filters.industry_ids && filters.industry_ids.length > 0) {
      leadWhere.industry_id = { in: filters.industry_ids };
    }
    if (filters.q && filters.q.trim()) {
      const q = filters.q.trim();
      leadWhere.AND = [
        ...(leadWhere.AND || []),
        {
          OR: [
            { lead_code: { contains: q, mode: 'insensitive' } },
            { company_name: { contains: q, mode: 'insensitive' } },
            { contact_person: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { employees_leads_lead_by_idToemployees: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const allLeads = await this.prisma.leads.findMany({
      where: leadWhere,
      include: {
        employees_leads_lead_by_idToemployees: { select: { emp_id: true, name: true } },
        companies: { select: { company_id: true, name: true, city: true, industry_id: true } },
      },
    });

    const resp: SalesDashboardDataResponse = {
      filters,
    };

    // Filter leads by Date Added for creation-based charts (US02, US03, US05, US06, US07)
    const leadsByDateAdded = allLeads.filter((l) => {
      if (isAllTime) return true;
      const created = new Date(l.created_at);
      if (dateStart && created < dateStart) return false;
      if (dateEnd && created > dateEnd) return false;
      return true;
    });

    // Filter leads by Won on for conversion-based charts (US04, US08, US10, US11)
    const convertedLeadsByWonOn = allLeads.filter((l) => {
      if (l.lead_stage !== 'Converted' || !l.won_on) return false;
      if (isAllTime) {
        // Last 6 months for All Time trend
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);
        return new Date(l.won_on) >= sixMonthsAgo;
      }
      const won = new Date(l.won_on);
      if (dateStart && won < dateStart) return false;
      if (dateEnd && won > dateEnd) return false;
      return true;
    });

    // ==========================================
    // US02 - Lead Status Overview (Donut Chart)
    // ==========================================
    if (allowedCharts.us02 !== false) {
      const statusCounts = new Map<string, number>();
      STATUSES.forEach((s) => statusCounts.set(s, 0));
      leadsByDateAdded.forEach((l) => {
        const stage = l.lead_stage || 'New';
        statusCounts.set(stage, (statusCounts.get(stage) || 0) + 1);
      });

      const total = leadsByDateAdded.length;
      let maxCount = -1;
      let maxStatus = '';
      statusCounts.forEach((count, status) => {
        if (count > maxCount) {
          maxCount = count;
          maxStatus = status;
        }
      });

      resp.us02_lead_status = {
        total,
        statuses: STATUSES.map((status) => {
          const count = statusCounts.get(status) || 0;
          return {
            status,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            is_max: total > 0 && status === maxStatus && count > 0,
          };
        }),
      };
    }

    // ==========================================
    // US03 - New Leads Added Trend (Area Chart)
    // ==========================================
    if (allowedCharts.us03 !== false) {
      const groupBy = extraOptions?.us03_group_by || 'week';
      const periodsMap = new Map<string, number>();

      // Populate periods based on grouping and date range
      if (groupBy === 'day') {
        const dayLeads = leadsByDateAdded.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        dayLeads.forEach((l) => {
          const key = toYmd(new Date(l.created_at));
          periodsMap.set(key, (periodsMap.get(key) || 0) + 1);
        });
      } else if (groupBy === 'month') {
        leadsByDateAdded.forEach((l) => {
          const key = toMonthYear(new Date(l.created_at));
          periodsMap.set(key, (periodsMap.get(key) || 0) + 1);
        });
      } else {
        // Week: Monday to Sunday
        leadsByDateAdded.forEach((l) => {
          const monday = getMonday(new Date(l.created_at));
          const key = toYmd(monday);
          periodsMap.set(key, (periodsMap.get(key) || 0) + 1);
        });
      }

      const periods = Array.from(periodsMap.entries()).map(([period, count]) => ({ period, count }));

      // Calculate Trend Tag vs Previous Equivalent Period
      const currentCount = leadsByDateAdded.length;
      let previousCount = 0;
      if (filters.date_range === 'this_month' || !filters.date_range) {
        // Compare current month elapsed days with same elapsed days in previous month
        const now = new Date();
        const elapsedDays = now.getDate();
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthCutoff = new Date(now.getFullYear(), now.getMonth() - 1, elapsedDays, 23, 59, 59, 999);
        previousCount = allLeads.filter((l) => {
          const d = new Date(l.created_at);
          return d >= prevMonthStart && d <= prevMonthCutoff;
        }).length;
      } else if (dateStart && dateEnd) {
        const durationMs = dateEnd.getTime() - dateStart.getTime();
        const prevStart = new Date(dateStart.getTime() - durationMs);
        const prevEnd = new Date(dateStart.getTime() - 1);
        previousCount = allLeads.filter((l) => {
          const d = new Date(l.created_at);
          return d >= prevStart && d <= prevEnd;
        }).length;
      }

      let pctChange = 0;
      let category: 'Increasing' | 'Decreasing' | 'Steady' = 'Steady';
      let arrow: 'up' | 'down' | 'horizontal' = 'horizontal';
      let color: 'green' | 'red' | 'grey' = 'grey';
      let isNew = false;

      if (previousCount === 0 && currentCount > 0) {
        category = 'Increasing';
        arrow = 'up';
        color = 'green';
        isNew = true;
        pctChange = 100;
      } else if (previousCount === 0 && currentCount === 0) {
        category = 'Steady';
        arrow = 'horizontal';
        color = 'grey';
        pctChange = 0;
      } else {
        pctChange = Math.round(((currentCount - previousCount) / previousCount) * 1000) / 10;
        if (pctChange > 5) {
          category = 'Increasing';
          arrow = 'up';
          color = 'green';
        } else if (pctChange < -5) {
          category = 'Decreasing';
          arrow = 'down';
          color = 'red';
        } else {
          category = 'Steady';
          arrow = 'horizontal';
          color = 'grey';
        }
      }

      resp.us03_new_leads_trend = {
        group_by: groupBy,
        periods,
        trend_tag: {
          category,
          percentage: Math.abs(pctChange),
          is_new: isNew,
          arrow,
          color,
        },
      };
    }

    // ==========================================
    // US04 - Lead-to-Client Conversion Trend
    // ==========================================
    if (allowedCharts.us04 !== false) {
      const monthMap = new Map<string, number>();
      // Pre-fill last 6 months
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthMap.set(toMonthYear(d), 0);
      }

      convertedLeadsByWonOn.forEach((l) => {
        if (l.won_on) {
          const key = toMonthYear(new Date(l.won_on));
          monthMap.set(key, (monthMap.get(key) || 0) + 1);
        }
      });

      let prevVal: number | undefined = undefined;
      const months = Array.from(monthMap.entries()).map(([month, count]) => {
        const item = {
          month,
          count,
          change_from_prev: prevVal !== undefined ? count - prevVal : undefined,
        };
        prevVal = count;
        return item;
      });

      resp.us04_conversion_trend = {
        total_converted: convertedLeadsByWonOn.length,
        months,
      };
    }

    // ==========================================
    // US05 - Lead Source Performance
    // ==========================================
    if (allowedCharts.us05 !== false) {
      const sourceStats = new Map<string, { leads: number; converted: number; lost: number; open: number }>();
      LEAD_SOURCES.forEach((s) => sourceStats.set(s, { leads: 0, converted: 0, lost: 0, open: 0 }));

      leadsByDateAdded.forEach((l) => {
        const src = l.lead_source || 'Other';
        const st = sourceStats.get(src) || { leads: 0, converted: 0, lost: 0, open: 0 };
        st.leads++;
        if (l.lead_stage === 'Converted') st.converted++;
        else if (l.lead_stage === 'Lost') st.lost++;
        else st.open++;
        sourceStats.set(src, st);
      });

      const sources = LEAD_SOURCES.map((src) => {
        const stat = sourceStats.get(src) || { leads: 0, converted: 0, lost: 0, open: 0 };
        const rate = stat.leads > 0 ? Math.round((stat.converted / stat.leads) * 100) : null;
        return {
          source: src,
          leads: stat.leads,
          converted: stat.converted,
          lost: stat.lost,
          open: stat.open,
          conversion_rate: rate,
        };
      }).sort((a, b) => b.leads - a.leads);

      resp.us05_source_performance = { sources };
    }

    // ==========================================
    // US06 - Service Fit Demand (Dumbbell Chart)
    // Multi-Service Fit Counting Exception Applies!
    // ==========================================
    if (allowedCharts.us06 !== false) {
      const fitStats = new Map<string, { leads: number; converted: number }>();
      SERVICE_FITS.forEach((f) => fitStats.set(f, { leads: 0, converted: 0 }));

      leadsByDateAdded.forEach((l) => {
        if (!l.service_fit) return;
        SERVICE_FITS.forEach((fit) => {
          if (l.service_fit?.toLowerCase().includes(fit.toLowerCase())) {
            const st = fitStats.get(fit) || { leads: 0, converted: 0 };
            st.leads++;
            if (l.lead_stage === 'Converted') st.converted++;
            fitStats.set(fit, st);
          }
        });
      });

      const services = SERVICE_FITS.map((fit) => {
        const st = fitStats.get(fit) || { leads: 0, converted: 0 };
        const rate = st.leads > 0 ? Math.round((st.converted / st.leads) * 100) : null;
        return {
          service: fit,
          leads: st.leads,
          converted: st.converted,
          conversion_rate: rate,
        };
      }).sort((a, b) => b.leads - a.leads);

      resp.us06_service_fit_demand = { services };
    }

    // ==========================================
    // US07 - Lead Owner Performance (Heatmap)
    // ==========================================
    if (allowedCharts.us07 !== false) {
      const ownerMap = new Map<number, { emp_id: number; name: string; counts: Record<string, number>; total: number }>();

      leadsByDateAdded.forEach((l) => {
        const empId = l.lead_by_id || 0;
        const name = l.employees_leads_lead_by_idToemployees?.name || 'Unassigned';
        if (!ownerMap.has(empId)) {
          const counts: Record<string, number> = {};
          STATUSES.forEach((s) => (counts[s] = 0));
          ownerMap.set(empId, { emp_id: empId, name, counts, total: 0 });
        }
        const o = ownerMap.get(empId)!;
        const stage = l.lead_stage || 'New';
        o.counts[stage] = (o.counts[stage] || 0) + 1;
        o.total++;
      });

      const owners = Array.from(ownerMap.values())
        .map((o) => {
          const converted = o.counts['Converted'] || 0;
          return {
            emp_id: o.emp_id,
            name: o.name,
            new: o.counts['New'] || 0,
            contacted: o.counts['Contacted'] || 0,
            qualified: o.counts['Qualified'] || 0,
            on_hold: o.counts['On Hold'] || 0,
            lost: o.counts['Lost'] || 0,
            converted,
            total: o.total,
            conversion_rate: o.total > 0 ? Math.round((converted / o.total) * 100) : null,
          };
        })
        .sort((a, b) => b.total - a.total);

      resp.us07_owner_performance = {
        owners,
        statuses: STATUSES,
      };
    }

    // ==========================================
    // US08 - Lead Conversion Cycle Time
    // ==========================================
    if (allowedCharts.us08 !== false) {
      const compareBy = extraOptions?.us08_compare_by || 'source';
      const validConverted = convertedLeadsByWonOn.filter((l) => {
        if (!l.won_on || !l.created_at) return false;
        const won = new Date(l.won_on).getTime();
        const created = new Date(l.created_at).getTime();
        return won >= created;
      });

      const allDays: number[] = [];
      const groupMap = new Map<string, number[]>();

      validConverted.forEach((l) => {
        const days = Math.round((new Date(l.won_on!).getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
        allDays.push(days);

        const groupKey = compareBy === 'owner' ? (l.employees_leads_lead_by_idToemployees?.name || 'Unassigned') : (l.lead_source || 'Other');
        if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
        groupMap.get(groupKey)!.push(days);
      });

      const median = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const sorted = arr.slice().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
      };

      const avg = (arr: number[]) => (arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0);

      const groups = Array.from(groupMap.entries())
        .map(([name, daysArr]) => ({
          name,
          converted_count: daysArr.length,
          average_days: avg(daysArr),
          median_days: median(daysArr),
          min_days: Math.min(...daysArr),
          max_days: Math.max(...daysArr),
        }))
        .sort((a, b) => a.average_days - b.average_days);

      resp.us08_conversion_cycle_time = {
        compare_by: compareBy,
        overall_average_days: avg(allDays),
        overall_median_days: median(allDays),
        groups,
      };
    }

    // ==========================================
    // US09 - Conversation Activity Trend
    // ==========================================
    if (allowedCharts.us09 !== false) {
      const commWhere: any = {
        deleted_at: null,
      };
      if (dateStart || dateEnd) {
        commWhere.communication_date = {};
        if (dateStart) commWhere.communication_date.gte = dateStart;
        if (dateEnd) commWhere.communication_date.lte = dateEnd;
      }
      if (ownerEmpId) {
        commWhere.created_by = ownerEmpId;
      }

      const comms = await this.prisma.crm_communications.findMany({
        where: commWhere,
        select: {
          communication_id: true,
          type: true,
          communication_date: true,
        },
      });

      const groupBy = extraOptions?.us09_group_by || 'week';
      const periodsMap = new Map<string, { call: number; email: number; whatsapp: number; meeting: number; site_visit: number; total: number }>();

      comms.forEach((c) => {
        let periodKey = '';
        const d = new Date(c.communication_date);
        if (groupBy === 'day') periodKey = toYmd(d);
        else if (groupBy === 'month') periodKey = toMonthYear(d);
        else periodKey = toYmd(getMonday(d));

        if (!periodsMap.has(periodKey)) {
          periodsMap.set(periodKey, { call: 0, email: 0, whatsapp: 0, meeting: 0, site_visit: 0, total: 0 });
        }
        const st = periodsMap.get(periodKey)!;
        const type = (c.type || '').toLowerCase();
        if (type.includes('call')) st.call++;
        else if (type.includes('email')) st.email++;
        else if (type.includes('whatsapp')) st.whatsapp++;
        else if (type.includes('meeting')) st.meeting++;
        else if (type.includes('site')) st.site_visit++;
        st.total++;
      });

      let peakPeriod: string | null = null;
      let maxTotal = -1;
      periodsMap.forEach((st, p) => {
        if (st.total > maxTotal) {
          maxTotal = st.total;
          peakPeriod = p;
        }
      });

      resp.us09_conversation_trend = {
        group_by: groupBy,
        peak_period: peakPeriod,
        periods: Array.from(periodsMap.entries()).map(([period, val]) => ({
          period,
          ...val,
        })),
      };
    }

    // ==========================================
    // US10 - Revenue Generated (Waterfall Chart)
    // ==========================================
    if (allowedCharts.us10 !== false) {
      let convertedWithoutRev = 0;
      const monthMap = new Map<string, { inr: number; count: number }>();

      // Pre-fill last 6 months
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthMap.set(toMonthYear(d), { inr: 0, count: 0 });
      }

      convertedLeadsByWonOn.forEach((l) => {
        const val = l.actual_value !== null && l.actual_value !== undefined ? Number(l.actual_value) : null;
        if (val === null) {
          convertedWithoutRev++;
        }
        if (l.won_on) {
          const mKey = toMonthYear(new Date(l.won_on));
          const current = monthMap.get(mKey) || { inr: 0, count: 0 };
          current.inr += val || 0;
          current.count++;
          monthMap.set(mKey, current);
        }
      });

      let totalInr = 0;
      let runningLakh = 0;
      const months = Array.from(monthMap.entries()).map(([month, data]) => {
        totalInr += data.inr;
        const lakh = Math.round((data.inr / 100000) * 100) / 100;
        runningLakh = Math.round((runningLakh + lakh) * 100) / 100;
        return {
          month,
          revenue_inr: data.inr,
          revenue_lakh: lakh,
          converted_count: data.count,
          running_total_lakh: runningLakh,
        };
      });

      resp.us10_revenue = {
        total_revenue_inr: totalInr,
        total_revenue_lakh: Math.round((totalInr / 100000) * 100) / 100,
        converted_leads_without_revenue: convertedWithoutRev,
        months,
      };
    }

    // ==========================================
    // US11 - Sales Profitability (Combo Chart)
    // ==========================================
    if (allowedCharts.us11 !== false) {
      let excludedCostCount = 0;
      const monthMap = new Map<string, { rev: number; cost: number; hasCost: boolean }>();

      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthMap.set(toMonthYear(d), { rev: 0, cost: 0, hasCost: false });
      }

      convertedLeadsByWonOn.forEach((l) => {
        const rev = l.actual_value !== null && l.actual_value !== undefined ? Number(l.actual_value) : null;
        // In the existing leads model, expected_value or actual_value are values. If cost field isn't explicitly separated, we inspect if production_cost exists, else fallback safely
        const costVal = (l as any).cost !== undefined && (l as any).cost !== null ? Number((l as any).cost) : null;

        if (rev === null || costVal === null) {
          if (rev !== null && costVal === null) excludedCostCount++;
          return;
        }

        if (l.won_on) {
          const mKey = toMonthYear(new Date(l.won_on));
          const cur = monthMap.get(mKey) || { rev: 0, cost: 0, hasCost: true };
          cur.rev += rev;
          cur.cost += costVal;
          cur.hasCost = true;
          monthMap.set(mKey, cur);
        }
      });

      let totRev = 0;
      let totCost = 0;
      const months = Array.from(monthMap.entries()).map(([month, d]) => {
        totRev += d.rev;
        totCost += d.cost;
        const profit = d.rev - d.cost;
        const margin = d.rev > 0 ? Math.round((profit / d.rev) * 1000) / 10 : null;
        return {
          month,
          revenue_inr: d.rev,
          revenue_lakh: Math.round((d.rev / 100000) * 100) / 100,
          cost_inr: d.cost,
          cost_lakh: Math.round((d.cost / 100000) * 100) / 100,
          profit_inr: profit,
          profit_margin_pct: margin,
        };
      });

      const totalProfit = totRev - totCost;
      const overallMargin = totRev > 0 ? Math.round((totalProfit / totRev) * 1000) / 10 : null;

      resp.us11_profitability = {
        total_revenue_inr: totRev,
        total_cost_inr: totCost,
        total_profit_inr: totalProfit,
        overall_profit_margin_pct: overallMargin,
        excluded_leads_count: excludedCostCount,
        months,
      };
    }

    // ==========================================
    // US12 - Sales Activity & Overview Counters
    // ==========================================
    const us12DateStr = extraOptions?.us12_date || toYmd(new Date());
    const targetDate = new Date(`${us12DateStr}T00:00:00`);
    const targetDateEnd = new Date(`${us12DateStr}T23:59:59.999`);
    const prevDate = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
    const prevDateEnd = new Date(targetDateEnd.getTime() - 24 * 60 * 60 * 1000);

    // Calls Made (logged-in user)
    const callsToday = await this.prisma.crm_communications.count({
      where: {
        created_by: actorEmpId,
        type: { contains: 'call', mode: 'insensitive' },
        communication_date: { gte: targetDate, lte: targetDateEnd },
        deleted_at: null,
      },
    });
    const callsYesterday = await this.prisma.crm_communications.count({
      where: {
        created_by: actorEmpId,
        type: { contains: 'call', mode: 'insensitive' },
        communication_date: { gte: prevDate, lte: prevDateEnd },
        deleted_at: null,
      },
    });

    // Emails Sent (logged-in user)
    const emailsToday = await this.prisma.crm_communications.count({
      where: {
        created_by: actorEmpId,
        type: { contains: 'email', mode: 'insensitive' },
        communication_date: { gte: targetDate, lte: targetDateEnd },
        deleted_at: null,
      },
    });
    const emailsYesterday = await this.prisma.crm_communications.count({
      where: {
        created_by: actorEmpId,
        type: { contains: 'email', mode: 'insensitive' },
        communication_date: { gte: prevDate, lte: prevDateEnd },
        deleted_at: null,
      },
    });

    // Today's Follow-ups
    const scheduledToday = await this.prisma.crm_follow_ups.count({
      where: {
        follow_up_on: { gte: targetDate, lte: targetDateEnd },
        status: { not: 'Cancelled' },
        deleted_at: null,
      },
    });
    const completedToday = await this.prisma.crm_follow_ups.count({
      where: {
        done_on: { gte: targetDate, lte: targetDateEnd },
        status: 'Completed',
        deleted_at: null,
      },
    });

    // Total Follow-ups Done in period (default This Month)
    const fuFrom = extraOptions?.us12_follow_up_from ? new Date(`${extraOptions.us12_follow_up_from}T00:00:00`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fuTo = extraOptions?.us12_follow_up_to ? new Date(`${extraOptions.us12_follow_up_to}T23:59:59.999`) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
    const totalFollowUpsDone = await this.prisma.crm_follow_ups.count({
      where: {
        status: 'Completed',
        done_on: { gte: fuFrom, lte: fuTo },
        deleted_at: null,
      },
    });

    // Average Call Duration & Unanswered Calls
    const todayCalls = await this.prisma.crm_communications.findMany({
      where: {
        created_by: actorEmpId,
        type: { contains: 'call', mode: 'insensitive' },
        communication_date: { gte: targetDate, lte: targetDateEnd },
        deleted_at: null,
      },
      select: {
        call_status: true,
        not_received_reason: true,
        call_duration_seconds: true,
      },
    });

    let answeredDurationSum = 0;
    let answeredCount = 0;
    let unansweredCount = 0;

    todayCalls.forEach((c) => {
      const isNotReceived = c.call_status === 'Not received' || !!c.not_received_reason;
      if (isNotReceived) {
        unansweredCount++;
      } else if (c.call_duration_seconds !== null && c.call_duration_seconds !== undefined && c.call_duration_seconds > 0) {
        answeredDurationSum += c.call_duration_seconds;
        answeredCount++;
      }
    });

    const avgSeconds = answeredCount > 0 ? Math.round(answeredDurationSum / answeredCount) : null;
    let durationDisplay = 'N/A';
    if (avgSeconds !== null) {
      const mins = Math.floor(avgSeconds / 60);
      const secs = avgSeconds % 60;
      durationDisplay = `${mins}m ${secs}s`;
    }

    // Total Companies (matching company-level filters: city, industry, search)
    const compWhere: any = { deleted_at: null };
    if (filters.city && filters.city.length > 0) compWhere.city = { in: filters.city, mode: 'insensitive' };
    if (filters.industry_ids && filters.industry_ids.length > 0) compWhere.industry_id = { in: filters.industry_ids };
    if (filters.q && filters.q.trim()) {
      compWhere.OR = [
        { name: { contains: filters.q.trim(), mode: 'insensitive' } },
        { city: { contains: filters.q.trim(), mode: 'insensitive' } },
      ];
    }
    const totalCompanies = await this.prisma.companies.count({ where: compWhere });

    resp.us12_counters = {
      selected_date: us12DateStr,
      calls_made: {
        today: callsToday,
        yesterday: callsYesterday,
        change: callsToday - callsYesterday,
        arrow: callsToday > callsYesterday ? 'up' : callsToday < callsYesterday ? 'down' : 'neutral',
      },
      emails_sent: {
        today: emailsToday,
        yesterday: emailsYesterday,
        change: emailsToday - emailsYesterday,
        arrow: emailsToday > emailsYesterday ? 'up' : emailsToday < emailsYesterday ? 'down' : 'neutral',
      },
      todays_follow_ups: {
        scheduled_today: scheduledToday,
        completed_today: completedToday,
      },
      total_follow_ups_done: {
        period: `${toYmd(fuFrom)} to ${toYmd(fuTo)}`,
        count: totalFollowUpsDone,
      },
      average_call_duration: {
        seconds: avgSeconds,
        display: durationDisplay,
      },
      unanswered_calls: {
        count: unansweredCount,
      },
      total_leads: {
        count: allLeads.length,
      },
      total_companies: {
        count: totalCompanies,
      },
    };

    return resp;
  }
}
