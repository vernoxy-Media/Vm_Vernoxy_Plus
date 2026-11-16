import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { SalesDashboardFilters } from '../../types/sales-dashboard.types';

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
}

export const SalesDashboardFilterBar: React.FC<SalesDashboardFilterBarProps> = ({
  filters,
  onChange,
  onClear,
  users,
  cities,
  industries,
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

        {/* Lead Source */}
        <select
          value={filters.lead_source?.[0] || ''}
          onChange={(e) => onChange({ lead_source: e.target.value ? [e.target.value] : [] })}
          className={SELECT_CLS}
        >
          <option value="">Lead Source: All</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Lead By */}
        <select
          value={filters.lead_by || 'all'}
          onChange={(e) => onChange({ lead_by: e.target.value })}
          className={SELECT_CLS}
        >
          <option value="all">Lead By: All</option>
          <option value="me">Assigned to Me</option>
          {users.map((u) => (
            <option key={u.emp_id} value={String(u.emp_id)}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Service Fit */}
        <select
          value={filters.service_fit?.[0] || ''}
          onChange={(e) => onChange({ service_fit: e.target.value ? [e.target.value] : [] })}
          className={SELECT_CLS}
        >
          <option value="">Service Fit: All</option>
          {SERVICE_FITS.map((sf) => (
            <option key={sf} value={sf}>
              {sf}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filters.status?.[0] || ''}
          onChange={(e) => onChange({ status: e.target.value ? [e.target.value] : [] })}
          className={SELECT_CLS}
        >
          <option value="">Status: All</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* City */}
        <select
          value={filters.city?.[0] || ''}
          onChange={(e) => onChange({ city: e.target.value ? [e.target.value] : [] })}
          className={SELECT_CLS}
        >
          <option value="">City: All</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Industry */}
        <select
          value={filters.industry_ids?.[0] ? String(filters.industry_ids[0]) : ''}
          onChange={(e) => onChange({ industry_ids: e.target.value ? [Number(e.target.value)] : [] })}
          className={SELECT_CLS}
        >
          <option value="">Industry: All</option>
          {industries.map((ind) => (
            <option key={ind.industry_id} value={String(ind.industry_id)}>
              {ind.name}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <select
          value={filters.date_range || 'this_month'}
          onChange={(e) => onChange({ date_range: e.target.value })}
          className={SELECT_CLS}
        >
          {DATE_RANGES.map((dr) => (
            <option key={dr.id} value={dr.id}>
              {dr.label}
            </option>
          ))}
        </select>

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
