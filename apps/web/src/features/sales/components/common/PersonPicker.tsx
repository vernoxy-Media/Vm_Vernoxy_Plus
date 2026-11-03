import React, { useMemo, useRef, useState } from 'react';
import { Check, Search, ShieldCheck } from 'lucide-react';
import { getAvatarColor, getInitials } from '../../utils/formatters';

export interface PickablePerson {
  emp_id: number;
  name: string;
  is_admin?: boolean;
}

export interface PersonPickerProps {
  people: PickablePerson[];
  value: number | null;
  onChange: (empId: number) => void;
  /** This person is shown as "Current" and cannot be picked again. */
  currentEmpId?: number;
  autoFocus?: boolean;
}

/** A searchable list of people with avatars: easier than a long dropdown. */
export const PersonPicker: React.FC<PersonPickerProps> = ({ people, value, onChange, currentEmpId, autoFocus = false }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q ? people.filter((p) => p.name.toLowerCase().includes(q) || `emp-${p.emp_id}`.includes(q)) : people;
    return [...rows].sort((a, b) => Number(b.emp_id === currentEmpId) - Number(a.emp_id === currentEmpId) || a.name.localeCompare(b.name));
  }, [people, query, currentEmpId]);

  const pick = (p: PickablePerson) => {
    if (p.emp_id !== currentEmpId) onChange(p.emp_id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && shown[active]) {
      e.preventDefault();
      pick(shown[active]);
    }
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
      <div className="relative border-b border-gray-100">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus={autoFocus}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search by name or EMP ID…"
          className="w-full bg-transparent py-3 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
        />
      </div>

      <div ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1.5">
        {shown.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">No one matches this search.</p>
        ) : (
          shown.map((p, i) => {
            const selected = p.emp_id === value;
            const current = p.emp_id === currentEmpId;
            return (
              <button
                key={p.emp_id}
                type="button"
                role="option"
                aria-selected={selected}
                data-active={i === active}
                disabled={current}
                onClick={() => pick(p)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                  selected ? 'bg-primary/10 ring-1 ring-primary/30' : i === active ? 'bg-gray-50' : ''
                } ${current ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(p.name)}`}>
                  {getInitials(p.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-gray-900">{p.name}</span>
                    {p.is_admin && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-gray-400">EMP-{p.emp_id}</span>
                </span>
                {current ? (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Current</span>
                ) : selected ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
