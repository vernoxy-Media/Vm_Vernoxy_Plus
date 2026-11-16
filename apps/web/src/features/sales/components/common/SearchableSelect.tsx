import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  /** Smaller grey text after the label, e.g. a parent name. */
  hint?: string;
}

interface PopoverPlace {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

/** Keeps a panel under (or, when short of room, above) its trigger, on top of drawers and dialogs. */
function usePopover(open: boolean, close: () => void) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<PopoverPlace | null>(null);

  const measure = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 240 && above > below;
    setPlace(
      up
        ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 6, maxHeight: Math.min(340, above) }
        : { left: r.left, width: r.width, top: r.bottom + 6, maxHeight: Math.min(340, Math.max(160, below)) },
    );
  }, []);

  useLayoutEffect(() => {
    if (open) measure();
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (trigger.current?.contains(t) || panel.current?.contains(t)) return;
      close();
    };
    const onScroll = (e: Event) => {
      // Scrolling the list itself must not close it
      if (panel.current && e.target instanceof Node && panel.current.contains(e.target)) return;
      measure();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, close, measure]);

  return { trigger, panel, place };
}

const TRIGGER =
  'flex h-11 w-full cursor-pointer items-center gap-2 rounded-xl border bg-white px-3.5 text-left text-sm transition hover:border-slate-300 focus:outline-hidden focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10';

const matches = (o: SelectOption, q: string) => !q || o.label.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q);

/** The list part shared by the single and multiple select: a search box, then the options. */
const Panel: React.FC<{
  place: PopoverPlace;
  panelRef: React.RefObject<HTMLDivElement>;
  query: string;
  onQuery: (q: string) => void;
  searchLabel: string;
  count: number;
  total: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
  onKeyDown: (e: React.KeyboardEvent) => void;
}> = ({ place, panelRef, query, onQuery, searchLabel, count, total, footer, children, onKeyDown }) =>
  createPortal(
    <div
      ref={panelRef}
      style={{ position: 'fixed', left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight, zIndex: 130 }}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
      onKeyDown={onKeyDown}
    >
      <div className="relative border-b border-slate-100 p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label={searchLabel}
          placeholder="Search…"
          className="h-9 w-full rounded-lg bg-slate-50 pl-8 pr-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1">
        {count === 0 ? <p className="px-3 py-6 text-center text-[13px] text-slate-400">{total === 0 ? 'Nothing to choose from yet' : 'No match'}</p> : children}
      </div>
      {footer}
    </div>,
    document.body,
  );

/** A select with a search box: type to narrow a long list (cities, industries…), arrow keys and Enter to pick. */
export const SearchableSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: SelectOption[];
  ariaLabel: string;
  /** Hide the "clear" row (for a field that must always have a value). */
  required?: boolean;
  disabled?: boolean;
  /** A shorter field for toolbars. */
  compact?: boolean;
}> = ({ value, onChange, placeholder, options, ariaLabel, required = false, disabled = false, compact = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);
  const { trigger, panel, place } = usePopover(open, close);

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => options.filter((o) => matches(o, q)), [options, q]);
  const chosen = options.find((o) => o.value === value);

  useEffect(() => setActive(0), [q, open]);

  const pick = (v: string) => {
    onChange(v);
    close();
    trigger.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      trigger.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rows[active]) pick(rows[active].value);
    }
  };

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${compact ? TRIGGER.replace('h-11', 'h-9').replace('text-sm', 'text-xs') : TRIGGER} ${open ? 'border-primary/50 ring-4 ring-primary/10' : 'border-slate-200'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span className={`min-w-0 flex-1 truncate ${chosen ? 'font-medium text-slate-900' : 'text-slate-500'}`}>{chosen ? chosen.label : placeholder}</span>
        {chosen && !required && !disabled ? (
          <span
            role="button"
            aria-label={`Clear ${ariaLabel}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && place && (
        <Panel place={place} panelRef={panel} query={query} onQuery={setQuery} searchLabel={`Search ${ariaLabel}`} count={rows.length} total={options.length} onKeyDown={onKeyDown}>
          {!required && !q && (
            <button type="button" role="option" aria-selected={!value} onClick={() => pick('')} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50">
              <span className="flex-1">{placeholder}</span>
              {!value && <Check className="h-4 w-4 text-primary" />}
            </button>
          )}
          {rows.map((o, i) => {
            const on = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o.value)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${i === active ? 'bg-slate-100' : ''} ${on ? 'font-semibold text-primary' : 'text-slate-800'}`}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.hint && <span className="shrink-0 text-xs text-slate-400">{o.hint}</span>}
                {on && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </Panel>
      )}
    </div>
  );
};

/** Choose several: the picked ones show as chips on the field, the list stays open while you tick. */
export const SearchableMultiSelect: React.FC<{
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  options: SelectOption[];
  ariaLabel: string;
}> = ({ value, onChange, placeholder, options, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);
  const { trigger, panel, place } = usePopover(open, close);

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => options.filter((o) => matches(o, q)), [options, q]);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  useEffect(() => setActive(0), [q, open]);

  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      trigger.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rows[active]) toggle(rows[active].value);
    }
  };

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${TRIGGER} !h-auto min-h-[2.75rem] flex-wrap py-1.5 ${open ? 'border-primary/50 ring-4 ring-primary/10' : 'border-slate-200'}`}
      >
        {value.length === 0 ? (
          <span className="flex-1 py-1 text-slate-500">{placeholder}</span>
        ) : (
          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {value.map((v) => (
              <span key={v} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-primary/10 py-0.5 pl-2 pr-1 text-[13px] font-medium text-primary">
                <span className="truncate">{labelOf(v)}</span>
                <span
                  role="button"
                  aria-label={`Remove ${labelOf(v)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(v);
                  }}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && place && (
        <Panel
          place={place}
          panelRef={panel}
          query={query}
          onQuery={setQuery}
          searchLabel={`Search ${ariaLabel}`}
          count={rows.length}
          total={options.length}
          onKeyDown={onKeyDown}
          footer={
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs">
              <span className="text-slate-400">{value.length} selected</span>
              <div className="flex items-center gap-3">
                {value.length > 0 && (
                  <button type="button" onClick={() => onChange([])} className="cursor-pointer font-semibold text-slate-500 hover:text-slate-800">
                    Clear all
                  </button>
                )}
                <button type="button" onClick={close} className="cursor-pointer font-semibold text-primary hover:underline">
                  Done
                </button>
              </div>
            </div>
          }
        >
          {rows.map((o, i) => {
            const on = value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                onMouseEnter={() => setActive(i)}
                onClick={() => toggle(o.value)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${i === active ? 'bg-slate-100' : ''}`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white'}`}>
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className={`min-w-0 flex-1 truncate ${on ? 'font-semibold text-slate-900' : 'text-slate-800'}`}>{o.label}</span>
                {o.hint && <span className="shrink-0 text-xs text-slate-400">{o.hint}</span>}
              </button>
            );
          })}
        </Panel>
      )}
    </div>
  );
};
