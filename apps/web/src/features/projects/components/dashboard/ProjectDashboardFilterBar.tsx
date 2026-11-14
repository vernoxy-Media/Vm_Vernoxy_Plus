import React, { useMemo } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Calendar,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  ProjectDashboardFilters,
  ALL_PROJECT_CATEGORIES,
  ALL_PROJECT_STATUSES,
  EnrichedProjectItem,
} from './project-dashboard.types';
import type { AssignableEmployee } from '../../types';

interface ProjectDashboardFilterBarProps {
  filters: ProjectDashboardFilters;
  onChangeFilters: (filters: ProjectDashboardFilters) => void;
  onClearFilters: () => void;
  projects: EnrichedProjectItem[];
  employees: AssignableEmployee[];
  totalFilteredCount: number;
  totalUnfilteredCount: number;
}

export const ProjectDashboardFilterBar: React.FC<ProjectDashboardFilterBarProps> = ({
  filters,
  onChangeFilters,
  onClearFilters,
  projects,
  employees,
  totalFilteredCount,
  totalUnfilteredCount,
}) => {
  // Count active filters (ignoring search)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.project !== 'All') count++;
    if (filters.category !== 'All') count++;
    if (filters.status !== 'All') count++;
    if (filters.projectType !== 'All') count++;
    if (filters.projectManager !== 'All') count++;
    if (filters.client !== 'All') count++;
    if (
      filters.dateRangePreset !== 'all_time' ||
      filters.dateRange.startDate ||
      filters.dateRange.endDate
    ) {
      count++;
    }
    return count;
  }, [filters]);

  const hasAnyFilterOrSearch =
    activeFiltersCount > 0 || Boolean(filters.search.trim());

  // Unique Project Managers from project list and assignable employees
  const projectManagers = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of projects) {
      if (p.project_manager_id && p.project_manager_name) {
        map.set(p.project_manager_id, p.project_manager_name);
      }
    }
    for (const e of employees) {
      if (!map.has(e.emp_id)) {
        map.set(e.emp_id, e.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [projects, employees]);

  // Unique Clients (BRD Page 4 Wireframe)
  const clientOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.client_name && p.client_name.trim()) {
        set.add(p.client_name.trim());
      }
    }
    return Array.from(set).sort();
  }, [projects]);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-4">
      {/* Top Header Row of Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">Global Filters</h2>
              {activeFiltersCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600 border border-blue-200/60">
                  {activeFiltersCount} active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Apply criteria across all nine project dashboard charts
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
              {totalFilteredCount} of {totalUnfilteredCount} Projects
            </span>
          </div>
        </div>
      </div>

      {/* All Global Filters + Search Grid (Covering BRD Page 1 & Page 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Project */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Project
          </label>
          <div className="relative">
            <select
              value={filters.project}
              onChange={(e) => onChangeFilters({ ...filters, project: e.target.value })}
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="All">All Projects</option>
              {projects.map((proj) => (
                <option key={proj.project_id} value={String(proj.project_id)}>
                  {proj.project_name} ({proj.project_no})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 2. Category */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Category
          </label>
          <div className="relative">
            <select
              value={filters.category}
              onChange={(e) => onChangeFilters({ ...filters, category: e.target.value })}
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="All">All Categories</option>
              {ALL_PROJECT_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 3. Status */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Status
          </label>
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => onChangeFilters({ ...filters, status: e.target.value })}
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="All">All (Default)</option>
              {ALL_PROJECT_STATUSES.map((st) => (
                <option key={st.key} value={st.key}>
                  {st.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 4. Project Type */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Project Type
          </label>
          <div className="relative">
            <select
              value={filters.projectType}
              onChange={(e) => onChangeFilters({ ...filters, projectType: e.target.value })}
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="All">All Types</option>
              <option value="client">Client</option>
              <option value="internal">Internal</option>
              <option value="product">Product</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 5. Project Manager */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Project Manager
          </label>
          <div className="relative">
            <select
              value={filters.projectManager}
              onChange={(e) => onChangeFilters({ ...filters, projectManager: e.target.value })}
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="All">All Managers</option>
              {projectManagers.map((mgr) => (
                <option key={mgr.id} value={String(mgr.id)}>
                  {mgr.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 6. Client (BRD Page 4 Wireframe) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Client
          </label>
          <div className="relative">
            <select
              value={filters.client}
              onChange={(e) => onChangeFilters({ ...filters, client: e.target.value })}
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="All">All Clients</option>
              {clientOptions.map((cli) => (
                <option key={cli} value={cli}>
                  {cli}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 7. Date Range (BRD Page 4 Wireframe: 'Date Range: All Time') */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Date Range
          </label>
          <div className="relative">
            <select
              value={filters.dateRangePreset}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  dateRangePreset: e.target.value,
                  dateRange:
                    e.target.value !== 'custom'
                      ? { startDate: '', endDate: '' }
                      : filters.dateRange,
                })
              }
              className="w-full h-[38px] appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-800 pr-8 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer shadow-2xs"
            >
              <option value="all_time">All Time</option>
              <option value="today">Today</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="custom">Custom Range...</option>
            </select>
            <Calendar className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* 8. Search Projects */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
            <span>Search</span>
            {filters.search && (
              <span className="text-[10px] text-blue-600 font-semibold lowercase">filtering</span>
            )}
          </label>
          <div className="relative group">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChangeFilters({ ...filters, search: e.target.value })}
              placeholder="Search projects..."
              className="w-full h-[38px] rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-2xs"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onChangeFilters({ ...filters, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Custom Date Range Popdown Inputs (Only visible when Custom Range is selected) */}
      {filters.dateRangePreset === 'custom' && (
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-blue-50/40 p-2.5 rounded-xl border border-blue-100/60 animate-in fade-in">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Custom Date Range:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateRange.startDate}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, startDate: e.target.value },
                })
              }
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={filters.dateRange.endDate}
              min={filters.dateRange.startDate || undefined}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, endDate: e.target.value },
                })
              }
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
            {(filters.dateRange.startDate || filters.dateRange.endDate) && (
              <button
                type="button"
                onClick={() =>
                  onChangeFilters({
                    ...filters,
                    dateRange: { startDate: '', endDate: '' },
                  })
                }
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 ml-1"
              >
                Clear Range
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
