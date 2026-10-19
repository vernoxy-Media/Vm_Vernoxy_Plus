import React from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import type { TaskBoardQueryDto } from '../types';

export interface TaskFiltersBarProps {
  filters: TaskBoardQueryDto;
  onChange: (filters: TaskBoardQueryDto) => void;
  taskTypeOptions?: { id: number; label: string }[];
  assigneeOptions?: { emp_id: number; name: string }[];
}

export const TaskFiltersBar: React.FC<TaskFiltersBarProps> = ({
  filters,
  onChange,
  taskTypeOptions = [],
  assigneeOptions = [],
}) => {
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.priority ||
      filters.task_type_id ||
      filters.assignee_id ||
      filters.overdue_only,
  );

  const resetFilters = () => {
    onChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-white p-3 border border-slate-200/80 shadow-xs mb-4">
      {/* Search Bar */}
      <div className="relative min-w-[200px] flex-1">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title or code..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
        />
      </div>

      {/* Priority Dropdown */}
      <select
        value={filters.priority || ''}
        onChange={(e) =>
          onChange({
            ...filters,
            priority: (e.target.value as any) || undefined,
          })
        }
        className="rounded-xl border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
      >
        <option value="">All Priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>

      {/* Task Type Dropdown */}
      {taskTypeOptions.length > 0 && (
        <select
          value={filters.task_type_id ? String(filters.task_type_id) : ''}
          onChange={(e) =>
            onChange({
              ...filters,
              task_type_id: e.target.value ? parseInt(e.target.value, 10) : undefined,
            })
          }
          className="rounded-xl border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Types</option>
          {taskTypeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Assignee Dropdown */}
      {assigneeOptions.length > 0 && (
        <select
          value={filters.assignee_id ? String(filters.assignee_id) : ''}
          onChange={(e) =>
            onChange({
              ...filters,
              assignee_id: e.target.value ? parseInt(e.target.value, 10) : undefined,
            })
          }
          className="rounded-xl border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 max-w-[150px] truncate"
        >
          <option value="">All Assignees</option>
          {assigneeOptions.map((a) => (
            <option key={a.emp_id} value={a.emp_id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      {/* Overdue Checkbox Toggle */}
      <button
        type="button"
        onClick={() => onChange({ ...filters, overdue_only: !filters.overdue_only })}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
          filters.overdue_only
            ? 'bg-rose-50 border-rose-300 text-rose-700'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        Overdue Only
      </button>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Reset
        </button>
      )}
    </div>
  );
};
