import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { SalesDashboardFilters } from '../../types/sales-dashboard.types';
import { SearchableSelect } from '../common/SearchableSelect';

const STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost', 'On Hold'];

const DATE_RANGES = [
  { id: 'all_time', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_6_months', label: 'Last 6 Months' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

const SELECT_CLS =
  'h-9 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-medium text-slate-700 transition hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10';

interface SalesDashboardFilterBarProps {
  filters: SalesDashboardFilters;
  onChange: (updated: Partial<SalesDashboardFilters>) => void;
  onClear: () => void;
  users: Array<{ emp_id: number; name: string }>;
  cities: string[];
  industries: Array<{ industry_id: number; name: string }>;
  /** From Master Data (Sales > Lead Source / Service Fit). */
  leadSources: string[];
  serviceFits: string[];
}

export const SalesDashboardFilterBar: React.FC<SalesDashboardFilterBarProps> = ({
  filters,
  onChange,
  onClear,
  users,
  cities,
  industries,
  leadSources,
  serviceFits,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_-8px_rgba(15,23,42,0.08)]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        <div className="col-span-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Filter className="h-3.5 w-3.5" />
            </span>
            <span>Filters</span>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear Filters</span>
          </button>
        </div>

        <SearchableSelect compact ariaLabel="Lead source" value={filters.lead_source?.[0] || ''} onChange={(v) => onChange({ lead_source: v ? [v] : [] })} placeholder="Lead Source: All" options={leadSources.map((x) => ({ value: x, label: x }))} />

        <SearchableSelect
          compact
          ariaLabel="Lead by"
          value={!filters.lead_by || filters.lead_by === 'all' ? '' : filters.lead_by}
          onChange={(v) => onChange({ lead_by: v || 'all' })}
          placeholder="Lead By: All"
          options={[{ value: 'me', label: 'Assigned to me' }, ...users.map((u) => ({ value: String(u.emp_id), label: u.name }))]}
        />

        <SearchableSelect compact ariaLabel="Service fit" value={filters.service_fit?.[0] || ''} onChange={(v) => onChange({ service_fit: v ? [v] : [] })} placeholder="Service Fit: All" options={serviceFits.map((x) => ({ value: x, label: x }))} />

        <SearchableSelect compact ariaLabel="Status" value={filters.status?.[0] || ''} onChange={(v) => onChange({ status: v ? [v] : [] })} placeholder="Status: All" options={STATUSES.map((x) => ({ value: x, label: x }))} />

        <SearchableSelect compact ariaLabel="City" value={filters.city?.[0] || ''} onChange={(v) => onChange({ city: v ? [v] : [] })} placeholder="City: All" options={cities.map((x) => ({ value: x, label: x }))} />

        <SearchableSelect compact ariaLabel="Industry" value={filters.industry_ids?.[0] ? String(filters.industry_ids[0]) : ''} onChange={(v) => onChange({ industry_ids: v ? [Number(v)] : [] })} placeholder="Industry: All" options={industries.map((x) => ({ value: String(x.industry_id), label: x.name }))} />

        <SearchableSelect compact required ariaLabel="Date range" value={filters.date_range || 'this_month'} onChange={(v) => onChange({ date_range: v })} placeholder="Date range" options={DATE_RANGES.map((x) => ({ value: x.id, label: x.label }))} />

        {/* Custom Date Pickers */}
        {filters.date_range === 'custom' && (
          <div className="flex items-center gap-1.5 sm:col-span-2">
            <input
              type="date"
              value={filters.from || ''}
              onChange={(e) => onChange({ from: e.target.value })}
              className={SELECT_CLS}
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={filters.to || ''}
              onChange={(e) => onChange({ to: e.target.value })}
              className={SELECT_CLS}
            />
          </div>
        )}
      </div>
    </div>
  );
};
