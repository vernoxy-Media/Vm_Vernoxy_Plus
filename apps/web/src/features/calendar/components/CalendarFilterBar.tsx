import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, RotateCcw, Search, SlidersHorizontal, Users, X } from 'lucide-react';
import type { AssignableEmployee } from '../api/calendar.api';

export interface CalendarFilters {
  datePreset: 'all' | 'today' | 'yesterday';
  stage: 'all' | 'requested' | 'completed';
  projectId: number | 'all';
  taskTypeId: number | 'all';
  priority: string;
  selectedEmployeeIds: number[];
  departmentId?: number | 'all';
}

interface CalendarFilterBarProps {
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
  onReset: () => void;
  isAdmin: boolean;
  employees: AssignableEmployee[];
  taskTypes?: Array<{ id: number; label: string }>;
  departments?: Array<{ id: number; name: string }>;
  isOpen: boolean;
  onToggle: () => void;
}

const DATE_PRESETS: Array<[CalendarFilters['datePreset'], string]> = [
  ['all', 'Whole month'],
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
];

const field = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';
const control =
  'h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

/** A labelled select with the arrow drawn by us, so it looks the same in every browser. */
const Select: React.FC<{ label: string; value: string | number; onChange: (v: string) => void; children: React.ReactNode }> = ({ label, value, onChange, children }) => (
  <label className="flex min-w-0 flex-col gap-1.5">
    <span className={field}>{label}</span>
    <span className="relative block">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={control}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </span>
  </label>
);

