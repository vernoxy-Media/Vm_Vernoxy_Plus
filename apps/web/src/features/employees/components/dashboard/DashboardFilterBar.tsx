import React, { useState } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Calendar,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  EmployeeDashboardFilters,
} from './dashboard.types';
import { ManagerDropdownOption } from '../../hooks/use-employee-dashboard';

interface DashboardFilterBarProps {
  filters: EmployeeDashboardFilters;
  onChangeFilters: (filters: EmployeeDashboardFilters) => void;
  onClearFilters: () => void;
  departments: Array<{ dep_id: number; name: string }>;
  roles: Array<{ role_id: number; role_name?: string; name?: string }>;
  managerOptions: ManagerDropdownOption[];
  genderLookups: Array<{ id: number; code?: string; label?: string }>;
  employmentTypeLookups: Array<{ id: number; code?: string; label?: string }>;
  totalFilteredCount: number;
  totalUnfilteredCount: number;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  filters,
  onChangeFilters,
  onClearFilters,
  departments,
  roles,
  managerOptions,
  genderLookups,
  employmentTypeLookups,
  totalFilteredCount,
  totalUnfilteredCount,
}) => {
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(
    filters.joiningDate.preset === 'custom',
  );

  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const handleJoiningDatePresetChange = (preset: string) => {
    const now = new Date();
    const todayStr = ymd(now);

    if (preset === 'all') {
      setShowCustomDateInputs(false);
      onChangeFilters({
        ...filters,
        joiningDate: { startDate: '', endDate: '', preset: 'all' },
      });
      return;
    }

    if (preset === 'today') {
      setShowCustomDateInputs(false);
      onChangeFilters({
        ...filters,
        joiningDate: { startDate: todayStr, endDate: todayStr, preset: 'today' },
      });
      return;
    }

    if (preset === 'this_month') {
      setShowCustomDateInputs(false);
      const startOfMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      onChangeFilters({
        ...filters,
        joiningDate: { startDate: startOfMonth, endDate: todayStr, preset: 'this_month' },
      });
      return;
    }

    if (preset === 'this_year') {
      setShowCustomDateInputs(false);
      onChangeFilters({
        ...filters,
        joiningDate: { startDate: `${now.getFullYear()}-01-01`, endDate: todayStr, preset: 'this_year' },
      });
      return;
    }

    if (preset === 'last_30_days') {
      setShowCustomDateInputs(false);
      const past = new Date();
      past.setDate(past.getDate() - 30);
      onChangeFilters({
        ...filters,
        joiningDate: { startDate: ymd(past), endDate: todayStr, preset: 'last_30_days' },
      });
      return;
    }

    if (preset === 'last_3_months') {
      setShowCustomDateInputs(false);
      const past = new Date();
      past.setMonth(past.getMonth() - 3);
      onChangeFilters({
        ...filters,
        joiningDate: { startDate: ymd(past), endDate: todayStr, preset: 'last_3_months' },
      });
      return;
    }

    if (preset === 'last_6_months') {
      setShowCustomDateInputs(false);
      const past = new Date();
      past.setMonth(past.getMonth() - 6);
      onChangeFilters({
        ...filters,
        joiningDate: { startDate: ymd(past), endDate: todayStr, preset: 'last_6_months' },
      });
      return;
    }

    if (preset === 'last_year') {
      setShowCustomDateInputs(false);
      const pastYear = now.getFullYear() - 1;
      onChangeFilters({
        ...filters,
        joiningDate: { startDate: `${pastYear}-01-01`, endDate: `${pastYear}-12-31`, preset: 'last_year' },
      });
      return;
    }

    if (preset === 'custom') {
      setShowCustomDateInputs(true);
      onChangeFilters({
        ...filters,
        joiningDate: { ...filters.joiningDate, preset: 'custom' },
      });
    }
  };

  const hasActiveFilters =
    filters.department !== 'All' ||
    filters.designation !== 'All' ||
    filters.employmentType !== 'All' ||
    filters.gender !== 'All' ||
    filters.joiningDate.preset !== 'all' ||
    filters.reportingManager !== 'All' ||
    filters.employeeStatus !== 'All' ||
    Boolean(filters.search.trim());

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
      {/* Header of Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Global Filters</h2>
            <p className="text-[11px] text-slate-500">Apply criteria across all dashboard charts</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/60 text-xs font-semibold text-rose-700 hover:bg-rose-100/70 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {totalFilteredCount} of {totalUnfilteredCount} Employees
            </span>
          </div>
        </div>
      </div>

      {/* 7 Global Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* 1. Department */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Department
          </label>
          <div className="relative">
            <select
              value={filters.department}
              onChange={(e) => onChangeFilters({ ...filters, department: e.target.value })}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 pr-8 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.dep_id} value={String(dept.dep_id)}>
                  {dept.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 2. Designation */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Designation
          </label>
          <div className="relative">
            <select
              value={filters.designation}
              onChange={(e) => onChangeFilters({ ...filters, designation: e.target.value })}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 pr-8 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
            >
              <option value="All">All Designations</option>
              {roles.map((role) => (
                <option key={role.role_id} value={String(role.role_id)}>
                  {role.role_name || role.name || `Role #${role.role_id}`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 3. Employment Type */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Employment Type
          </label>
          <div className="relative">
            <select
              value={filters.employmentType}
              onChange={(e) => onChangeFilters({ ...filters, employmentType: e.target.value })}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 pr-8 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
            >
              <option value="All">All Employment Types</option>
              {employmentTypeLookups.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.label || t.code}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 4. Gender */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Gender
          </label>
          <div className="relative">
            <select
              value={filters.gender}
              onChange={(e) => onChangeFilters({ ...filters, gender: e.target.value })}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 pr-8 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
            >
              <option value="All">All Genders</option>
              {genderLookups.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.label || g.code}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 5. Joining Date */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Joining Date
          </label>
          <div className="relative">
            <select
              value={filters.joiningDate.preset}
              onChange={(e) => handleJoiningDatePresetChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 pr-8 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Date Range...</option>
            </select>
            <Calendar className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 6. Reporting Manager */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Reporting Manager
          </label>
          <div className="relative">
            <select
              value={filters.reportingManager}
              onChange={(e) => onChangeFilters({ ...filters, reportingManager: e.target.value })}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 pr-8 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
            >
              <option value="All">All Managers</option>
              {managerOptions.map((mgr) => (
                <option key={mgr.emp_id} value={String(mgr.emp_id)}>
                  {mgr.name} {mgr.is_active ? '' : '(Inactive)'}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 7. Employee Status */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Employee Status
          </label>
          <div className="relative">
            <select
              value={filters.employeeStatus}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  employeeStatus: e.target.value as 'All' | 'Active' | 'Inactive',
                })
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-800 pr-8 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
            >
              <option value="All">All (Default)</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Search Field */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Search Employees
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChangeFilters({ ...filters, search: e.target.value })}
              placeholder="Search ID, name, email, phone..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8.5 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onChangeFilters({ ...filters, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Optional Custom Date Range Inputs */}
      {showCustomDateInputs && (
        <div className="mt-3.5 flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 bg-blue-50/30 p-3 rounded-xl border border-blue-100/60">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Custom Date Range:
          </span>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-500 font-medium">From:</label>
            <input
              type="date"
              value={filters.joiningDate.startDate}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  joiningDate: { ...filters.joiningDate, startDate: e.target.value },
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-500 font-medium">To:</label>
            <input
              type="date"
              value={filters.joiningDate.endDate}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  joiningDate: { ...filters.joiningDate, endDate: e.target.value },
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
