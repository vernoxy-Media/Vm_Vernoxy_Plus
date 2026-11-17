import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Banknote, BarChart3, CalendarCheck2, Loader2, Plus, Settings, Users, Wallet } from 'lucide-react';
import { PayrollMonthItem, errorText, usePayrollMe, usePayrollRunsQuery } from '../hooks/use-payroll';
import { StartPayrollModal } from '../components/StartPayrollModal';
import { PayrollSettingsModal } from '../components/PayrollSettingsModal';
import { Banner, FilterField, Pager, RunStatusBadge, StatCard, btn, filterCls, fmtDate, money } from '../components/payroll-ui';

const STATUSES = [
  { v: 'ALL', l: 'All' },
  { v: 'NOT_STARTED', l: 'Not started' },
  { v: 'DRAFT', l: 'Draft' },
  { v: 'LOCKED', l: 'Locked' },
  { v: 'PAID', l: 'Paid' },
];

/** Screen 1: Payroll Runs Listing (BFD Section 3). */
export const PayrollRunsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: me } = usePayrollMe();
  const [year, setYear] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [startFor, setStartFor] = useState<{ year: number; month: number } | null | undefined>(undefined); // undefined = closed
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data, isLoading, error } = usePayrollRunsQuery(year, status, page);
  const s = data?.summary;

  const open = (r: PayrollMonthItem) => {
    if (r.status === 'NOT_STARTED') setStartFor({ year: r.payroll_year, month: r.payroll_month });
    else navigate(`/admin/payroll/${r.payroll_year}/${r.payroll_month}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/25">
            <Banknote className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Payroll</h1>
            <p className="text-[13px] text-slate-500">One payroll run for every month.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn.secondary} onClick={() => navigate('/admin/payroll/reports')}>
            <BarChart3 className="h-4 w-4" /> Reports
          </button>
          <button type="button" className={btn.secondary} onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" /> Settings
          </button>
          <button type="button" className={btn.primary} onClick={() => setStartFor(null)}>
            <Plus className="h-4 w-4" /> Start Payroll
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current run"
          value={s?.current_run_month ?? '—'}
          hint={s?.current_run_month ? `Current run · ${({ DRAFT: 'Draft', LOCKED: 'Locked', PAID: 'Paid', NOT_STARTED: 'Not started' } as const)[s.current_run_status]}` : 'No run yet'}
          icon={CalendarCheck2}
          tone="text-slate-800 text-2xl"
          tile="bg-blue-50 text-blue-600 ring-blue-100"
          bar="from-blue-500 to-indigo-500"
        />
        <StatCard label="Employees in the current run" value={s?.total_employees ?? 0} icon={Users} tone="text-indigo-600" tile="bg-indigo-50 text-indigo-600 ring-indigo-100" bar="from-indigo-400 to-violet-500" />
        <StatCard label="Total Salary, current run" value={money(s?.total_salary, 0)} icon={Wallet} tone="text-emerald-600" tile="bg-emerald-50 text-emerald-600 ring-emerald-100" bar="from-emerald-400 to-teal-500" />
        <StatCard
          label="Warnings to review"
          value={s?.warnings_count ?? 0}
          icon={AlertTriangle}
          tone={(s?.warnings_count ?? 0) > 0 ? 'text-amber-600' : 'text-slate-700'}
          tile="bg-amber-50 text-amber-600 ring-amber-100"
          bar="from-amber-400 to-orange-500"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <FilterField label="Year">
            <select className={`${filterCls} w-32`} value={year ?? data?.year ?? ''} onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}>
              {(data?.years || [new Date().getFullYear()]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Status">
            <select className={`${filterCls} w-40`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              {STATUSES.map((x) => (
                <option key={x.v} value={x.v}>
                  {x.l}
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4">
            <Banner>{errorText(error)}</Banner>
          </div>
        ) : !data?.runs.length ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-[13px] text-slate-500">
            No payroll runs match your filters.
            <button type="button" className={btn.link} onClick={() => { setStatus('ALL'); setYear(undefined); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[12.5px]">
                <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Month</th>
                    <th className="px-3 py-3 text-right">Employees</th>
                    <th className="px-3 py-3 text-right">Gross</th>
                    <th className="px-3 py-3 text-right">PF</th>
                    <th className="px-3 py-3 text-right">Total Salary</th>
                    <th className="px-3 py-3">Attendance</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Slips</th>
                    <th className="px-5 py-3 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.runs.map((r) => {
                    const started = r.status !== 'NOT_STARTED';
                    return (
                      <tr key={`${r.payroll_year}-${r.payroll_month}`} className="cursor-pointer transition hover:bg-blue-50/30" onClick={() => open(r)}>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900">{r.month_name}</p>
                          <p className="text-[11px] text-slate-400">{r.date_range}</p>
                        </td>
                        <td className="px-3 py-3.5 text-right text-slate-700">{started ? r.total_employees : '—'}</td>
                        <td className="px-3 py-3.5 text-right text-slate-700">{started ? money(r.gross_earnings, 0) : '—'}</td>
                        <td className="px-3 py-3.5 text-right text-slate-700">{started ? money(r.employee_pf_total, 0) : '—'}</td>
                        <td className="px-3 py-3.5 text-right font-bold text-slate-900">{started ? money(r.total_salary, 0) : '—'}</td>
                        <td className="px-3 py-3.5">
                          {r.attendance_locked ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                              Locked {fmtDate(r.attendance_locked_at).slice(0, 6)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Open</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5">
                          <RunStatusBadge status={r.status} />
                        </td>
                        <td className="px-3 py-3.5 text-slate-600">{started && r.released_slips_count ? `${r.released_slips_count} / ${r.total_employees}` : '—'}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={btn.link}>{started ? 'Open' : 'Start'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
          </>
        )}
      </div>

      <StartPayrollModal open={startFor !== undefined} preset={startFor ?? null} onClose={() => setStartFor(undefined)} />
      <PayrollSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} canEdit={Boolean(me?.can_edit_settings)} />
    </div>
  );
};
