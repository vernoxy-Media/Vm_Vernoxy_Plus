import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';

/** A project keeps its technologies as one text, a name per line. Older projects used commas. */
export function parseTech(value?: string | null): string[] {
  return (value ?? '')
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function joinTech(values: string[]): string {
  return values.join('\n');
}

interface TechMultiSelectProps {
  /** The master list the choices come from: tech_frontend, tech_backend, tech_cloud or tech_database */
  lookupType: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}

export const TechMultiSelect: React.FC<TechMultiSelectProps> = ({ lookupType, label, values, onChange }) => {
  const { data, isLoading } = useLookupsQuery(lookupType);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // A value saved earlier that is no longer in the list stays selectable so it is not lost on save
  const options = useMemo(() => {
    const names = (data ?? []).map((o) => o.label);
    for (const v of values) if (!names.includes(v)) names.push(v);
    return names;
  }, [data, values]);

  const shown = options.filter((o) => o.toLowerCase().includes(search.trim().toLowerCase()));
  const toggle = (name: string) =>
    onChange(values.includes(name) ? values.filter((v) => v !== name) : [...values, name]);

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-xs font-semibold text-slate-700">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[38px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left text-xs"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex flex-wrap gap-1">
          {values.length === 0 ? (
            <span className="text-slate-400">{isLoading ? 'Loading...' : 'Select (optional)'}</span>
          ) : (
            values.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                {v}
                <span
                  role="button"
                  aria-label={`Remove ${v}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(v);
                  }}
                  className="cursor-pointer text-blue-400 hover:text-blue-700"
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-xs focus:outline-none"
            />
          </div>
          <ul role="listbox" aria-multiselectable="true" className="max-h-52 overflow-y-auto">
            {shown.length === 0 && (
              <li className="px-2 py-2 text-xs text-slate-400">Nothing found. The Admin can add more in Settings.</li>
            )}
            {shown.map((name) => {
              const on = values.includes(name);
              return (
                <li key={name} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => toggle(name)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                  >
                    <span className={on ? 'font-semibold text-blue-700' : 'text-slate-700'}>{name}</span>
                    {on && <Check className="h-3.5 w-3.5 text-blue-600" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
