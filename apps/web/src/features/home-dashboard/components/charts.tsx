import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Info } from 'lucide-react';
import { ALL_PROJECT_STATUSES } from '@/features/projects/components/dashboard/project-dashboard.types';
import { STAGE_COLORS, normalizeStage } from '@/features/recruitment/components/dashboard/dashboard.utils';
import type { CountByKey } from '../types';
import { CATEGORICAL, EmptyLine, TASK_STAGE_LABEL, titleCase } from './dashboard-ui';

/**
 * Charts of the Main User Dashboard, built on the same pattern as the Project, Employee, Recruitment and Sales
 * dashboards: an icon-chip header with an info tooltip, one fixed colour per status (the colours those dashboards
 * already use), a dark floating tooltip on hover, and a footer with the total and an "All View" link.
 */

// ---------------------------------------------------------------------------
// Colours: the same per-status colours the module dashboards use
// ---------------------------------------------------------------------------

export const PROJECT_STATUS_COLOR: Record<string, string> = Object.fromEntries(ALL_PROJECT_STATUSES.map((s) => [s.key, s.color]));
export const TASK_STAGE_COLOR: Record<string, string> = {
  assigned: '#38bdf8',
  in_progress: '#2563eb',
  in_qa: '#eab308',
  hold: '#f97316',
  requested: '#a855f7',
  completed: '#22c55e',
};
export const LEAD_STAGE_COLOR: Record<string, string> = {
  New: '#3b82f6',
  Contacted: '#06b6d4',
  Qualified: '#a855f7',
  'On Hold': '#f59e0b',
  Converted: '#10b981',
  Lost: '#ef4444',
};
export const PRIORITY_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
export const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

export interface ChartDatum {
  key: string;
  label: string;
  value: number;
  color?: string;
  /** Listing to open when the segment or bar is clicked. */
  to?: string;
}

/** Every project status in the Project dashboard's order, zeros included, so the legend never changes shape. */
export function projectStatusData(rows: CountByKey[], to = '/projects'): ChartDatum[] {
  return ALL_PROJECT_STATUSES.map((s) => ({ key: s.key, label: s.label, value: rows.find((r) => r.key === s.key)?.count ?? 0, color: s.color, to }));
}

export function taskStageData(rows: CountByKey[], to: string): ChartDatum[] {
  return Object.keys(TASK_STAGE_LABEL).map((k) => ({ key: k, label: TASK_STAGE_LABEL[k], value: rows.find((r) => r.key === k)?.count ?? 0, color: TASK_STAGE_COLOR[k], to }));
}

export function leadStageData(rows: CountByKey[], to: string): ChartDatum[] {
  return Object.keys(LEAD_STAGE_COLOR).map((k) => ({ key: k, label: k, value: rows.find((r) => r.key === k)?.count ?? 0, color: LEAD_STAGE_COLOR[k], to }));
}

export function priorityData(rows: CountByKey[], to: string): ChartDatum[] {
  return PRIORITY_ORDER.map((k) => ({ key: k, label: titleCase(k), value: rows.find((r) => r.key === k)?.count ?? 0, color: PRIORITY_COLOR[k], to }));
}

/** Candidate stages come in lower case ("on hold", "did_not_join"): normalise and merge like the Recruitment dashboard. */
export function recruitmentStageData(rows: CountByKey[], to: string): ChartDatum[] {
  const merged = new Map<string, number>();
  for (const r of rows) {
    const name = normalizeStage(r.key);
    merged.set(name, (merged.get(name) ?? 0) + r.count);
  }
  return [...merged.entries()].map(([name, value]) => ({
    key: name,
    label: name,
    value,
    color: STAGE_COLORS[name as keyof typeof STAGE_COLORS]?.hex,
    to,
  }));
}

// ---------------------------------------------------------------------------
// Card frame
// ---------------------------------------------------------------------------

const ICON_TONE = {
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  purple: 'bg-purple-50 text-purple-600',
} as const;

