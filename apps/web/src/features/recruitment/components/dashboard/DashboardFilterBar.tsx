import React, { useState } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Calendar,
  ChevronDown,
  X,
  Briefcase,
  Building2,
  GitBranch,
  Share2,
  GraduationCap,
} from 'lucide-react';
import {
  DashboardFilterState,
  STANDARD_SOURCES,
} from './dashboard.utils';

interface DashboardFilterBarProps {
  filters: DashboardFilterState;
  onChangeFilters: (newFilters: DashboardFilterState) => void;
  onClearFilters: () => void;
  roles: Array<{ role_id: number; role_name: string }>;
  departments: Array<{ dep_id: number; name: string }>;
  totalFilteredCount: number;
  totalUnfilteredCount: number;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  filters,
  onChangeFilters,
  onClearFilters,
  roles,
  departments,
  totalFilteredCount,
  totalUnfilteredCount,
}) => {
  const [dateError, setDateError] = useState<string | null>(null);

  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const handlePresetChange = (preset: string) => {
    setDateError(null);
    const now = new Date();
    const todayStr = ymd(now);

    if (preset === 'all') {
      onChangeFilters({
        ...filters,
        dateRange: { startDate: '', endDate: '', preset: 'all' },
      });
      return;
    }

    if (preset === 'last_30_days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      onChangeFilters({
        ...filters,
        dateRange: { startDate: ymd(past), endDate: todayStr, preset: 'last_30_days' },
      });
      return;
    }

    if (preset === 'last_3_months') {
      const past = new Date();
      past.setMonth(past.getMonth() - 3);
      onChangeFilters({
        ...filters,
        dateRange: { startDate: ymd(past), endDate: todayStr, preset: 'last_3_months' },
      });
      return;
    }

    if (preset === 'last_6_months') {
      const past = new Date();
      past.setMonth(past.getMonth() - 6);
      onChangeFilters({
        ...filters,
        dateRange: { startDate: ymd(past), endDate: todayStr, preset: 'last_6_months' },
      });
      return;
    }

    if (preset === 'this_year') {
      onChangeFilters({
        ...filters,
        dateRange: { startDate: `${now.getFullYear()}-01-01`, endDate: todayStr, preset: 'this_year' },
      });
      return;
    }

    if (preset === 'custom') {
      onChangeFilters({
        ...filters,
        dateRange: { ...filters.dateRange, preset: 'custom' },
      });
    }
  };

  const handleStartDateChange = (val: string) => {
    if (filters.dateRange.endDate && val && val > filters.dateRange.endDate) {
      setDateError('Start date cannot be after end date.');
    } else {
      setDateError(null);
    }
    onChangeFilters({
      ...filters,
      dateRange: { ...filters.dateRange, startDate: val, preset: 'custom' },
    });
  };

  const handleEndDateChange = (val: string) => {
    if (filters.dateRange.startDate && val && val < filters.dateRange.startDate) {
      setDateError('End date cannot be earlier than start date.');
    } else {
      setDateError(null);
    }
    onChangeFilters({
      ...filters,
      dateRange: { ...filters.dateRange, endDate: val, preset: 'custom' },
    });
  };

  // Check if any filter differs from default view
  const isFiltered =
    filters.stage !== 'Open' ||
    filters.position !== 'All' ||
    filters.department !== 'All' ||
    filters.source !== 'All' ||
    filters.experienceType !== 'All' ||
    Boolean(filters.dateRange.startDate || filters.dateRange.endDate) ||
    Boolean(filters.searchQuery.trim());

  return (
    <div className="space-y-3">
      {/* Search Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChangeFilters({ ...filters, searchQuery: e.target.value })}
            placeholder="Search candidate name, ID, phone, email, position, dept, source..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onChangeFilters({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Showing <span className="font-bold text-slate-900">{totalFilteredCount}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalUnfilteredCount}</span> candidates
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                setDateError(null);
                onClearFilters();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              title="Clear all filters and reset to default view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 text-blue-600">
            <Filter className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Global Filters</span>
          {isFiltered && (
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Active Filters
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Stage Filter (Defaults to Open) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-slate-400" />
              Stage
            </label>
            <div className="relative">
              <select
                value={filters.stage}
                onChange={(e) => onChangeFilters({ ...filters, stage: e.target.value })}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="Open">Open (Default)</option>
                <option value="new">New</option>
                <option value="screening">Screening</option>
                <option value="interviewing">Interviewing</option>
                <option value="on_hold">On Hold</option>
                <option value="selected">Selected</option>
                <option value="onboarding">Onboarding</option>
                <option value="rejected">Rejected</option>
                <option value="joined">Joined</option>
                <option value="did_not_join">Did not join</option>
                <option value="All">All (Include Closed)</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 2. Position Filter (Uses Designation / Role list) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-slate-400" />
              Position
            </label>
            <div className="relative">
              <select
                value={filters.position}
                onChange={(e) => onChangeFilters({ ...filters, position: e.target.value })}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Positions</option>
                {roles.map((r) => (
                  <option key={r.role_id} value={String(r.role_id)}>
                    {r.role_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 3. Department Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              Department
            </label>
            <div className="relative">
              <select
                value={filters.department}
                onChange={(e) => onChangeFilters({ ...filters, department: e.target.value })}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d.dep_id} value={String(d.dep_id)}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 4. Source Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
              <Share2 className="w-3 h-3 text-slate-400" />
              Source
            </label>
            <div className="relative">
              <select
                value={filters.source}
                onChange={(e) => onChangeFilters({ ...filters, source: e.target.value })}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Sources</option>
                {STANDARD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 5. Experience Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-slate-400" />
              Experience Type
            </label>
            <div className="relative">
              <select
                value={filters.experienceType}
                onChange={(e) => onChangeFilters({ ...filters, experienceType: e.target.value })}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Experience</option>
                <option value="Fresher">Fresher</option>
                <option value="Experienced">Experienced</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 6. Date Range Quick Preset Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Creation Date
            </label>
            <div className="relative">
              <select
                value={filters.dateRange.preset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="last_6_months">Last 6 Months</option>
                <option value="this_year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Custom Date Range Inputs (when preset === 'custom' or dates are set) */}
        {filters.dateRange.preset === 'custom' && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Custom Date Range:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateRange.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={filters.dateRange.endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            {dateError && <span className="text-xs font-semibold text-rose-500">{dateError}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
