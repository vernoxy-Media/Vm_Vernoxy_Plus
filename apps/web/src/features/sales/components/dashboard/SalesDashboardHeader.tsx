import React from 'react';
import { Search, SlidersHorizontal, RefreshCw, X } from 'lucide-react';

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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
          Sales Management Dashboard
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Track leads, conversions, sales activity, revenue and profitability at a glance
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
        {/* Search Bar */}
        <div className="relative min-w-[260px] max-w-xs sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads, companies, contacts..."
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh dashboard data"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Admin Config Button */}
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAdminConfig}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Dashboard Config</span>
          </button>
        )}
      </div>
    </div>
  );
};