/** The frame every chart on this page uses (same anatomy as the module dashboards' chart cards). */
export const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  tone?: keyof typeof ICON_TONE;
  /** What the chart counts and how: shown in the info tooltip. */
  info?: string;
  footer?: React.ReactNode;
  to?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, icon: Icon, tone = 'blue', info, footer, to, className = '', children }) => {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);
  return (
    <section
      aria-label={title}
      className={`relative flex h-full min-w-0 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 ${className}`}
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${ICON_TONE[tone]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold tracking-tight text-slate-900">{title}</h3>
              {subtitle && <p className="truncate text-[11px] text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {info && (
            <div className="relative shrink-0">
              <button
                type="button"
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
                onClick={() => setShowInfo((v) => !v)}
                aria-label={`About ${title}`}
                className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <Info className="h-4 w-4" />
              </button>
              {showInfo && (
                <div className="absolute right-0 top-8 z-30 w-60 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
                  <p className="mb-1 font-semibold text-slate-100">{title}</p>
                  <p className="text-[11px] leading-relaxed text-slate-300">{info}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {children}
      </div>
      {(footer || to) && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <span className="min-w-0 truncate text-[11px] text-slate-500">{footer}</span>
          {to && (
            <button
              type="button"
              onClick={() => navigate(to)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-800"
            >
              <span>All View</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// Donut
// ---------------------------------------------------------------------------

/**
 * Donut with a legend that lists every category (zero included, muted) with its count and share, so identity is never
 * colour-alone. Hover or focus a segment or legend row: the centre shows that category and a tooltip floats above.
 */
export const Donut: React.FC<{ data: ChartDatum[]; centerLabel: string; unit?: string }> = ({ data, centerLabel, unit = 'items' }) => {
  const navigate = useNavigate();
  const [hover, setHover] = useState<string | null>(null);
  const items = data.map((d, i) => ({ ...d, color: d.color ?? CATEGORICAL[i % CATEGORICAL.length] }));
  const total = items.reduce((s, d) => s + d.value, 0);
  // Sized so the donut and its legend fit side by side in a one-third-width card (about 310px of room)
  const size = 132;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const visible = items.filter((d) => d.value > 0);
  const gap = visible.length > 1 ? 2 : 0;
  const active = items.find((d) => d.key === hover);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  let acc = 0;

  if (total === 0) return <EmptyLine />;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
        {active && (
          <div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-700/60 bg-slate-900/95 px-2.5 py-1 text-[10px] text-white shadow-xl">
            <span className="font-bold">{active.label}:</span> <span className="font-bold text-blue-300">{active.value} {unit}</span>{' '}
            <span className="text-slate-400">({pct(active.value)}%)</span>
          </div>
        )}
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${centerLabel}: ${total}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          {visible.map((d) => {
            const len = (d.value / total) * c;
            const seg = (
              <circle
                key={d.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={hover === d.key ? stroke + 4 : stroke}
                strokeDasharray={`${Math.max(len - gap, 0.5)} ${c}`}
                strokeDashoffset={-acc}
                className={`transition-all duration-300 ${d.to ? 'cursor-pointer' : ''}`}
                onMouseEnter={() => setHover(d.key)}
                onMouseLeave={() => setHover(null)}
                onClick={() => d.to && navigate(d.to)}
              />
            );
            acc += len;
            return seg;
          })}
        </svg>
        <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black tracking-tight tabular-nums text-slate-900">{active ? active.value : total}</span>
          <span className="max-w-[76px] truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{active ? active.label : centerLabel}</span>
        </div>
      </div>

      <ul className="grid w-full min-w-0 grid-cols-1 gap-y-1 border-t border-slate-100 pt-3 text-xs">
        {items.map((d) => {
          const body = (
            <>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-600">{d.label}</span>
              <span className="font-bold tabular-nums text-slate-900">{d.value}</span>
              <span className="w-9 text-right text-[10px] tabular-nums text-slate-400">({pct(d.value)}%)</span>
            </>
          );
          const cls = `flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition-opacity ${d.value === 0 ? 'opacity-50' : ''} ${hover && hover !== d.key ? 'opacity-30' : ''}`;
          return (
            <li key={d.key} onMouseEnter={() => setHover(d.key)} onMouseLeave={() => setHover(null)}>
              {d.to && d.value > 0 ? (
                <Link to={d.to} className={`${cls} hover:bg-slate-50`}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Horizontal bars
// ---------------------------------------------------------------------------

/**
 * Horizontal bars like the Department distribution chart: right-aligned name, a 20px track, the blue gradient bar
 * (or the category's own colour), the count at the end and a floating tooltip with the share.
 */
export const BarChartList: React.FC<{ data: ChartDatum[]; unit?: string; max?: number }> = ({ data, unit = 'items', max = 8 }) => {
  const navigate = useNavigate();
  const [hover, setHover] = useState<number | null>(null);
  const items = data.slice(0, max);
  const peak = Math.max(1, ...items.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  if (items.length === 0 || total === 0) return <EmptyLine />;

  return (
    <div className="space-y-1.5 py-1">
      {items.map((d, i) => (
        <div
          key={d.key}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onClick={() => d.to && navigate(d.to)}
          className={`group relative flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-slate-50/80 ${d.to ? 'cursor-pointer' : ''}`}
        >
          {hover === i && (
            <div className="pointer-events-none absolute -top-7 right-2 z-30 flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] text-white shadow-lg">
              <span className="font-semibold">{d.label}:</span>
              <span className="font-bold text-blue-300">{d.value} {unit}</span>
              <span className="text-slate-300">({total ? Math.round((d.value / total) * 100) : 0}%)</span>
            </div>
          )}
          <div className="w-28 shrink-0 truncate text-right text-[11.5px] font-semibold text-slate-700 transition-colors group-hover:text-blue-600 sm:w-36" title={d.label}>
            {d.label}
          </div>
          <div className="relative flex h-5 flex-1 items-center overflow-hidden rounded-md bg-slate-100">
            {d.value > 0 && (
              <div
                style={{ width: `${Math.max(4, (d.value / peak) * 100)}%`, ...(d.color ? { backgroundColor: d.color } : {}) }}
                className={`h-full rounded-md transition-all duration-300 ${d.color ? '' : 'bg-gradient-to-r from-blue-500 to-indigo-600 group-hover:from-blue-600 group-hover:to-indigo-700'}`}
              />
            )}
          </div>
          <div className="w-7 shrink-0 text-left text-xs font-bold text-slate-800">{d.value}</div>
        </div>
      ))}
    </div>
  );
};
