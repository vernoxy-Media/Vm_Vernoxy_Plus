import React, { useMemo, useState } from 'react';
import { Download, Printer, ChevronDown, CalendarDays, Wallet, TriangleAlert, Hourglass, FilterX, FileSearch } from 'lucide-react';
import { KpiStat } from '@/shared/ui/dashboard/DashboardShell';
import {
  LeaveReportsFilters,
  leaveExportUrl,
  useLeaveLookupsQuery,
  useLeaveReportsQuery,
  useLeaveTypesQuery,
} from '../hooks/use-leave';
import { useDepartmentOptionsQuery, useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useAuthenticatedDownload } from '@/shared/hooks/use-authenticated-download';
import { SearchableSelect } from '@/shared/ui/SearchableSelect';
import { LeaveRequestDetailsModal } from '../components/LeaveRequestDetailsModal';
import { PaidTag, errMessage, fmtDays, printTable, todayYmd } from '../components/leave-ui';

const REPORTS = [
  { id: 'summary', label: 'Summary' },
  { id: 'register', label: 'Leave Register' },
  { id: 'balances', label: 'Balances' },
  { id: 'lop', label: 'Unpaid Leave (LOP)' },
  { id: 'on_leave_today', label: 'On Leave Today' },
  { id: 'pending', label: 'Pending' },
  { id: 'calendar', label: 'Leave Calendar' },
];

const GROUPS = [
  { id: 'type', label: 'Leave Type' },
  { id: 'department', label: 'Department' },
  { id: 'employee', label: 'Employee' },
];

