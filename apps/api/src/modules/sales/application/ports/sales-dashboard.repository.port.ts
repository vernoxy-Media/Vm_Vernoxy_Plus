export interface SalesDashboardFilters {
  lead_source?: string[];
  lead_by?: string;
  service_fit?: string[];
  status?: string[];
  city?: string[];
  industry_ids?: number[];
  date_range?: string; // 'all_time' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_6_months' | 'this_year' | 'custom'
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  q?: string;    // global search keyword
}

export interface SalesDashboardConfig {
  default_filters: {
    date_range: string;
    lead_source: string[];
    lead_by: string;
    service_fit: string[];
    status: string[];
    city: string[];
    industry_ids: number[];
  };
  chart_permissions: Record<string, boolean>; // chart_key -> boolean for current user
  updated_at?: string;
  updated_by_name?: string;
}

export interface UserChartPermission {
  emp_id: number;
  name: string;
  is_admin: boolean;
  permissions: Record<string, boolean>;
}

export interface US02LeadStatusOverview {
  total: number;
  statuses: Array<{
    status: string;
    count: number;
    percentage: number;
    is_max: boolean;
  }>;
}

export interface US03NewLeadsAddedTrend {
  group_by: 'day' | 'week' | 'month';
  periods: Array<{
    period: string;
    count: number;
  }>;
  trend_tag: {
    category: 'Increasing' | 'Decreasing' | 'Steady';
    percentage: number;
    is_new?: boolean;
    arrow: 'up' | 'down' | 'horizontal';
    color: 'green' | 'red' | 'grey';
  };
}

export interface US04LeadToClientConversionTrend {
  total_converted: number;
  months: Array<{
    month: string; // MMM YYYY
    count: number;
    change_from_prev?: number;
  }>;
}

export interface US05LeadSourcePerformance {
  sources: Array<{
    source: string;
    leads: number;
    converted: number;
    lost: number;
    open: number;
    conversion_rate: number | null; // null represents N/A
  }>;
}

export interface US06ServiceFitDemand {
  services: Array<{
    service: string;
    leads: number;
    converted: number;
    conversion_rate: number | null; // null represents N/A
  }>;
}

export interface US07LeadOwnerPerformance {
  owners: Array<{
    emp_id: number;
    name: string;
    new: number;
    contacted: number;
    qualified: number;
    on_hold: number;
    lost: number;
    converted: number;
    total: number;
    conversion_rate: number | null;
  }>;
  statuses: string[];
}

export interface US08LeadConversionCycleTime {
  compare_by: 'source' | 'owner';
  overall_average_days: number;
  overall_median_days: number;
  groups: Array<{
    name: string;
    converted_count: number;
    average_days: number;
    median_days: number;
    min_days: number;
    max_days: number;
  }>;
}

export interface US09ConversationActivityTrend {
  group_by: 'day' | 'week' | 'month';
  peak_period: string | null;
  periods: Array<{
    period: string;
    call: number;
    email: number;
    whatsapp: number;
    meeting: number;
    site_visit: number;
    total: number;
  }>;
}

export interface US10RevenueGenerated {
  total_revenue_inr: number;
  total_revenue_lakh: number;
  converted_leads_without_revenue: number;
  months: Array<{
    month: string;
    revenue_inr: number;
    revenue_lakh: number;
    converted_count: number;
    running_total_lakh: number;
  }>;
}

export interface US11SalesProfitability {
  total_revenue_inr: number;
  total_cost_inr: number;
  total_profit_inr: number;
  overall_profit_margin_pct: number | null;
  excluded_leads_count: number; // Converted leads with missing cost
  months: Array<{
    month: string;
    revenue_inr: number;
    revenue_lakh: number;
    cost_inr: number;
    cost_lakh: number;
    profit_inr: number;
    profit_margin_pct: number | null;
  }>;
}

export interface US12SalesActivityCounters {
  selected_date: string;
  calls_made: {
    today: number;
    yesterday: number;
    change: number;
    arrow: 'up' | 'down' | 'neutral';
  };
  emails_sent: {
    today: number;
    yesterday: number;
    change: number;
    arrow: 'up' | 'down' | 'neutral';
  };
  todays_follow_ups: {
    scheduled_today: number;
    completed_today: number;
  };
  total_follow_ups_done: {
    period: string;
    count: number;
  };
  average_call_duration: {
    seconds: number | null;
    display: string; // e.g. "10m 24s" or "N/A"
  };
  unanswered_calls: {
    count: number;
  };
  total_leads: {
    count: number;
  };
  total_companies: {
    count: number;
  };
}

export interface SalesDashboardDataResponse {
  filters: SalesDashboardFilters;
  us02_lead_status?: US02LeadStatusOverview;
  us03_new_leads_trend?: US03NewLeadsAddedTrend;
  us04_conversion_trend?: US04LeadToClientConversionTrend;
  us05_source_performance?: US05LeadSourcePerformance;
  us06_service_fit_demand?: US06ServiceFitDemand;
  us07_owner_performance?: US07LeadOwnerPerformance;
  us08_conversion_cycle_time?: US08LeadConversionCycleTime;
  us09_conversation_trend?: US09ConversationActivityTrend;
  us10_revenue?: US10RevenueGenerated;
  us11_profitability?: US11SalesProfitability;
  us12_counters?: US12SalesActivityCounters;
}

export abstract class SalesDashboardRepositoryPort {
  abstract getDefaultConfig(): Promise<{ default_filters: any; updated_at?: string; updated_by_name?: string }>;
  abstract saveDefaultConfig(defaults: any, actorEmpId: number): Promise<void>;
  abstract getUserPermissions(empId: number, isAdmin: boolean): Promise<Record<string, boolean>>;
  abstract listAllUserPermissions(): Promise<UserChartPermission[]>;
  abstract saveUserPermissions(targetEmpId: number, permissions: Record<string, boolean>, actorEmpId: number): Promise<void>;
  abstract getDashboardData(
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
  ): Promise<SalesDashboardDataResponse>;
}
