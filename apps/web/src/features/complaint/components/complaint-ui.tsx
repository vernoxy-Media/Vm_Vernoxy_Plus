import React from 'react';
import type { LucideIcon } from 'lucide-react';

export const initials = (name?: string | null) =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

export interface Tone {
  chip: string;
  dot: string;
}

export const PRIORITY_TONE: Record<string, Tone> = {
  Urgent: { chip: 'bg-rose-50 text-rose-700 ring-rose-100', dot: 'bg-rose-500' },
  High: { chip: 'bg-amber-50 text-amber-700 ring-amber-100', dot: 'bg-amber-500' },
  Medium: { chip: 'bg-indigo-50 text-indigo-700 ring-indigo-100', dot: 'bg-indigo-500' },
  Low: { chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
};

export const STATUS_TONE: Record<string, Tone> = {
  New: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', dot: 'bg-emerald-500' },
  Open: { chip: 'bg-indigo-50 text-indigo-700 ring-indigo-100', dot: 'bg-indigo-500' },
  'In Progress': { chip: 'bg-blue-50 text-blue-700 ring-blue-100', dot: 'bg-blue-500' },
  Resolved: { chip: 'bg-amber-50 text-amber-700 ring-amber-100', dot: 'bg-amber-500' },
  Closed: { chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
};

export const Badge: React.FC<{ label: string; tone?: Tone }> = ({ label, tone }) => {
  const t = tone ?? STATUS_TONE.Closed;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${t.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {label}
    </span>
  );
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
  icon: LucideIcon;
  /** Text colour of the number. */
  tone: string;
  /** Classes for the icon tile. */
  tile: string;
  /** Gradient classes for the top strip. */
  bar: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, unit, hint, icon: Icon, tone, tile, bar, onClick }) => {
  const cls = 'relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition';
  const body = (
    <>
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bar}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
          <p className={`mt-2 text-3xl font-extrabold leading-none tracking-tight ${tone}`}>
            {value}
            {unit && <span className="ml-1.5 text-sm font-medium text-slate-400">{unit}</span>}
          </p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tile}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:-translate-y-0.5 hover:shadow-md`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
};

/** Labelled wrapper for a filter control. */
export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</label>
    {children}
  </div>
);

export const inputCls =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 transition hover:border-slate-300 focus:border-blue-500 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10';
