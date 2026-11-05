import React from 'react';
import { Search, X } from 'lucide-react';
import type { TaskBoardQueryDto } from '../types';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';

export interface TaskFiltersBarProps {
  filters: TaskBoardQueryDto;
  onChange: (filters: TaskBoardQueryDto) => void;
  taskTypeOptions?: { id: number; label: string }[];
  /** Admin: filter by Employee (BFD 2.2). */
  assigneeOptions?: { emp_id: number; name: string }[];
  /** Employee Tasks screen: filter by Source (BFD 3.2). */
  showSource?: boolean;
}

const SELECT =
  'rounded-xl border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500';

/** Search and filters. Stage, Priority, Task Type and Source options come from master data. */
export const TaskFiltersBar: React.FC<TaskFiltersBarProps> = ({
  filters,
  onChange,
  taskTypeOptions = [],
  assigneeOptions = [],
  showSource = false,
}) => {
  const { data: stages = [] } = useLookupsQuery('task_stage');
  const { data: priorities = [] } = useLookupsQuery('task_priority');
  const { data: sources = [] } = useLookupsQuery('task_source');

  const hasActiveFilters = Boolean(
    filters.search || filters.priority || filters.task_type_id || filters.assignee_id || filters.stage || filters.source,
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-white p-3 border border-slate-200/80 shadow-xs mb-4">
      <div className="relative min-w-[180px] flex-1">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Task ID or Task Name"
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
        />
      </div>

      {assigneeOptions.length > 0 && (
        <select
          value={filters.assignee_id ? String(filters.assignee_id) : ''}
          onChange={(e) => onChange({ ...filters, assignee_id: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          className={`${SELECT} max-w-[160px] truncate`}
        >
          <option value="">All Employees</option>
          {assigneeOptions.map((a) => (
            <option key={a.emp_id} value={a.emp_id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.priority || ''}
        onChange={(e) => onChange({ ...filters, priority: (e.target.value as any) || undefined })}
        className={SELECT}
      >
        <option value="">All Priorities</option>
        {priorities.map((p) => (
          <option key={p.code} value={p.code}>
            {p.label}
          </option>
        ))}
      </select>

      {taskTypeOptions.length > 0 && (
        <select
          value={filters.task_type_id ? String(filters.task_type_id) : ''}
          onChange={(e) => onChange({ ...filters, task_type_id: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          className={SELECT}
        >
          <option value="">All Task Types</option>
          {taskTypeOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {showSource && (
        <select
          value={filters.source || ''}
          onChange={(e) => onChange({ ...filters, source: (e.target.value as any) || undefined })}
          className={SELECT}
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.stage || ''}
        onChange={(e) => onChange({ ...filters, stage: (e.target.value as any) || undefined })}
        className={SELECT}
      >
        <option value="">All Stages</option>
        {stages.map((s) => (
          <option key={s.code} value={s.code}>
            {s.label}
          </option>
        ))}
      </select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" /> Reset
        </button>
      )}
    </div>
  );
};
