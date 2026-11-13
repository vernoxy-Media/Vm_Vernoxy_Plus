import React, { useMemo } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Calendar,
  ChevronDown,
  X,
} from 'lucide-react';
import { AttendanceAnalyticsFilters } from './attendance-analytics.types';
import { getCurrentMonthRange } from './attendance-analytics.utils';

interface AttendanceAnalyticsFilterBarProps {
  filters: AttendanceAnalyticsFilters;
  onChangeFilters: (filters: AttendanceAnalyticsFilters) => void;
  onClearFilters: () => void;
  departments: Array<{ id: number; name: string }>;
  availableDesignations: string[];
  employees: Array<{ id: number; name: string; empCode: string; department: string; designation: string }>;
  totalFilteredCount: number;
  totalUnfilteredCount: number;
}

export const AttendanceAnalyticsFilterBar: React.FC<AttendanceAnalyticsFilterBarProps> = ({
  filters,
  onChangeFilters,
  onClearFilters,
  departments,
  availableDesignations,
  employees,
  totalFilteredCount,
  totalUnfilteredCount,
}) => {
  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.department !== 'All') count++;
    if (filters.designation !== 'All') count++;
    if (filters.employeeId !== 'All') count++;
    if (filters.dateRangePreset !== 'current_month') count++;
    return count;
  }, [filters]);

  const hasAnyFilterOrSearch = activeFiltersCount > 0 || Boolean(filters.search.trim());

  const handleDatePresetChange = (preset: AttendanceAnalyticsFilters['dateRangePreset']) => {
    const now = new Date();
    const year = now.getFullYear();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'current_month') {
      const cur = getCurrentMonthRange();
      onChangeFilters({
        ...filters,
        dateRangePreset: preset,
        startDate: cur.startDate,
        endDate: cur.endDate,
      });
    } else if (preset === 'last_month') {
      const lmYear = now.getMonth() === 0 ? year - 1 : year;
      const lmMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const start = `${lmYear}-${pad(lmMonth + 1)}-01`;
      const endDay = new Date(lmYear, lmMonth + 1, 0).getDate();
      onChangeFilters({
        ...filters,
        dateRangePreset: preset,
        startDate: start,
        endDate: `${lmYear}-${pad(lmMonth + 1)}-${pad(endDay)}`,
      });
    } else if (preset === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = `${year}-${pad(qMonth + 1)}-01`;
      const endMonth = qMonth + 3;
      const endDay = new Date(year, endMonth, 0).getDate();
      onChangeFilters({
        ...filters,
        dateRangePreset: preset,
        startDate: start,
        endDate: `${year}-${pad(endMonth)}-${pad(endDay)}`,
      });
    } else if (preset === 'this_year') {
      onChangeFilters({
        ...filters,
        dateRangePreset: preset,
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      });
    } else {
      onChangeFilters({ ...filters, dateRangePreset: 'custom' });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-4">
      {/* Top Header Row of Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">Global Attendance Filters</h2>
              {activeFiltersCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600 border border-indigo-200/60">
                  {activeFiltersCount} active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Apply criteria across all attendance analytics charts and tables (AND logic)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasAnyFilterOrSearch && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>
              {totalFilteredCount} of {totalUnfilteredCount} Records
            </span>
          </div>
        </div>
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Date Range Preset */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Date Range
          </label>
          <div className="relative">
            <select
              value={filters.dateRangePreset}
              onChange={(e) =>
                handleDatePresetChange(e.target.value as AttendanceAnalyticsFilters['dateRangePreset'])
              }
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="current_month">Current Month (Default)</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 2. Department */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Department
          </label>
          <div className="relative">
            <select
              value={filters.department}
              onChange={(e) => onChangeFilters({ ...filters, department: e.target.value })}
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="All">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 3. Designation (Interconnected to Department) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Designation
          </label>
          <div className="relative">
            <select
              value={filters.designation}
              onChange={(e) => onChangeFilters({ ...filters, designation: e.target.value })}
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="All">All Designations</option>
              {availableDesignations.map((desig) => (
                <option key={desig} value={desig}>
                  {desig}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 4. Employee */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Employee
          </label>
          <div className="relative">
            <select
              value={filters.employeeId}
              onChange={(e) => onChangeFilters({ ...filters, employeeId: e.target.value })}
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="All">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={String(emp.id)}>
                  {emp.name} ({emp.empCode})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 5. Global Search */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChangeFilters({ ...filters, search: e.target.value })}
              placeholder="Search emp ID, name, email..."
              className="w-full h-[38px] rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition shadow-2xs"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onChangeFilters({ ...filters, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Custom Date Pickers when 'custom' is active */}
      {filters.dateRangePreset === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>Custom Start:</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onChangeFilters({ ...filters, startDate: e.target.value })}
              className="h-[34px] px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span>Custom End:</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onChangeFilters({ ...filters, endDate: e.target.value })}
              className="h-[34px] px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