export const CalendarFilterBar: React.FC<CalendarFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  isAdmin,
  employees,
  taskTypes = [],
  departments = [],
  isOpen,
  onToggle,
}) => {
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  /** Opens the list next to its button, then keeps it inside the window (it is drawn above everything else). */
  const openEmployees = () => {
    const r = dropdownRef.current?.getBoundingClientRect();
    if (r && window.innerWidth >= 640) {
      const width = Math.min(320, window.innerWidth - 16);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      const below = window.innerHeight - r.bottom - 12;
      const top = below >= 260 ? r.bottom + 4 : Math.max(8, r.top - Math.min(420, r.top - 16) - 4);
      setPlace({ top, left, width, maxHeight: below >= 260 ? Math.min(420, below) : Math.min(420, r.top - 16) });
    } else setPlace(null); // phones: a sheet from the bottom
    setEmployeesOpen(true);
  };

  useEffect(() => {
    const out = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!dropdownRef.current?.contains(t) && !listRef.current?.contains(t)) setEmployeesOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setEmployeesOpen(false);
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', out);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const q = employeeSearch.toLowerCase();
  const shownEmployees = employees.filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
  const toggleEmployee = (id: number) =>
    onChange({
      ...filters,
      selectedEmployeeIds: filters.selectedEmployeeIds.includes(id) ? filters.selectedEmployeeIds.filter((x) => x !== id) : [...filters.selectedEmployeeIds, id],
    });

  const employeesFiltered = isAdmin && filters.selectedEmployeeIds.length > 0 && filters.selectedEmployeeIds.length < employees.length;
  const taskTypeName = taskTypes.find((t) => t.id === filters.taskTypeId)?.label;
  const departmentName = departments.find((d) => d.id === filters.departmentId)?.name;

  // What is switched on, as chips that can each be switched off again.
  const chips: Array<{ key: string; label: string; clear: () => void }> = [
    ...(filters.datePreset !== 'all' ? [{ key: 'date', label: filters.datePreset === 'today' ? 'Today' : 'Yesterday', clear: () => onChange({ ...filters, datePreset: 'all' }) }] : []),
    ...(filters.stage !== 'all' ? [{ key: 'stage', label: filters.stage === 'requested' ? 'Submitted only' : 'Approved only', clear: () => onChange({ ...filters, stage: 'all' }) }] : []),
    ...(filters.priority !== 'all' ? [{ key: 'priority', label: `Priority: ${filters.priority}`, clear: () => onChange({ ...filters, priority: 'all' }) }] : []),
    ...(filters.taskTypeId !== 'all' ? [{ key: 'type', label: `Type: ${taskTypeName ?? filters.taskTypeId}`, clear: () => onChange({ ...filters, taskTypeId: 'all' }) }] : []),
    ...(filters.departmentId != null && filters.departmentId !== 'all' ? [{ key: 'dept', label: `Department: ${departmentName ?? filters.departmentId}`, clear: () => onChange({ ...filters, departmentId: 'all' }) }] : []),
    ...(employeesFiltered ? [{ key: 'emp', label: `${filters.selectedEmployeeIds.length} employee${filters.selectedEmployeeIds.length > 1 ? 's' : ''}`, clear: () => onChange({ ...filters, selectedEmployeeIds: [] }) }] : []),
  ];

  if (!isOpen) return null;

  return (
    <section aria-label="Filters" className="msg-fade rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <SlidersHorizontal className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-800">Filters</h2>
        {chips.length > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">{chips.length} on</span>}
        <div className="ml-auto flex items-center gap-1">
          {chips.length > 0 && (
            <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">
              <RotateCcw className="h-3.5 w-3.5" /> Reset all
            </button>
          )}
          <button type="button" onClick={onToggle} aria-label="Close filters" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <span className={field}>Day</span>
          <div role="radiogroup" aria-label="Day" className="grid h-10 grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {DATE_PRESETS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={filters.datePreset === value}
                onClick={() => onChange({ ...filters, datePreset: value })}
                className={`truncate rounded-lg px-2 text-xs font-semibold transition ${filters.datePreset === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Select label="Stage" value={filters.stage} onChange={(v) => onChange({ ...filters, stage: v as CalendarFilters['stage'] })}>
          <option value="all">Submitted &amp; approved</option>
          <option value="requested">Submitted only</option>
          <option value="completed">Approved only</option>
        </Select>

        <Select label="Priority" value={filters.priority} onChange={(v) => onChange({ ...filters, priority: v })}>
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>

        {taskTypes.length > 0 && (
          <Select label="Task type" value={filters.taskTypeId} onChange={(v) => onChange({ ...filters, taskTypeId: v === 'all' ? 'all' : parseInt(v, 10) })}>
            <option value="all">All types</option>
            {taskTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </Select>
        )}

        {departments.length > 0 && (
          <Select label="Department" value={filters.departmentId ?? 'all'} onChange={(v) => onChange({ ...filters, departmentId: v === 'all' ? 'all' : parseInt(v, 10) })}>
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        )}

        {isAdmin && employees.length > 0 && (
          <div className="relative flex min-w-0 flex-col gap-1.5" ref={dropdownRef}>
            <span className={field}>Employees</span>
            <button
              type="button"
              onClick={() => (employeesOpen ? setEmployeesOpen(false) : openEmployees())}
              aria-haspopup="listbox"
              aria-expanded={employeesOpen}
              className={`${control} flex items-center gap-2 text-left`}
            >
              <Users className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate">
                {filters.selectedEmployeeIds.length === 0 || filters.selectedEmployeeIds.length === employees.length ? 'All employees' : `${filters.selectedEmployeeIds.length} selected`}
              </span>
              <ChevronDown className="pointer-events-none absolute right-3 top-[2.1rem] h-4 w-4 text-slate-400" />
            </button>

            {employeesOpen &&
              createPortal(
                <>
                  <div className="fixed inset-0 z-[100] bg-black/30 sm:hidden" aria-hidden onMouseDown={() => setEmployeesOpen(false)} />
                  <div
                    ref={listRef}
                    style={place ? { top: place.top, left: place.left, width: place.width, maxHeight: place.maxHeight } : undefined}
                    className="msg-pop fixed inset-x-0 bottom-0 z-[101] flex max-h-[80dvh] flex-col rounded-t-3xl border border-slate-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl sm:inset-x-auto sm:bottom-auto sm:rounded-2xl sm:p-2"
                  >
                <div className="flex items-center justify-between px-2 pb-2 pt-1">
                  <span className="text-xs font-semibold text-slate-700">Employees</span>
                  <span className="flex gap-3 text-xs font-semibold">
                    <button type="button" onClick={() => onChange({ ...filters, selectedEmployeeIds: employees.map((e) => e.emp_id) })} className="text-blue-600 hover:underline">All</button>
                    <button type="button" onClick={() => onChange({ ...filters, selectedEmployeeIds: [] })} className="text-slate-500 hover:underline">Clear</button>
                  </span>
                </div>
                <label className="relative mb-2 block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Search employee"
                    aria-label="Search employee"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-base focus:border-blue-500 focus:outline-none sm:text-sm"
                  />
                </label>
                <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto" role="listbox" aria-multiselectable>
                  {shownEmployees.map((emp) => {
                    const on = filters.selectedEmployeeIds.includes(emp.emp_id);
                    return (
                      <li key={emp.emp_id} role="option" aria-selected={on}>
                        <button type="button" onClick={() => toggleEmployee(emp.emp_id)} className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition ${on ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">{emp.name.charAt(0)}</span>
                          <span className="min-w-0 flex-1 truncate font-medium">{emp.name}</span>
                          {on && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                        </button>
                      </li>
                    );
                  })}
                  {shownEmployees.length === 0 && <li className="py-4 text-center text-sm text-slate-400">No employees found</li>}
                </ul>
                  </div>
                </>,
                document.body,
              )}
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
          <span className="text-xs font-medium text-slate-500">Showing:</span>
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={c.clear} aria-label={`Remove filter ${c.label}`} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-2 text-xs font-semibold capitalize text-blue-800 transition hover:bg-blue-100">
              {c.label}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
