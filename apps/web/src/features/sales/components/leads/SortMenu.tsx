import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';

export interface SortOption {
  value: string;
  label: string;
  hint?: string;
}

export interface SortMenuProps {
  value: string;
  options: SortOption[];
  onChange: (value: string) => void;
  className?: string;
}

/** A sort picker that looks like the rest of the toolbar (the browser's own list does not). */
export const SortMenu: React.FC<SortMenuProps> = ({ value, options, onChange, className = '' }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-10 w-full items-center gap-2 rounded-xl border bg-white px-3 text-sm transition ${
          open ? 'border-primary/40 ring-4 ring-primary/10' : 'border-gray-200 hover:bg-gray-50'
        }`}
      >
        <ArrowUpDown className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="hidden text-gray-400 sm:inline">Sort</span>
        <span className="min-w-0 flex-1 truncate text-left font-medium text-gray-800">{current.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-30 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100 sm:left-auto sm:right-0"
        >
          {options.map((o) => {
            const on = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${on ? 'bg-primary/8 bg-primary/10' : 'hover:bg-gray-50'}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${on ? 'font-semibold text-primary' : 'font-medium text-gray-800'}`}>{o.label}</span>
                    {o.hint && <span className="block text-[11px] text-gray-400">{o.hint}</span>}
                  </span>
                  {on && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
