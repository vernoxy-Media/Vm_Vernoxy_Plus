import React from 'react';
import { Download, LayoutGrid, List, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { SortMenu } from '../leads/SortMenu';

export interface CompanyToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  filterCount: number;
  onOpenFilters: () => void;
  sort: string;
  onSort: (value: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  selectedCount: number;
  onClearSelection: () => void;
  onExportSelected: () => void;
  canExport: boolean;
  view: 'table' | 'cards';
  onViewChange: (view: 'table' | 'cards') => void;
}

const SORTS = [
  { value: 'created_at-desc', label: 'Recently added', hint: 'Newest companies on top' },
  { value: 'created_at-asc', label: 'Oldest first', hint: 'Longest in the list on top' },
  { value: 'name-asc', label: 'Name A–Z', hint: 'Alphabetical' },
  { value: 'name-desc', label: 'Name Z–A', hint: 'Reverse alphabetical' },
  { value: 'city-asc', label: 'City A–Z', hint: 'Grouped by city' },
];

/** Search, filters, sort and refresh in one bar (same look as the Leads toolbar). */
export const CompanyToolbar: React.FC<CompanyToolbarProps> = (p) => (
  <div className="rounded-2xl border border-gray-200/80 bg-white p-2 shadow-2xs">
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:min-w-[16rem] sm:flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={p.search}
          onChange={(e) => p.onSearch(e.target.value)}
          placeholder="Search company, ID, contact, phone or city"
          aria-label="Search companies"
          className="h-10 w-full rounded-xl border border-transparent bg-gray-100/70 pl-10 pr-9 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-primary/40 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-primary/10"
        />
        {p.search && (
          <button type="button" onClick={() => p.onSearch('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-200/60 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
        <button
          type="button"
          onClick={p.onOpenFilters}
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition sm:px-3.5 ${
            p.filterCount > 0 ? 'border-primary/30 bg-primary/5 text-primary' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {p.filterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">{p.filterCount}</span>}
        </button>

        <SortMenu className="min-w-0 flex-1 sm:w-48 sm:flex-none" value={p.sort} onChange={p.onSort} options={SORTS} />

        <div role="group" aria-label="View" className="hidden shrink-0 items-center gap-0.5 rounded-xl bg-gray-100 p-1 sm:inline-flex">
          {([['table', List, 'Table'], ['cards', LayoutGrid, 'Cards']] as const).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => p.onViewChange(key)}
              aria-pressed={p.view === key}
              title={`${label} view`}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition ${p.view === key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={p.onRefresh}
          disabled={p.refreshing}
          title="Refresh"
          aria-label="Refresh"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${p.refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>

    {p.selectedCount > 0 && (
      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-primary/5 px-3.5 py-2 text-sm">
        <span className="font-semibold text-primary">
          {p.selectedCount} selected
          <button type="button" onClick={p.onClearSelection} className="ml-3 text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-gray-800">
            Deselect all
          </button>
        </span>
        <button
          type="button"
          onClick={p.onExportSelected}
          disabled={!p.canExport}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export selected
        </button>
      </div>
    )}
  </div>
);
