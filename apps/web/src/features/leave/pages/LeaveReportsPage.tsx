import React, { useMemo, useState } from 'react';
import { Download, Printer, ChevronDown } from 'lucide-react';
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

  const sel = 'px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700';

  return (
    <div className="w-full space-y-4">
      {/* 1 Title · 2 Export */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">Approved leave only, unless the Status filter says otherwise</p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen(!exportOpen)}
            disabled={isDownloading || !data}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {exportOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs">
              <button type="button" onClick={() => doExport('xlsx')} className="block w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">Excel</button>
              <button type="button" onClick={() => doExport('pdf')} className="flex items-center gap-1.5 w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer"><Printer className="w-3 h-3" /> PDF</button>
              <button type="button" onClick={() => doExport('csv')} className="block w-full text-left px-3 py-2 hover:bg-slate-50 cursor-pointer">CSV</button>
            </div>
          )}
        </div>
      </div>
      {exportError && <p className="text-xs text-rose-600">{exportError}</p>}

      {/* 3 Report tabs */}
      <div className="flex flex-wrap gap-1.5">
        {REPORTS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setReport(r.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
              report === r.id ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 4 Filters */}
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="w-48">
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

      {error && <p className="text-xs text-rose-600">{errMessage(error)}</p>}
      {isLoading && !data && <div className="py-10 text-center text-slate-400 text-xs">Loading…</div>}

      {data && (
        <>
          <p className="text-[11px] text-slate-500">{data.period_label}</p>

          {report === 'summary' && data.totals && (
            <>
              {/* 5 Totals */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['Leave days taken', fmtDays(data.totals.taken)],
                  ['Paid leave days', fmtDays(data.totals.paid)],
                  ['Unpaid leave days (LOP)', fmtDays(data.totals.unpaid)],
                  ['Pending requests', String(data.totals.pending_requests ?? 0)],
                ].map(([l, v]) => (
                  <div key={l} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                    <div className="text-2xl font-extrabold text-slate-900">{v}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 6 Trend */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                  <h3 className="text-xs font-bold text-slate-800 mb-3">Leave days, last 6 months</h3>
                  <div className="flex items-end gap-4 h-40 px-2">
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
                          <div className="w-1/3 bg-blue-500 rounded-t group-hover:bg-blue-600" style={{ height: `${(t.paid / maxTrend) * 100}%` }} />
                          <div className="w-1/3 bg-orange-500 rounded-t group-hover:bg-orange-600" style={{ height: `${(t.unpaid / maxTrend) * 100}%` }} />
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
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-800">By {GROUPS.find((g) => g.id === groupBy)?.label.toLowerCase()}</h3>
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
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {data.table.columns.map((c) => (
                      <th key={c.key} className="py-2.5 px-3 whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.table.rows.length === 0 ? (
                    <tr>
                      <td colSpan={data.table.columns.length} className="py-10 text-center text-slate-500">
                        No leave matches your filters.{' '}
                        <button type="button" onClick={clearFilters} className="text-blue-600 font-semibold hover:underline cursor-pointer">Clear filters</button>
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
