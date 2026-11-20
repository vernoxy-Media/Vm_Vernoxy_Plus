import React, { useState, useEffect } from 'react';
import { useSalesDashboardConfig, useSalesDashboardData } from '../hooks/useSalesDashboard';
import { SalesDashboardFilters } from '../types/sales-dashboard.types';
import { useSalesRights } from '../hooks/useSalesRights';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useSalesCompanyControllerMasters } from '@vernoxy-pulse/api-client';
import { SalesDashboardHeader } from '../components/dashboard/SalesDashboardHeader';
import { SalesDashboardFilterBar } from '../components/dashboard/SalesDashboardFilterBar';
import { SalesAdminConfigModal } from '../components/dashboard/SalesAdminConfigModal';
import { LeadStatusDonutChart } from '../components/dashboard/LeadStatusDonutChart';
import { NewLeadsTrendAreaChart } from '../components/dashboard/NewLeadsTrendAreaChart';
import { LeadConversionColumnChart } from '../components/dashboard/LeadConversionColumnChart';
import { LeadSourcePerformanceBarChart } from '../components/dashboard/LeadSourcePerformanceBarChart';
import { ServiceFitDemandDumbbellChart } from '../components/dashboard/ServiceFitDemandDumbbellChart';
import { LeadOwnerHeatmap } from '../components/dashboard/LeadOwnerHeatmap';
import { ConversionCycleTimeBarChart } from '../components/dashboard/ConversionCycleTimeBarChart';
import { ConversationActivityTrendChart } from '../components/dashboard/ConversationActivityTrendChart';
import { RevenueWaterfallChart } from '../components/dashboard/RevenueWaterfallChart';
import { SalesProfitabilityComboChart } from '../components/dashboard/SalesProfitabilityComboChart';
import { SalesActivityCounterCards } from '../components/dashboard/SalesActivityCounterCards';
import { DashboardSkeleton, DashboardError } from '@/shared/ui/dashboard/DashboardShell';