export const LeaveReportsPage: React.FC = () => {
  const [report, setReport] = useState('summary');
  const [periodMode, setPeriodMode] = useState<'month' | 'range'>('month');
  const [month, setMonth] = useState(todayYmd().slice(0, 7));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [onDate, setOnDate] = useState(todayYmd());
  const [typeId, setTypeId] = useState<number | undefined>();
  const [paid, setPaid] = useState('');
  const [depId, setDepId] = useState<number | undefined>();
  const [empId, setEmpId] = useState<number | undefined>();
  const [status, setStatus] = useState('');
  const [groupBy, setGroupBy] = useState('type');
  const [exportOpen, setExportOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [exportError, setExportError] = useState('');

  const usesPeriod = ['summary', 'register', 'lop', 'calendar'].includes(report);
  const usesOnDate = ['balances', 'on_leave_today'].includes(report);
  const filters: LeaveReportsFilters = {
    report_type: report,
    ...(usesPeriod && periodMode === 'month' ? { month } : {}),
    ...(usesPeriod && periodMode === 'range' && fromDate && toDate ? { from_date: fromDate, to_date: toDate } : {}),
    ...(usesOnDate ? { on_date: onDate } : {}),
    leave_type_id: typeId,
    paid_unpaid: paid || undefined,
    department_id: depId,
    employee_id: empId,
    status: status || undefined,
    group_by: report === 'summary' ? groupBy : undefined,
  };

  const { data, isLoading, error } = useLeaveReportsQuery(filters);
  const { data: lookups } = useLeaveLookupsQuery();
  const { data: types = [] } = useLeaveTypesQuery();
  const { data: departments = [] } = useDepartmentOptionsQuery();
  const { data: employees = [] } = useEmployeeOptionsQuery();
  const { download, isDownloading } = useAuthenticatedDownload();

  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend || []).map((t) => t.paid + t.unpaid)), [data]);

  const doExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
    setExportOpen(false);
    setExportError('');
    if (!data) return;
    if (format === 'pdf') {
      const t = { ...data.table };
      if (report !== 'register') t.columns = t.columns.filter((c) => c.key !== 'reason');
      printTable(t, data.period_label);
      return;
    }
    try {
      await download(leaveExportUrl('reports/export', { ...filters, format }), `leave-${report}.${format}`);
    } catch (e: any) {
      setExportError(errMessage(e));
    }
  };

  const clearFilters = () => {
    setTypeId(undefined);
    setPaid('');
    setDepId(undefined);
    setEmpId(undefined);
    setStatus('');
  };

  const sel =
    'h-9 cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="w-full space-y-5">
      <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-blue-50 via-white to-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">Leave Reports</h1>
            <p className="mt-1 text-xs text-slate-500">Approved leave only, unless the Status filter says otherwise</p>
          </div>
          <div className="relative self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setExportOpen(!exportOpen)}
              disabled={isDownloading || !data}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Export <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {exportOpen && (
              <div role="menu" className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-[13px] shadow-lg">
                <button type="button" role="menuitem" onClick={() => doExport('xlsx')} className="block w-full cursor-pointer px-3.5 py-2 text-left hover:bg-slate-50">Excel (.xlsx)</button>
                <button type="button" role="menuitem" onClick={() => doExport('pdf')} className="flex w-full cursor-pointer items-center gap-1.5 px-3.5 py-2 text-left hover:bg-slate-50"><Printer className="h-3.5 w-3.5" /> PDF / Print</button>
                <button type="button" role="menuitem" onClick={() => doExport('csv')} className="block w-full cursor-pointer px-3.5 py-2 text-left hover:bg-slate-50">CSV</button>
              </div>
            )}
          </div>
        </div>
      </section>
      {exportError && <p role="alert" className="text-xs text-rose-600">{exportError}</p>}

      {/* 3 Report tabs */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Report">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={report === r.id}
            onClick={() => setReport(r.id)}
            className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              report === r.id ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 4 Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
        {usesPeriod && (
          <>
            <select value={periodMode} onChange={(e) => setPeriodMode(e.target.value as any)} className={sel}>
              <option value="month">Month</option>
              <option value="range">From – To</option>
            </select>
            {periodMode === 'month' ? (
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={sel} />
            ) : (
              <>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={sel} />
                <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className={sel} />
              </>
            )}
          </>
        )}
        {usesOnDate && <input type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} className={sel} title="On date" />}
        <select value={typeId ?? ''} onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : undefined)} className={sel}>
          <option value="">Leave Type: All</option>
          {types.map((t) => (
            <option key={t.leave_type_id} value={t.leave_type_id}>{t.name}</option>
          ))}
        </select>
        {report !== 'balances' && report !== 'lop' && (
          <select value={paid} onChange={(e) => setPaid(e.target.value)} className={sel}>
            <option value="">Paid or Unpaid: All</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        )}
        <select value={depId ?? ''} onChange={(e) => setDepId(e.target.value ? Number(e.target.value) : undefined)} className={sel}>
          <option value="">Department: All</option>
          {(departments as any[]).map((d) => (
            <option key={d.dep_id ?? d.id} value={d.dep_id ?? d.id}>{d.name}</option>
          ))}
        </select>
        <div className="w-52">
          <SearchableSelect
            options={(employees as any[]).map((e) => ({ value: e.emp_id, label: e.name }))}
            value={empId ?? null}
            onChange={(v) => setEmpId(v ? Number(v) : undefined)}
            placeholder="Employee: All"
            clearable
          />
        </div>
        {['summary', 'register', 'calendar'].includes(report) && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel}>
            <option value="">Status: Approved</option>
            <option value="ALL">Status: All</option>
            {(lookups?.leave_request_status || []).filter((s) => s.value !== 'APPROVED').map((s) => (
              <option key={s.value} value={s.value}>Status: {s.label}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{errMessage(error)}</p>}
      {isLoading && !data && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading report">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="h-[104px] animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      )}

      {data && (
        <>
          <p className="text-xs font-semibold text-slate-600">{data.period_label}</p>

          {report === 'summary' && data.totals && (
            <>
              {/* 5 Totals */}
              <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
                <KpiStat label="Leave days taken" value={fmtDays(data.totals.taken)} hint="Paid and unpaid together" icon={CalendarDays} tone="blue" />
                <KpiStat label="Paid leave days" value={fmtDays(data.totals.paid)} hint="Salary is paid" icon={Wallet} tone="emerald" />
                <KpiStat label="Unpaid leave (LOP)" value={fmtDays(data.totals.unpaid)} hint="Salary is cut" icon={TriangleAlert} tone={data.totals.unpaid ? 'rose' : 'slate'} />
                <KpiStat label="Pending requests" value={data.totals.pending_requests ?? 0} hint="Waiting for a decision" icon={Hourglass} tone={data.totals.pending_requests ? 'amber' : 'slate'} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 6 Trend */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5">
                  <h3 className="mb-4 text-sm font-bold text-slate-800">Leave days, last 6 months</h3>
                  <div className="flex h-44 items-end gap-3 px-1 sm:gap-4 sm:px-2">
                    {(data.trend || []).map((t) => (
                      <button
                        key={t.month}
                        type="button"
                        title={`${t.label}: ${fmtDays(t.paid)} paid · ${fmtDays(t.unpaid)} unpaid`}
                        onClick={() => {
                          setPeriodMode('month');
                          setMonth(t.month);
                        }}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-1 cursor-pointer group"
                      >
                        <div className="w-full flex items-end justify-center gap-1 h-full">
                          <div className="w-1/3 min-h-[2px] rounded-t-md bg-blue-500 transition group-hover:bg-blue-600" style={{ height: `${(t.paid / maxTrend) * 100}%` }} />
                          <div className="w-1/3 min-h-[2px] rounded-t-md bg-orange-500 transition group-hover:bg-orange-600" style={{ height: `${(t.unpaid / maxTrend) * 100}%` }} />
                        </div>
                        <span className={`text-[10px] ${t.month === month ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-sm" /> Paid</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-sm" /> Unpaid</span>
                  </div>
                </div>

                {/* 7 Breakdown */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-800">By {GROUPS.find((g) => g.id === groupBy)?.label.toLowerCase()}</h3>
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={sel}>
                      {GROUPS.map((g) => (
                        <option key={g.id} value={g.id}>Group by: {g.label}</option>
                      ))}
                    </select>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100">
                        <th className="text-left py-2">{GROUPS.find((g) => g.id === groupBy)?.label}</th>
                        {groupBy === 'type' && <th className="text-left py-2">Paid</th>}
                        <th className="text-right py-2">Days</th>
                        <th className="text-right py-2">Employees</th>
                        <th className="text-right py-2">Avg days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(data.breakdown || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500">
                            No leave matches your filters.{' '}
                            <button type="button" onClick={clearFilters} className="text-blue-600 font-semibold hover:underline cursor-pointer">Clear filters</button>
                          </td>
                        </tr>
                      ) : (
                        (data.breakdown || []).map((b) => (
                          <tr
                            key={b.key}
                            className="hover:bg-slate-50 cursor-pointer"
                            onClick={() => {
                              if (groupBy === 'type') setTypeId(Number(b.key));
                              if (groupBy === 'department') setDepId(Number(b.key) || undefined);
                              if (groupBy === 'employee') setEmpId(Number(b.key));
                              setReport('register');
                            }}
                          >
                            <td className="py-2 font-semibold text-slate-800">{b.label}</td>
                            {groupBy === 'type' && <td className="py-2">{b.is_paid !== undefined && <PaidTag paid={Boolean(b.is_paid)} />}</td>}
                            <td className="py-2 text-right">{fmtDays(b.days)}</td>
                            <td className="py-2 text-right">{b.employees}</td>
                            <td className="py-2 text-right">{fmtDays(b.average_days)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {report !== 'summary' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-slate-100 bg-slate-50/80">
                  <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {data.table.columns.map((c) => (
                      <th key={c.key} className="py-2.5 px-3 whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.table.rows.length === 0 ? (
                    <tr>
                      <td colSpan={data.table.columns.length} className="py-14 text-center">
                        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <FileSearch className="h-6 w-6" />
                        </span>
                        <p className="text-sm font-semibold text-slate-700">No leave matches your filters</p>
                        <button type="button" onClick={clearFilters} className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">
                          <FilterX className="h-3.5 w-3.5" /> Clear filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    data.table.rows.map((row, i) => (
                      <tr
                        key={i}
                        className={row.request_id ? 'hover:bg-slate-50 cursor-pointer' : ''}
                        onClick={() => row.request_id && setViewId(row.request_id)}
                      >
                        {data.table.columns.map((c) => (
                          <td key={c.key} className={`py-2 px-3 ${c.key === 'reason' ? 'max-w-[240px] truncate' : 'whitespace-nowrap'} text-slate-700`} title={c.key === 'reason' ? String(row[c.key] ?? '') : undefined}>
                            {c.key === 'request_no' && row.self_approved ? `${row[c.key]} ●` : String(row[c.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {report === 'register' && <p className="px-3 py-2 text-[10px] text-slate-400">● Self-approved (one-Admin case)</p>}
            </div>
          )}
        </>
      )}

      <LeaveRequestDetailsModal requestId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
};
