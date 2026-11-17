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
  'h-8 rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] px-2 text-[14px] text-[#172B4D] transition-colors hover:bg-[#EBECF0] focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none';

const DEFAULT_STAGES = [
  { code: 'assigned', label: 'To Do' },
  { code: 'in_progress', label: 'In Progress' },
  { code: 'hold', label: 'On Hold' },
  { code: 'requested', label: 'In Review' },
  { code: 'completed', label: 'Done' },
];
const DEFAULT_PRIORITIES = [
  { code: 'critical', label: 'Highest' },
  { code: 'high', label: 'High' },
  { code: 'medium', label: 'Medium' },
  { code: 'low', label: 'Low' },
];
const DEFAULT_SOURCES = [
  { code: 'personal', label: 'Personal Task' },
  { code: 'project', label: 'Project Task' },
  { code: 'quick', label: 'Task created by an employee' },
];

/** Search and filters. Stage, Priority, Task Type and Source options come from master data. */
export const TaskFiltersBar: React.FC<TaskFiltersBarProps> = ({
  filters,
  onChange,
  taskTypeOptions = [],
  assigneeOptions = [],
  showSource = false,
}) => {
  // Master data wins; the built-in list only fills in while master data has no rows, so a filter is never empty.
  const { data: stageRows = [] } = useLookupsQuery('task_stage');
  const { data: priorityRows = [] } = useLookupsQuery('task_priority');
  const { data: sourceRows = [] } = useLookupsQuery('task_source');
  const stages = stageRows.length ? stageRows : DEFAULT_STAGES;
  const priorities = priorityRows.length ? priorityRows : DEFAULT_PRIORITIES;
  const sources = sourceRows.length ? sourceRows : DEFAULT_SOURCES;

  const hasActiveFilters = Boolean(
    filters.search || filters.priority || filters.task_type_id || filters.assignee_id || filters.stage || filters.source,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E6C84]" />
        <input
          type="text"
          placeholder="Search by key or summary"
          aria-label="Search tasks"
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="h-8 w-full rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] pl-7 pr-2 text-[14px] text-[#172B4D] placeholder:text-[#7A869A] hover:bg-[#EBECF0] focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none"
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
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-[3px] px-2 text-[14px] font-medium text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]"
        >
          <X className="h-3.5 w-3.5" /> Clear filters
        </button>
      )}
    </div>
  );
};
