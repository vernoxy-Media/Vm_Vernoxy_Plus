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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
          <Filter className="h-3.5 w-3.5 text-blue-600" />
          <span>Filters:</span>
        </div>

        {/* Lead Source */}
        <select
          value={filters.lead_source?.[0] || ''}
          onChange={(e) => onChange({ lead_source: e.target.value ? [e.target.value] : [] })}
          className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
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
          className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
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
          className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
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
          className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
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
          className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
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
          className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
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
          className="h-8 rounded-lg border border-blue-200 bg-blue-50/50 px-2.5 text-xs font-bold text-blue-800 focus:border-blue-500 focus:bg-white focus:outline-none"
        >
          {DATE_RANGES.map((dr) => (
            <option key={dr.id} value={dr.id}>
              {dr.label}
            </option>
          ))}
        </select>

        {/* Custom Date Pickers */}
        {filters.date_range === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={filters.from || ''}
              onChange={(e) => onChange({ from: e.target.value })}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={filters.to || ''}
              onChange={(e) => onChange({ to: e.target.value })}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
        )}

        {/* Clear Filters Button */}
        <button
          type="button"
          onClick={onClear}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Clear Filters</span>
        </button>
      </div>
    </div>
  );
};
