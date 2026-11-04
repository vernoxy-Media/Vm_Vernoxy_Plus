import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Timer,
  Building2,
  AlertTriangle,
  Layers,
  Loader2,
  PauseCircle,
  Inbox,
} from 'lucide-react';
import { StatCard, Field, inputCls } from '@/features/complaint/components/complaint-ui';
import { useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useSalesRights } from '../hooks/useSalesRights';
import { useSalesReport, type SalesReportFilters } from '../hooks/useSalesReport';
import type { SalesReportCountRow, SalesReportResponse } from '../types/sales.types';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type PresetId = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all' | 'custom';

const PRESETS: Array<{ id: Exclude<PresetId, 'custom'>; label: string }> = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'last_3_months', label: 'Last 3 months' },
  { id: 'this_year', label: 'This year' },
  { id: 'all', label: 'All time' },
];

function presetRange(id: Exclude<PresetId, 'custom'>): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (id) {
    case 'this_month':
      return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
    case 'last_month':
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case 'last_3_months':
      return { from: ymd(new Date(y, m - 2, 1)), to: ymd(new Date(y, m + 1, 0)) };
    case 'this_year':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    default:
      return { from: '', to: '' };
  }
}

const STAGE_TONE: Record<string, { bar: string; dot: string }> = {
  New: { bar: 'bg-blue-500', dot: 'bg-blue-500' },
  Contacted: { bar: 'bg-sky-500', dot: 'bg-sky-500' },
  Qualified: { bar: 'bg-violet-500', dot: 'bg-violet-500' },
  'On Hold': { bar: 'bg-amber-500', dot: 'bg-amber-500' },
  Converted: { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  Lost: { bar: 'bg-rose-500', dot: 'bg-rose-500' },
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const Panel: React.FC<{ title: string; hint?: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, hint, icon, children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
    </div>
    {children}
  </section>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center gap-2 py-10 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
      <Inbox className="h-5 w-5" />
    </span>
    <p className="text-sm text-slate-500">{text}</p>
  </div>
);

const RateBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="flex items-center gap-2.5">
    <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 sm:w-28">
      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
    <span className="w-11 text-xs font-bold text-slate-700">{value}%</span>
  </div>
);

/** A table of groups (source, person or service) with how many became clients. */
const GroupTable: React.FC<{ rows: SalesReportCountRow[]; firstHeader: string; leading?: (r: SalesReportCountRow) => React.ReactNode; empty: string }> = ({ rows, firstHeader, leading, empty }) => {
  if (rows.length === 0) return <Empty text={empty} />;
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            <th className="py-2 pr-3">{firstHeader}</th>
            <th className="px-3 py-2 text-right">Leads</th>
            <th className="px-3 py-2 text-right">Won</th>
            <th className="px-3 py-2 text-right">Lost</th>
            <th className="py-2 pl-3">Conversion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.name} className="transition-colors hover:bg-blue-50/30">
              <td className="py-2.5 pr-3 font-medium text-slate-800">
                <span className="flex items-center gap-2.5">
                  {leading?.(r)}
                  <span className="truncate">{r.name}</span>
                </span>
              </td>
              <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{r.total}</td>
              <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">{r.converted}</td>
              <td className="px-3 py-2.5 text-right font-semibold text-rose-600">{r.lost}</td>
              <td className="py-2.5 pl-3">
                <RateBar value={r.conversion_rate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function downloadCsv(report: SalesReportResponse) {
  const q = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines: string[] = [];
  const add = (...cells: Array<string | number | null>) => lines.push(cells.map(q).join(','));
  add('Sales report', `${report.period.from ?? 'start'} to ${report.period.to ?? 'today'}`);
  lines.push('');
  add('Totals');
  Object.entries(report.totals).forEach(([k, v]) => add(k.replace(/_/g, ' '), v));
  lines.push('');
  add('Stage', 'Leads');
  report.by_stage.forEach((s) => add(s.stage, s.count));
  const groups: Array<[string, SalesReportCountRow[]]> = [
    ['Lead source', report.by_source],
    ['Lead by', report.by_user],
    ['Service fit', report.by_service_fit],
  ];
  groups.forEach(([title, rows]) => {
    lines.push('');
    add(title, 'Leads', 'Won', 'Lost', 'Conversion %');
    rows.forEach((r) => add(r.name, r.total, r.converted, r.lost, r.conversion_rate));
  });
  lines.push('');
  add('Lost reason', 'Leads', 'Share %');
  report.lost_reasons.forEach((r) => add(r.reason, r.count, r.percent));
  lines.push('');
  add('Month', 'Leads added', 'Won');
  report.trend.forEach((t) => add(t.label, t.created, t.converted));

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-report-${report.period.from ?? 'all'}-${report.period.to ?? 'today'}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const SalesReportsPage: React.FC = () => {
  const { isAdmin } = useSalesRights();
  const [preset, setPreset] = useState<PresetId>('this_year');
  const [range, setRange] = useState(() => presetRange('this_year'));
  const [leadBy, setLeadBy] = useState('all');

  const filters: SalesReportFilters = { from: range.from, to: range.to, leadBy };
  const { data: report, isLoading, isError, isFetching, refetch } = useSalesReport(filters, isAdmin);
  const { data: employees = [] } = useEmployeeOptionsQuery();

  const choosePreset = (id: Exclude<PresetId, 'custom'>) => {
    setPreset(id);
    setRange(presetRange(id));
  };
  const setDate = (key: 'from' | 'to', value: string) => {
    setPreset('custom');
    setRange((r) => ({ ...r, [key]: value }));
  };

  const t = report?.totals;
  const stageMax = Math.max(1, ...(report?.by_stage.map((s) => s.count) ?? [1]));
  const trendMax = Math.max(1, ...(report?.trend.flatMap((m) => [m.created, m.converted]) ?? [1]));
  const periodText = report ? `${report.period.from ?? 'the beginning'} to ${report.period.to ?? 'today'}` : '';

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
            <BarChart3 className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">Sales Reports</h1>
            <p className="mt-0.5 text-sm text-slate-500">{isAdmin ? 'Pipeline, conversion and team performance for every lead.' : 'Pipeline and conversion for your leads.'}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={!report}
          onClick={() => report && downloadCsv(report)}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div role="tablist" aria-label="Period" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={preset === p.id}
                onClick={() => choosePreset(p.id)}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${preset === p.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`mt-4 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          <Field label="From">
            <input type="date" value={range.from} max={range.to || undefined} onChange={(e) => setDate('from', e.target.value)} className={inputCls} />
          </Field>
          <Field label="To">
            <input type="date" value={range.to} min={range.from || undefined} onChange={(e) => setDate('to', e.target.value)} className={inputCls} />
          </Field>
          {isAdmin && (
            <Field label="Lead by">
              <select value={leadBy} onChange={(e) => setLeadBy(e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="all">Everyone</option>
                <option value="me">Only me</option>
                {employees.map((emp: { emp_id: number; name: string }) => (
                  <option key={emp.emp_id} value={emp.emp_id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          The figures count the leads <b className="font-semibold text-slate-500">added</b> in this period{report ? ` (${periodText})` : ''}. The trend always shows six months.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-24">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">Building the report...</p>
        </div>
      ) : isError || !report || !t ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <p className="text-base font-semibold text-slate-800">Could not load the report</p>
          <button type="button" onClick={() => refetch()} className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            Try again
          </button>
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
          {/* Totals */}
          <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            <StatCard label="Leads" value={t.leads} hint={`${t.companies_in_period} companies added in this period`} icon={Layers} tone="text-slate-900" tile="bg-blue-50 text-blue-600 ring-blue-100" bar="from-blue-500 to-indigo-500" />
            <StatCard label="Open leads" value={t.open} hint={`${t.on_hold} on hold`} icon={PauseCircle} tone="text-indigo-600" tile="bg-indigo-50 text-indigo-600 ring-indigo-100" bar="from-indigo-500 to-violet-500" />
            <StatCard label="Converted" value={t.converted} hint="Won and turned into clients" icon={CheckCircle2} tone="text-emerald-600" tile="bg-emerald-50 text-emerald-600 ring-emerald-100" bar="from-emerald-400 to-teal-400" />
            <StatCard label="Lost" value={t.lost} hint="With a reason noted" icon={XCircle} tone="text-rose-600" tile="bg-rose-50 text-rose-600 ring-rose-100" bar="from-rose-500 to-pink-500" />
            <StatCard label="Conversion rate" value={`${t.conversion_rate}%`} hint="Converted out of all leads" icon={TrendingUp} tone="text-emerald-600" tile="bg-emerald-50 text-emerald-600 ring-emerald-100" bar="from-emerald-400 to-teal-400" />
            <StatCard label="Avg days to convert" value={t.avg_days_to_convert ?? '—'} unit={t.avg_days_to_convert === null ? undefined : 'days'} hint="From lead added to won" icon={Timer} tone="text-slate-900" tile="bg-slate-50 text-slate-600 ring-slate-100" bar="from-slate-400 to-slate-500" />
            <StatCard label="Overdue follow-ups" value={t.overdue_follow_ups} hint="Right now, not only in this period" icon={AlertTriangle} tone={t.overdue_follow_ups > 0 ? 'text-rose-600' : 'text-slate-900'} tile="bg-amber-50 text-amber-600 ring-amber-100" bar="from-amber-400 to-orange-400" />
            <StatCard label="Companies" value={t.companies} hint="In the database today" icon={Building2} tone="text-slate-900" tile="bg-blue-50 text-blue-600 ring-blue-100" bar="from-blue-500 to-indigo-500" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Pipeline */}
            <Panel title="Pipeline by status" hint="Where the leads are right now" icon={<Layers className="h-4 w-4" />}>
              {t.leads === 0 ? (
                <Empty text="No leads were added in this period." />
              ) : (
                <ul className="space-y-3">
                  {report.by_stage.map((s) => (
                    <li key={s.stage}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <span className={`h-2.5 w-2.5 rounded-full ${STAGE_TONE[s.stage]?.dot ?? 'bg-slate-400'}`} />
                          {s.stage}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {s.count} <span className="text-xs font-medium text-slate-400">({t.leads ? Math.round((s.count / t.leads) * 100) : 0}%)</span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${STAGE_TONE[s.stage]?.bar ?? 'bg-slate-400'} transition-all`} style={{ width: `${(s.count / stageMax) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Trend */}
            <Panel title="Last six months" hint="Leads added and leads won each month" icon={<TrendingUp className="h-4 w-4" />}>
              <div className="mb-3 flex items-center gap-4 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Added
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Won
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {report.trend.map((m) => (
                  <div key={m.month} className="flex flex-col items-center" title={`${m.label}: ${m.created} added, ${m.converted} won`}>
                    <div className="flex h-36 w-full items-end justify-center gap-1">
                      <div className="flex h-full w-3.5 flex-col justify-end sm:w-5">
                        <span className="mb-1 text-center text-[11px] font-bold text-slate-700">{m.created}</span>
                        <div className="rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400" style={{ height: `${Math.max((m.created / trendMax) * 100, m.created > 0 ? 6 : 2)}%` }} />
                      </div>
                      <div className="flex h-full w-3.5 flex-col justify-end sm:w-5">
                        <span className="mb-1 text-center text-[11px] font-bold text-slate-500">{m.converted}</span>
                        <div className="rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400" style={{ height: `${Math.max((m.converted / trendMax) * 100, m.converted > 0 ? 6 : 2)}%` }} />
                      </div>
                    </div>
                    <span className="mt-2 whitespace-pre-line text-center text-[11px] font-semibold leading-tight text-slate-500">{m.label.replace(' ', '\n')}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Lead sources" hint="Where the leads came from, and which sources win" icon={<Layers className="h-4 w-4" />}>
              <GroupTable rows={report.by_source} firstHeader="Source" empty="No leads in this period." />
            </Panel>

            <Panel title="Services asked for" hint="Service Fit on the leads" icon={<Layers className="h-4 w-4" />}>
              <GroupTable rows={report.by_service_fit} firstHeader="Service" empty="No leads in this period." />
            </Panel>

            {isAdmin && (
              <Panel title="By person" hint="Lead By: who owns the leads and how they do" icon={<Users className="h-4 w-4" />}>
                <GroupTable
                  rows={report.by_user}
                  firstHeader="Person"
                  empty="No leads in this period."
                  leading={(r) => <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">{initials(r.name)}</span>}
                />
              </Panel>
            )}

            <Panel title="Why leads were lost" hint="Reasons noted when a lead is marked as lost" icon={<XCircle className="h-4 w-4" />}>
              {report.lost_reasons.length === 0 ? (
                <Empty text="No lost leads in this period." />
              ) : (
                <ul className="space-y-3">
                  {report.lost_reasons.map((r) => (
                    <li key={r.reason}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{r.reason}</span>
                        <span className="font-semibold text-slate-900">
                          {r.count} <span className="text-xs font-medium text-slate-400">({r.percent}%)</span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600" style={{ width: `${r.percent}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
};
