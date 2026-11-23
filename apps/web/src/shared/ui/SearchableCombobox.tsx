import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { SearchableSelectOption } from './SearchableSelect';

export interface SearchableComboboxProps {
  options: SearchableSelectOption[];
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
  noResultsText?: string;
}

/**
 * One field that is both the input and the dropdown: click it to open the list, type in the same field to
 * narrow the list, pick with the mouse or the arrow keys and Enter. Options keep the order they are given in.
 */
export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  id,
  ariaLabel,
  noResultsText = 'No results found',
}) => {
  const [open, setOpen] = useState(false);
  // What the user has typed; null means nothing typed yet, so the whole list is shown
  const [typed, setTyped] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [openUpward, setOpenUpward] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(() => options.find((o) => String(o.value) === String(value)), [options, value]);
  const selectedText = selected ? (selected.sublabel ? `${selected.label} (${selected.sublabel})` : selected.label) : '';

  const filtered = useMemo(() => {
    const q = (typed ?? '').trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.sublabel ?? '').toLowerCase().includes(q));
  }, [options, typed]);

  const close = () => {
    setOpen(false);
    setTyped(null);
  };

  // Close on a click anywhere else
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Start on the chosen option when the list opens, and flip upward near the bottom of the screen
  useEffect(() => {
    if (!open) return;
    const i = filtered.findIndex((o) => String(o.value) === String(value));
    setActiveIndex(i >= 0 ? i : 0);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOpenUpward(window.innerHeight - rect.bottom < 260 && rect.top > 260);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Typing changes the list, so go back to its first match
  useEffect(() => {
    if (open && typed !== null) setActiveIndex(0);
  }, [typed, open]);

  // Keep the highlighted row in view while moving with the arrow keys
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const choose = (opt: SearchableSelectOption | undefined) => {
    if (!opt || opt.disabled) return;
    onChange(String(opt.value));
    close();
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open) choose(filtered[activeIndex]);
      else setOpen(true);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        close();
      }
    } else if (e.key === 'Tab') {
      close();
    }
  };

  const listId = id ? `${id}-list` : undefined;

  return (
    <div ref={containerRef} className={`relative w-full ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled}
        // Closed: the chosen name. Open: an empty field to type in, with the chosen name shown in grey behind it
        value={open ? (typed ?? '') : selectedText}
        placeholder={open && selectedText ? selectedText : placeholder}
        onChange={(e) => {
          setTyped(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={`h-[38px] w-full rounded-xl border bg-slate-50/50 pl-3 pr-8 text-xs font-medium text-slate-800 shadow-2xs transition placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
          open ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/20' : 'border-slate-200'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-text'} ${className}`}
      />
      <ChevronDown
        aria-hidden
        className={`pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`}
      />

      {open && !disabled && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className={`absolute left-0 right-0 z-50 max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {filtered.length === 0 ? (
            <li className="py-4 text-center text-xs font-medium text-slate-400">{noResultsText}</li>
          ) : (
            filtered.map((opt, i) => {
              const isSelected = String(opt.value) === String(value);
              const isActive = i === activeIndex;
              return (
                <li
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  // mousedown (not click) so the field keeps focus and the list does not close first
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(opt);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    isSelected ? 'bg-indigo-50 font-semibold text-indigo-700' : isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                  } ${opt.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className="min-w-0 truncate">
                    {opt.label}
                    {opt.sublabel && <span className="ml-1.5 font-normal text-slate-400">({opt.sublabel})</span>}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
