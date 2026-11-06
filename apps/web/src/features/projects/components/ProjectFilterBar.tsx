import React from 'react';
import { Search, LayoutGrid, List, Kanban, X } from 'lucide-react';
import type { AssignableEmployee } from '../types';

export type ViewMode = 'grid' | 'list' | 'kanban';

interface ProjectFilterBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  projectManagerId: string;
  onProjectManagerChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  managers: AssignableEmployee[];
}

const STAGE_PILLS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'planning', label: 'Planning' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'on_hold', label: 'On Hold' },
  { id: 'cancelled', label: 'Cancelled' },
];

const VIEWS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: 'grid', label: 'Cards', icon: LayoutGrid },
  { id: 'list', label: 'List', icon: List },
  { id: 'kanban', label: 'Board', icon: Kanban },
];

const CONTROL =
  'h-8 rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] px-2 text-[14px] text-[#172B4D] transition-colors hover:bg-[#EBECF0] focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none';

/** Search, filters and the view switch, laid out like a Jira filter bar: everything is visible, nothing hides behind an icon. */
export const ProjectFilterBar: React.FC<ProjectFilterBarProps> = ({
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  status,
  onStatusChange,
  projectManagerId,
  onProjectManagerChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClearFilters,
  hasActiveFilters,
  managers,
}) => (
  <div className="space-y-2.5">
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E6C84]" />
        <input
          type="text"
          placeholder="Search projects"
          aria-label="Search projects"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${CONTROL} w-full pl-7 placeholder:text-[#7A869A]`}
        />
      </div>

      <select
        value={projectManagerId}
        onChange={(e) => onProjectManagerChange(e.target.value)}
        aria-label="Project manager"
        className={`${CONTROL} max-w-[180px] truncate`}
      >
        <option value="all">All managers</option>
        {managers.map((m) => (
          <option key={m.emp_id} value={m.emp_id}>
            {m.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5 text-[13px] text-[#5E6C84]">
        <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} aria-label="Start date from" title="Start date from" className={`${CONTROL} w-[140px]`} />
        <span>to</span>
        <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} aria-label="End date until" title="End date until" className={`${CONTROL} w-[140px]`} />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-[3px] px-2 text-[14px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]"
        >
          <X className="h-3.5 w-3.5" /> Clear filters
        </button>
      )}

      <div role="group" aria-label="View" className="ml-auto inline-flex rounded-[3px] bg-[rgba(9,30,66,0.04)] p-0.5">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={viewMode === id}
            onClick={() => onViewModeChange(id)}
            title={`${label} view`}
            className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[3px] px-2.5 text-[13px] font-medium transition ${
              viewMode === id ? 'bg-white text-[color:var(--ac-main,#0052CC)] shadow-[0_1px_1px_rgba(9,30,66,0.25)]' : 'text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>

    {/* Status, one click each; scrolls sideways on a narrow screen */}
    <div role="tablist" aria-label="Project status" className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
      {STAGE_PILLS.map((pill) => {
        const active = status === pill.id;
        return (
          <button
            key={pill.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onStatusChange(pill.id)}
            className={`h-8 shrink-0 cursor-pointer rounded-[3px] px-3 text-[14px] font-medium transition-colors ${
              active ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'
            }`}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  </div>
);
