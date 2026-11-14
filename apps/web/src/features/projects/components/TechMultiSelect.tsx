import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { J_INPUT, J_LABEL } from '@/shared/ui/JiraModal';

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

/** Jira-style multiselect: grey chips in a field, a searchable checklist below. */
export const TechMultiSelect: React.FC<TechMultiSelectProps> = ({ lookupType, label, values, onChange }) => {
  const { data, isLoading } = useLookupsQuery(lookupType);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    // Keep the list in view when the form is scrolled
    panelRef.current?.scrollIntoView({ block: 'nearest' });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  // A value saved earlier that is no longer in the list stays selectable so it is not lost on save
  const options = useMemo(() => {
    const names = (data ?? []).map((o) => o.label);
    for (const v of values) if (!names.includes(v)) names.push(v);
    return names;
  }, [data, values]);

  const shown = options.filter((o) => o.toLowerCase().includes(search.trim().toLowerCase()));
  const toggle = (name: string) => onChange(values.includes(name) ? values.filter((v) => v !== name) : [...values, name]);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className={J_LABEL}>
          {label}
          <span className="ml-1.5 font-normal text-[#7A869A]">Optional</span>
        </label>
        {values.length > 0 && <span className="mb-1 text-[12px] text-[#5E6C84]">{values.length} selected</span>}
      </div>

      <div
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className={`${J_INPUT} flex min-h-[36px] cursor-pointer items-center justify-between gap-2 !py-1 ${open ? '!border-[color:var(--ac-400,#4C9AFF)] !bg-white' : ''}`}
      >
        <span className="flex min-w-0 flex-wrap gap-1">
          {values.length === 0 ? (
            <span className="text-[#7A869A]">{isLoading ? 'Loading...' : 'Select'}</span>
          ) : (
            values.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 rounded-[3px] bg-[#DFE1E6] py-0.5 pl-1.5 pr-1 text-[13px] font-medium text-[#172B4D]">
                {v}
                <button
                  type="button"
                  aria-label={`Remove ${v}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(v);
                  }}
                  className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.12)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#5E6C84] transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 right-0 top-full z-30 mt-1 rounded-[3px] bg-white shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]"
        >
          <div className="relative border-b border-[#DFE1E6] p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E6C84]" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className={`${J_INPUT} pl-8`}
            />
          </div>
          <ul id={`${id}-list`} role="listbox" aria-multiselectable="true" className="max-h-48 overflow-y-auto py-1">
            {shown.length === 0 && (
              <li className="px-3 py-4 text-center text-[13px] text-[#5E6C84]">
                {options.length === 0 ? 'Nothing to choose yet. The Admin can add options in Settings.' : `No match for “${search}”`}
              </li>
            )}
            {shown.map((name) => {
              const on = values.includes(name);
              return (
                <li key={name} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => toggle(name)}
                    className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[14px] text-[#172B4D] transition-colors hover:bg-[#F4F5F7] ${
                      on ? 'bg-[rgb(var(--ac-50-rgb,222_235_255)/0.6)]' : ''
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-2 ${
                        on ? 'border-[color:var(--ac-main,#0052CC)] bg-[color:var(--ac-main,#0052CC)] text-white' : 'border-[#DFE1E6] bg-white'
                      }`}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3.5} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{name}</span>
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
