import React from 'react';
import { AlertTriangle, DatabaseZap, FilterX, RefreshCw } from 'lucide-react';

/**
 * The pieces every dashboard page shares, so Project, Employee and Recruitment look and behave alike:
 * a title row with Refresh, a loading skeleton, an error banner, an empty state, number cards and a card for a
 * chart that has no data behind it yet. Blue and indigo follow the colour theme the person chose.
 */

/** One column on a phone, two on a tablet and laptop, three only on a wide screen. */
export const DASH_GRID = 'grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 min-[1600px]:grid-cols-3';
/** The frame of a chart card: use it on the root of a widget. */
export const DASH_CARD = 'rounded-2xl border border-slate-200/80 bg-white shadow-2xs';

export const DashboardHeader: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
  actions?: React.ReactNode;
}> = ({ title, subtitle, onRefresh, loading, actions }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
    </div>
    <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
      {actions}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      )}
    </div>
  </div>
);

export const DashboardSkeleton: React.FC<{ kpis?: number; cards?: number }> = ({ kpis = 4, cards = 6 }) => (
  <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
    {kpis > 0 && (
      <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
        {Array.from({ length: kpis }).map((_, n) => (
          <div key={n} className="h-[104px] rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="h-3 w-1/2 rounded bg-slate-200" />
            <div className="mt-4 h-7 w-1/3 rounded bg-slate-200" />
            <div className="mt-3 h-1.5 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>
    )}
    <div className="h-[120px] rounded-2xl border border-slate-200/80 bg-white" />
    <div className={DASH_GRID}>
      {Array.from({ length: cards }).map((_, n) => (
        <div key={n} className="h-[380px] rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="mt-8 h-52 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  </div>
);

export const DashboardError: React.FC<{ title?: string; message: string; onRetry: () => void }> = ({
  title = 'The data could not be loaded',
  message,
  onRetry,
}) => (
  <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-rose-600 shadow-2xs">
        <AlertTriangle className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-bold text-rose-900">{title}</p>
        <p className="text-xs text-rose-700">{message}</p>
      </div>
    </div>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700"
    >
      <RefreshCw className="h-3.5 w-3.5" /> Try again
    </button>
  </div>
);

export const DashboardEmpty: React.FC<{ title: string; hint?: string; onClear?: () => void; icon?: React.ElementType }> = ({
  title,
  hint,
  onClear,
  icon: Icon = FilterX,
}) => (
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-2xs">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      <Icon className="h-7 w-7" />
    </div>
    <div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      {hint && <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{hint}</p>}
    </div>
    {onClear && (
      <button
        type="button"
        onClick={onClear}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
      >
        Clear all filters
      </button>
    )}
  </div>
);

/** In the place of a chart that cannot be drawn truthfully because the database holds nothing for it. */
export const UnavailableCard: React.FC<{ title: string; reason: string }> = ({ title, reason }) => (
  <div className={`${DASH_CARD} flex h-full min-h-[380px] flex-col p-4 sm:p-5`}>
    <h3 className="border-b border-slate-100 pb-3 text-sm font-bold text-slate-800">{title}</h3>
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <DatabaseZap className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-slate-700">No data to show yet</p>
      <p className="max-w-xs text-xs leading-5 text-slate-500">{reason}</p>
    </div>
  </div>
);

const TONES = {
  emerald: { accent: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600' },
  rose: { accent: 'bg-rose-500', chip: 'bg-rose-50 text-rose-600', text: 'text-rose-600' },
  amber: { accent: 'bg-amber-500', chip: 'bg-amber-50 text-amber-600', text: 'text-amber-600' },
  blue: { accent: 'bg-blue-500', chip: 'bg-blue-50 text-blue-600', text: 'text-blue-600' },
  purple: { accent: 'bg-purple-500', chip: 'bg-purple-50 text-purple-600', text: 'text-purple-600' },
  slate: { accent: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600', text: 'text-slate-600' },
} as const;
export type KpiTone = keyof typeof TONES;

/** A number card: label, big value, an optional share bar and a hint. */
export const KpiStat: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ElementType;
  tone?: KpiTone;
  /** 0 to 100: draws the share bar. */
  percent?: number;
  suffix?: React.ReactNode;
  className?: string;
}> = ({ label, value, hint, icon: Icon, tone = 'blue', percent, suffix, className = '' }) => {
  const t = TONES[tone];
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md ${className}`}>
      <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${t.accent}`} />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${t.chip}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-[28px]">{value}</span>
        {suffix && <span className={`text-xs font-bold ${t.text}`}>{suffix}</span>}
      </div>
      {percent !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} share`}>
          <div className={`h-full rounded-full ${t.accent} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
        </div>
      )}
      {hint && <p className="mt-2 truncate text-[11px] text-slate-400" title={hint}>{hint}</p>}
    </div>
  );
};
