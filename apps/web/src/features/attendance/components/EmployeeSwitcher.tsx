import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Users } from 'lucide-react';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';

export interface SwitcherEmployee {
  emp_id: number;
  name: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** Administrators pick whose attendance to look at: a searchable list of employees. */
export const EmployeeSwitcher: React.FC<{
  value: SwitcherEmployee | null;
  me: SwitcherEmployee;
  onChange: (employee: SwitcherEmployee | null) => void;
}> = ({ value, me, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { data: options = [], isFetching } = useEmployeeOptionsQuery(debounced || undefined);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', out);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const current = value ?? me;
  const pick = (e: SwitcherEmployee | null) => {
    onChange(e);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-10 max-w-[16rem] items-center gap-2 rounded-xl border bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50 cursor-pointer ${
          value ? 'border-[#5B4CF8] ring-2 ring-[#5B4CF8]/15' : 'border-[#E2E8F0]'
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
          {initials(current.name)}
        </span>
        <span className="truncate">{value ? current.name : 'My attendance'}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div role="listbox" className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in">
          <div className="relative border-b border-slate-100">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee by name or code"
              className="h-11 w-full bg-transparent pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => pick(null)}
              className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-sm hover:bg-slate-50 cursor-pointer"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Users className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900">My attendance</span>
                <span className="block truncate text-xs text-slate-500">{me.name}</span>
              </span>
              {!value && <Check className="h-4 w-4 text-[#5B4CF8]" />}
            </button>

            {options
              .filter((o) => o.emp_id !== me.emp_id)
              .map((o) => (
                <button
                  key={o.emp_id}
                  type="button"
                  role="option"
                  aria-selected={value?.emp_id === o.emp_id}
                  onClick={() => pick({ emp_id: o.emp_id, name: o.name })}
                  className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-sm hover:bg-slate-50 cursor-pointer"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {initials(o.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{o.name}</span>
                    <span className="block truncate text-xs text-slate-500">{o.employee_code ?? o.email}</span>
                  </span>
                  {value?.emp_id === o.emp_id && <Check className="h-4 w-4 text-[#5B4CF8]" />}
                </button>
              ))}

            {!isFetching && options.filter((o) => o.emp_id !== me.emp_id).length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-slate-400">No employee found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
