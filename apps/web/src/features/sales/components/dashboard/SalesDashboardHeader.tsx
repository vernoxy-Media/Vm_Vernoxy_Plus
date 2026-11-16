import React from 'react';
import { Search, SlidersHorizontal, RefreshCw, X, BarChart3 } from 'lucide-react';

interface SalesDashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  isAdmin: boolean;
  onOpenAdminConfig: () => void;
}

export const SalesDashboardHeader: React.FC<SalesDashboardHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isLoading,
  isAdmin,
  onOpenAdminConfig,
}) => {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 sm:flex">
          <BarChart3 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            Sales Management Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-[13px]">
            Track leads, conversions, sales activity, revenue and profitability at a glance
          </p>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2.5 lg:w-auto lg:flex-nowrap">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto lg:w-80 lg:flex-none">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads, companies, contacts..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-[13px] font-medium text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh dashboard data"
          className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 active:scale-[0.98] disabled:opacity-60 sm:flex-none"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAdminConfig}
            className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-[13px] font-semibold text-white shadow-md shadow-blue-600/25 transition hover:brightness-110 active:scale-[0.98] sm:flex-none"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Dashboard Config</span>
          </button>
        )}
      </div>
    </div>
  );
};
