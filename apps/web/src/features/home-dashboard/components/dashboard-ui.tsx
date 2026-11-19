import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DASH_CARD, KpiTone } from '@/shared/ui/dashboard/DashboardShell';

/**
 * Small building blocks of the Main User Dashboard. KPI cards reuse the shared KpiStat so this page looks like the
 * other dashboards; charts are plain SVG like the Project and Employee dashboards (no chart library).
 */

/** Categorical hues in fixed order (validated: CVD and normal-vision separation pass; low-contrast hues always
 *  come with a legend that names the segment and its count). */
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
/** One hue for magnitude bars. */
export const BAR_BLUE = '#2a78d6';

// ---------------------------------------------------------------------------
// Labels and formatting
// ---------------------------------------------------------------------------

export const TASK_STAGE_LABEL: Record<string, string> = {
  assigned: 'To Do',
  in_progress: 'In Progress',
  hold: 'On Hold',
  requested: 'In Review',
  completed: 'Done',
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  new: 'New',
  planning: 'Planning',
  in_progress: 'In Progress',
  pending: 'Pending',
  review: 'Review',
  delivered: 'Delivered',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

export const titleCase = (s: string | null | undefined) =>
  (s ?? '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-19" or an ISO instant → "19 Nov" (plus the year when it is not this year). */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

export function fmtTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** "Today" / "Tomorrow" / "19 Nov" for a date-only value. */
export function fmtDay(value: string): string {
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day - t) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return fmtDate(value);
}

export function relTime(value: string): string {
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return '';
  const min = Math.round(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return fmtDate(value);
}

export const fmtMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} Hrs`;
export const fmtMoney = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

// ---------------------------------------------------------------------------
// Pills
// ---------------------------------------------------------------------------

const PILL = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-50 text-blue-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  amber: 'bg-amber-50 text-amber-800',
  rose: 'bg-rose-50 text-rose-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  purple: 'bg-purple-50 text-purple-700',
} as const;
export type PillTone = keyof typeof PILL;

export const Pill: React.FC<{ tone?: PillTone; children: React.ReactNode; className?: string }> = ({ tone = 'slate', children, className = '' }) => (
  <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold ${PILL[tone]} ${className}`}>
    {children}
  </span>
);

export const priorityTone = (p: string | null | undefined): PillTone => {
  const v = (p ?? '').toLowerCase();
  if (v === 'critical' || v === 'high' || v === 'urgent') return 'rose';
  if (v === 'medium') return 'amber';
  if (v === 'low') return 'emerald';
  return 'slate';
};

export const stageTone = (stage: string): PillTone =>
  ({ assigned: 'slate', in_progress: 'blue', hold: 'amber', requested: 'purple', completed: 'emerald' } as Record<string, PillTone>)[stage] ?? 'slate';

// ---------------------------------------------------------------------------
// Panel, KPI and empty state
// ---------------------------------------------------------------------------

export const Panel: React.FC<{
  title: string;
  icon?: React.ElementType;
  subtitle?: string;
  to?: string;
  linkLabel?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, subtitle, to, linkLabel = 'View all', className = '', bodyClassName = '', children }) => (
  <section className={`${DASH_CARD} flex min-w-0 flex-col p-4 sm:p-5 ${className}`} aria-label={title}>
    <header className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold leading-5 text-slate-900">{title}</h3>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {to && (
        <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800">
          {linkLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </header>
    <div className={`min-w-0 flex-1 ${bodyClassName}`}>{children}</div>
  </section>
);

const KPI_TONE: Record<KpiTone, { accent: string; chip: string }> = {
  emerald: { accent: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-600' },
  rose: { accent: 'bg-rose-500', chip: 'bg-rose-50 text-rose-600' },
  amber: { accent: 'bg-amber-500', chip: 'bg-amber-50 text-amber-600' },
  blue: { accent: 'bg-blue-500', chip: 'bg-blue-50 text-blue-600' },
  purple: { accent: 'bg-purple-500', chip: 'bg-purple-50 text-purple-600' },
  slate: { accent: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600' },
};

/**
 * A KPI card that opens the matching listing (VM-004 rule 5). Same look as the shared KpiStat, but the label may
 * wrap to two lines so long names ("Pending Expense Claims") stay readable on a phone.
 */
export const KpiLink: React.FC<{
  to: string;
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: KpiTone;
  hint?: string;
}> = ({ to, label, value, icon: Icon, tone = 'blue', hint }) => {
  const t = KPI_TONE[tone];
  return (
    <Link
      to={to}
      aria-label={`${label}: ${typeof value === 'number' || typeof value === 'string' ? value : ''}. Open listing`}
      className="group relative block h-full overflow-hidden min-w-0 min-[1600px]:p-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:p-4"
    >
      <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${t.accent}`} />
      <div className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 min-h-[28px] text-[11px] font-bold uppercase leading-[14px] tracking-wider text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl min-[1600px]:max-[1899px]:hidden ${t.chip}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-1.5 text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-[28px]">{value}</div>
      {/* The hint line is always reserved (two lines), so every card in a row has the same height */}
      <p className="mt-1.5 line-clamp-2 min-h-8 text-[11px] leading-4 text-slate-400" title={hint}>{hint ?? ' '}</p>
    </Link>
  );
};

/**
 * KPI rows with every card the same size: two per row on a phone; from tablet up equal columns of at least 180px,
 * so the number per row follows the window; from 1600px the whole row sits on one line in equal columns.
 * The count argument is unused and kept so callers need no change.
 */
export const kpiGrid = (_count?: number) =>
  'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] sm:gap-3.5 min-[1600px]:grid-flow-col min-[1600px]:auto-cols-fr min-[1600px]:grid-cols-none min-[1600px]:gap-3';

/** The heading above each group of cards: dark ink with a small accent bar, so the sections are easy to find. */
export const SectionHeading: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
    <h2 className="flex items-center gap-2.5 text-[13px] font-extrabold uppercase tracking-wider text-slate-800 sm:text-sm">
      <span aria-hidden className="h-4 w-1 rounded-full bg-blue-600" />
      {title}
    </h2>
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

export const EmptyLine: React.FC<{ text?: string }> = ({ text = 'No records available' }) => (
  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-3 py-6 text-center text-xs font-medium text-slate-500">{text}</p>
);

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
    <span className="w-8 text-right text-[11px] font-bold tabular-nums text-slate-700">{value}%</span>
  </div>
);

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

/** A compact table that scrolls inside its card on small screens; a row opens its detail screen. */
export function DataTable<T>({ columns, rows, rowKey, rowTo }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string | number; rowTo?: (r: T) => string | null }) {
  const navigate = useNavigate();
  if (rows.length === 0) return <EmptyLine />;
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {columns.map((c) => (
              <th key={c.header} scope="col" className={`py-2 pr-3 font-bold ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const to = rowTo?.(r) ?? null;
            return (
              <tr
                key={rowKey(r)}
                onClick={to ? () => navigate(to) : undefined}
                onKeyDown={to ? (e) => e.key === 'Enter' && navigate(to) : undefined}
                tabIndex={to ? 0 : undefined}
                className={`border-b border-slate-50 last:border-0 ${to ? 'cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none' : ''}`}
              >
                {columns.map((c) => (
                  <td key={c.header} className={`whitespace-nowrap py-2.5 pr-3 align-middle text-slate-700 ${c.className ?? ''}`}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