export const SalesDashboardPage: React.FC = () => {
  const { isAdmin } = useSalesRights();
  const { data: config, isLoading: isConfigLoading } = useSalesDashboardConfig();
  const { data: employees = [] } = useEmployeeOptionsQuery();
  const { data: mastersRaw } = useSalesCompanyControllerMasters();
  const rawMasters = (mastersRaw as any)?.data ?? mastersRaw;
  const industries = (rawMasters?.industries || []) as Array<{ id: number; name: string }>;

  const [isAdminConfigOpen, setIsAdminConfigOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Global Filters state
  const [filters, setFilters] = useState<SalesDashboardFilters>({
    date_range: 'this_month',
    lead_source: [],
    lead_by: 'all',
    service_fit: [],
    status: [],
    city: [],
    industry_ids: [],
  });

  // Chart-specific controls
  const [us03GroupBy, setUs03GroupBy] = useState<'day' | 'week' | 'month'>('week');
  const [us08CompareBy, setUs08CompareBy] = useState<'source' | 'owner'>('source');
  const [us09GroupBy, setUs09GroupBy] = useState<'day' | 'week' | 'month'>('week');
  const [us12Date, setUs12Date] = useState<string>(new Date().toISOString().split('T')[0]);

  // Set initial filters from Admin Config when loaded
  useEffect(() => {
    if (config?.default_filters) {
      setFilters((prev) => ({
        ...prev,
        ...config.default_filters,
      }));
    }
  }, [config]);

  // Merge search query into filters
  const effectiveFilters: SalesDashboardFilters = {
    ...filters,
    q: searchQuery,
  };

  const {
    data,
    isLoading: isDataLoading,
    isFetching,
    isError,
    refetch,
  } = useSalesDashboardData(effectiveFilters, {
    us03_group_by: us03GroupBy,
    us08_compare_by: us08CompareBy,
    us09_group_by: us09GroupBy,
    us12_date: us12Date,
  });

  const handleFilterChange = (updated: Partial<SalesDashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    if (config?.default_filters) {
      setFilters({ ...config.default_filters });
    } else {
      setFilters({
        date_range: 'this_month',
        lead_source: [],
        lead_by: 'all',
        service_fit: [],
        status: [],
        city: [],
        industry_ids: [],
      });
    }
  };

  if (isConfigLoading || (isDataLoading && !data)) {
    return (
      <div className="mx-auto w-full max-w-[1800px] space-y-6 p-4 sm:p-6 lg:space-y-7 lg:p-8">
        <DashboardSkeleton kpis={8} cards={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">
        <DashboardError message="Failed to fetch Sales Dashboard data from server." onRetry={() => refetch()} />
      </div>
    );
  }

  const allowed = config?.chart_permissions || {};

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 p-4 sm:p-6 lg:space-y-7 lg:p-8">
      {/* 1. Header (Title, Subtitle, Search, Refresh, Admin Config) */}
      <SalesDashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={() => refetch()}
        isLoading={isFetching}
        isAdmin={isAdmin}
        onOpenAdminConfig={() => setIsAdminConfigOpen(true)}
      />

      {/* 2. Global Filter Bar */}
      <SalesDashboardFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
        users={employees}
        cities={(rawMasters?.cities || []) as string[]}
        leadSources={(rawMasters?.lead_source || []) as string[]}
        serviceFits={(rawMasters?.service_fit || []) as string[]}
        industries={industries.map((ind: any) => ({ industry_id: ind.id, name: ind.name }))}
      />

      {/* 3. US12: Daily Sales Activity & Overview Counters (8 KPI Cards) */}
      <SalesActivityCounterCards
        data={data?.us12_counters}
        selectedDate={us12Date}
        onDateChange={setUs12Date}
        allowedCards={allowed}
      />

      {/* 4. Responsive Card Layout for 10 Visual Charts (US02 - US11) */}
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">Performance Analytics</h2>
        <p className="mt-0.5 text-xs text-slate-500">Pipeline, conversion, revenue and team performance</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 min-[1600px]:grid-cols-3">
        {/* US02: Lead Status Overview */}
        {allowed.us02 !== false && (
          <div className="min-h-[340px] min-w-0">
            <LeadStatusDonutChart data={data?.us02_lead_status} />
          </div>
        )}

        {/* US03: New Leads Added Trend */}
        {allowed.us03 !== false && (
          <div className="min-h-[340px] min-w-0">
            <NewLeadsTrendAreaChart
              data={data?.us03_new_leads_trend}
              groupBy={us03GroupBy}
              onGroupByChange={setUs03GroupBy}
            />
          </div>
        )}

        {/* US04: Lead-to-Client Conversion Trend */}
        {allowed.us04 !== false && (
          <div className="min-h-[340px] min-w-0">
            <LeadConversionColumnChart data={data?.us04_conversion_trend} />
          </div>
        )}

        {/* US05: Lead Source Performance */}
        {allowed.us05 !== false && (
          <div className="min-h-[340px] min-w-0">
            <LeadSourcePerformanceBarChart data={data?.us05_source_performance} />
          </div>
        )}

        {/* US06: Service Fit Demand */}
        {allowed.us06 !== false && (
          <div className="min-h-[340px] min-w-0">
            <ServiceFitDemandDumbbellChart data={data?.us06_service_fit_demand} />
          </div>
        )}

        {/* US07: Lead Owner Performance */}
        {allowed.us07 !== false && (
          <div className="min-h-[340px] min-w-0">
            <LeadOwnerHeatmap data={data?.us07_owner_performance} />
          </div>
        )}

        {/* US08: Lead Conversion Cycle Time */}
        {allowed.us08 !== false && (
          <div className="min-h-[340px] min-w-0">
            <ConversionCycleTimeBarChart
              data={data?.us08_conversion_cycle_time}
              compareBy={us08CompareBy}
              onCompareByChange={setUs08CompareBy}
            />
          </div>
        )}

        {/* US09: Conversation Activity Trend */}
        {allowed.us09 !== false && (
          <div className="min-h-[340px] min-w-0">
            <ConversationActivityTrendChart
              data={data?.us09_conversation_trend}
              groupBy={us09GroupBy}
              onGroupByChange={setUs09GroupBy}
            />
          </div>
        )}

        {/* US10: Revenue Generated */}
        {allowed.us10 !== false && (
          <div className="min-h-[340px] min-w-0">
            <RevenueWaterfallChart data={data?.us10_revenue} />
          </div>
        )}

        {/* US11: Sales Profitability (Spans 2 columns on wide screen per reference mockup) */}
        {allowed.us11 !== false && (
          <div className="min-h-[340px] min-w-0 lg:col-span-2 min-[1600px]:col-span-3">
            <SalesProfitabilityComboChart data={data?.us11_profitability} />
          </div>
        )}
      </div>

      {/* Admin Config Modal */}
      {isAdmin && (
        <SalesAdminConfigModal
          isOpen={isAdminConfigOpen}
          onClose={() => setIsAdminConfigOpen(false)}
          currentDefaults={config?.default_filters}
          users={employees}
        />
      )}
    </div>
  );
};
