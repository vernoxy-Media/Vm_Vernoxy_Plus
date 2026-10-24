import React, { useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Kanban,
  SlidersHorizontal,
  X,
} from 'lucide-react';
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
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <div className="space-y-2">
      {/* Sleek unified bar matching Image 3 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        {/* Center/Right: Stage Pills matching Image 3 */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
          {STAGE_PILLS.map((pill) => {
            const isActive = status === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => onStatusChange(pill.id)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors shrink-0 ${
                  isActive
                    ? 'border border-slate-400 bg-slate-100 text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Far Right: View Mode Toggle & Advanced Filters */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            title="Additional Filters (Manager, Date)"
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showAdvancedFilters || (projectManagerId !== 'all' || startDate || endDate)
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* View Mode Buttons */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('kanban')}
              title="Kanban Board"
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Advanced Filters (Manager, Date Range) */}
      {showAdvancedFilters && (
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs animate-in fade-in-50 duration-150">
          {/* Project Manager Dropdown */}
          <div className="w-48">
            <select
              value={projectManagerId}
              onChange={(e) => onProjectManagerChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
            >
              <option value="all">All Managers</option>
              {managers.map((m) => (
                <option key={m.emp_id} value={m.emp_id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-[11px] text-slate-400 font-medium">Dates:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              title="Start date filter"
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              title="End date filter"
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
};
