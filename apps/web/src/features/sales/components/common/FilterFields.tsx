import React from 'react';
import { ChevronDown } from 'lucide-react';

/** A titled block of a filter panel. */
export const FilterSection: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section>
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
    </div>
    {children}
  </section>
);

export interface ChipOption {
  id: string;
  label: string;
  /** A small coloured dot before the label, e.g. "bg-rose-500". */
  dot?: string;
}

/** Pick one of a few options; tap the chosen one again to clear it. */
export const ChipGroup: React.FC<{ options: ChipOption[]; value: string; onChange: (id: string) => void; ariaLabel: string }> = ({ options, value, onChange, ariaLabel }) => (
  <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = o.id === value;
      return (
        <button
          key={o.id || 'any'}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(on && o.id !== '' ? '' : o.id)}
          className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-all ${
            on ? 'border-primary bg-primary/10 text-primary shadow-2xs ring-2 ring-primary/15' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {o.dot && <span className={`h-2 w-2 rounded-full ${o.dot}`} />}
          {o.label}
        </button>
      );
    })}
  </div>
);

/** A select with the same look as the rest of the panel. */
export const SelectField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
}> = ({ value, onChange, placeholder, options, ariaLabel }) => (
  <div className="relative">
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 text-sm transition hover:border-slate-300 focus:border-primary/50 focus:outline-hidden focus:ring-4 focus:ring-primary/10 ${
        value ? 'font-medium text-slate-900' : 'text-slate-500'
      }`}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
  </div>
);

export const TextField: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...rest }) => (
  <input
    {...rest}
    className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-300 focus:border-primary/50 focus:outline-hidden focus:ring-4 focus:ring-primary/10 ${className}`}
  />
);

/** Primary / secondary buttons for a panel footer. */
export const PanelFooter: React.FC<{ onReset: () => void; onApply: () => void; applyLabel?: string; activeCount?: number }> = ({ onReset, onApply, applyLabel = 'Show results', activeCount }) => (
  <div className="flex items-center gap-3">
    <button type="button" onClick={onReset} className="h-11 shrink-0 rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
      Reset
    </button>
    <button
      type="button"
      onClick={onApply}
      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
    >
      {applyLabel}
      {activeCount ? <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs">{activeCount}</span> : null}
    </button>
  </div>
);
