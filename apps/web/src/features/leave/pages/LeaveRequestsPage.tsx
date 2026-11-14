import React, { useMemo, useState } from 'react';
import { Plus, Search, Download, Printer, ChevronLeft, ChevronRight, CalendarDays, Wallet, BarChart3, CheckCircle2, Hourglass, AlertCircle } from 'lucide-react';
import { KpiStat, type KpiTone } from '@/shared/ui/dashboard/DashboardShell';
import { customFetch } from '@vernoxy-pulse/api-client';
import {
  LeaveRequestsFilters,
  LeaveRequestsList,
  leaveExportUrl,
  useAdminLeaveRequestsQuery,
  useLeaveTypesQuery,
  useTeamLeaveRequestsQuery,
} from '../hooks/use-leave';
import { useDepartmentOptionsQuery, useEmployeeOptionsQuery } from '@/features/organization/hooks/use-organization';
import { useAuthenticatedDownload } from '@/shared/hooks/use-authenticated-download';
import { useAuth } from '@/features/auth/context/AuthContext';
import { SearchableSelect } from '@/shared/ui/SearchableSelect';
import { ApplyLeaveModal } from '../components/ApplyLeaveModal';
import { LeaveRequestDetailsModal } from '../components/LeaveRequestDetailsModal';
import {
  Btn,
  PaidTag,
  ShortNoticeTag,
  StatusBadge,
  dateRangeLabel,
  errMessage,
  fmtDate,
  fmtDateTime,
  fmtDays,
  printTable,
  todayYmd,
} from '../components/leave-ui';

const TABS = ['Pending', 'Approved', 'Rejected', 'All'] as const;

const COUNTER_META: Record<string, { icon: React.ElementType; tone: KpiTone; hint: string }> = {
  pending: { icon: Hourglass, tone: 'amber', hint: 'Waiting for a decision' },
  cancellation: { icon: AlertCircle, tone: 'rose', hint: 'Employees asking to cancel' },
  on_leave_today: { icon: CalendarDays, tone: 'blue', hint: 'Away today' },
  approved_month: { icon: CheckCircle2, tone: 'emerald', hint: 'Approved leave' },
};

const FIELD =
  'h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10';

const initialsOf = (name?: string) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
const PAGE_SIZE = 20;

interface Props {
  hideBreadcrumb?: boolean;
  /** Reporting Manager: read-only list of the team's requests. */
  teamMode?: boolean;
  onNavigate?: (tab: 'calendar' | 'balances' | 'reports') => void;
}

export const LeaveRequestsPage: React.FC<Props> = ({ teamMode = false, onNavigate }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>(teamMode ? 'All' : 'Pending');
  const [counter, setCounter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [typeId, setTypeId] = useState<number | undefined>();
  const [depId, setDepId] = useState<number | undefined>();
  const [empId, setEmpId] = useState<number | undefined>();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [exportError, setExportError] = useState('');

  const filters: LeaveRequestsFilters = {
    tab,
    counter,
    search: search.trim() || undefined,
    leave_type_id: typeId,
    department_id: depId,
    employee_id: empId,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    page,
    page_size: PAGE_SIZE,
  };
  const adminQuery = useAdminLeaveRequestsQuery(filters, !teamMode);
  const teamQuery = useTeamLeaveRequestsQuery(filters, teamMode);
  const { data, isLoading, error } = teamMode ? teamQuery : adminQuery;
  const { data: types = [] } = useLeaveTypesQuery();
  const { data: departments = [] } = useDepartmentOptionsQuery();
  const { data: employees = [] } = useEmployeeOptionsQuery();
  const { download, isDownloading } = useAuthenticatedDownload();

  const counters = data?.counters;
  const rows = data?.requests || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resetPage = () => setPage(1);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 4000);
  };

  const exportPdf = async () => {
    setExportError('');
    try {
      const all = await customFetch<LeaveRequestsList>(
        `/api/v1/leave/${teamMode ? 'team/requests' : 'requests'}?${new URLSearchParams(
          Object.entries({ ...filters, page: 1, page_size: 500 })
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        ).toString()}`,
      );
      printTable(
        {
          title: `Leave Requests · ${counter ? 'Filtered' : tab}`,
          columns: [
            { key: 'request_no', label: 'Request No.' },
            { key: 'employee_name', label: 'Employee' },
            { key: 'department_name', label: 'Department' },
            { key: 'leave_type_name', label: 'Leave Type' },
            { key: 'paid', label: 'Paid/Unpaid' },
            { key: 'dates', label: 'Dates' },
            { key: 'days', label: 'Days' },
            { key: 'bal', label: 'Balance after' },
            { key: 'applied', label: 'Applied' },
            { key: 'status_label', label: 'Status' },
          ],
          rows: all.requests.map((r) => ({
            ...r,
            paid: r.is_paid ? 'Paid' : 'Unpaid',
            dates: dateRangeLabel(r.from_date, r.to_date, r.duration),
            days: fmtDays(r.leave_days),
            bal: r.balance_after === null || r.balance_after === undefined ? '—' : fmtDays(r.balance_after),
            applied: fmtDate(r.applied_at?.slice(0, 10)),
          })),
        },
        `Exported ${fmtDate(todayYmd())}`,
      );
    } catch (e: any) {
      setExportError(errMessage(e));
    }
  };

  const counterCards = useMemo(
    () => [
      { key: 'pending', label: 'Pending approval', value: counters?.pending_count ?? 0 },
      { key: 'cancellation', label: 'Cancellation requests', value: counters?.cancellation_requests_count ?? 0 },
      { key: 'on_leave_today', label: 'On leave today', value: counters?.on_leave_today_count ?? 0 },
      { key: 'approved_month', label: 'Approved this month', value: counters?.approved_this_month_count ?? 0 },
    ],
    [counters],
  );

  const appliedLabel = (iso: string) => {
    const d = iso?.slice(0, 10);
    return d === todayYmd() ? `Today ${fmtDateTime(iso).split(', ')[1] || ''}` : fmtDate(d);
  };

  const noFilters = !counter && !search && !typeId && !depId && !empId && !fromDate && !toDate;
  const rowAction = (r: (typeof rows)[number]) => {
    const review = !teamMode && (r.status === 'PENDING' || r.status === 'CANCELLATION_REQUESTED');
    return (
      <button
        type="button"
        onClick={() => setViewId(r.request_id)}
        className={`cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition active:scale-[0.97] ${
          review ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 hover:brightness-110' : 'border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
        }`}
      >
        {review ? 'Review' : 'View'}
      </button>
    );
  };

  return (
    <div className="w-full space-y-5">
      {/* Title and the main actions */}
      <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-blue-50 via-white to-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">{teamMode ? 'Team Leave' : 'Leave Requests'}</h1>
            <p className="mt-1 text-xs text-slate-500">
              {teamMode ? 'Leave requests of your team. The Admin approves every request.' : 'Every leave request of every employee'}
            </p>
          </div>
          {!teamMode && (
            <div className="flex flex-wrap items-center gap-2">
              <Btn onClick={() => onNavigate?.('calendar')}>
                <CalendarDays className="h-4 w-4 text-slate-500" /> Calendar
              </Btn>
              <Btn onClick={() => onNavigate?.('balances')}>
                <Wallet className="h-4 w-4 text-slate-500" /> Balances
              </Btn>
              <Btn onClick={() => onNavigate?.('reports')}>
                <BarChart3 className="h-4 w-4 text-slate-500" /> Reports
              </Btn>
              <Btn variant="primary" onClick={() => setAddOpen(true)} className="h-10 px-4">
                <Plus className="h-4 w-4" /> Add leave for employee
              </Btn>
            </div>
          )}
        </div>
      </section>

      {toast && (
        <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {toast}
        </div>
      )}

      {/* Numbers; each one opens the matching list */}
      {counters && (
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
          {counterCards.map((c) => {
            const meta = COUNTER_META[c.key]!;
            const on = counter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setCounter(on ? undefined : c.key);
                  setTab('All');
                  resetPage();
                }}
                className={`cursor-pointer rounded-2xl text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${on ? 'ring-2 ring-blue-500' : ''}`}
              >
                <KpiStat label={c.label} value={c.value} hint={on ? 'Showing this list: click to clear' : meta.hint} icon={meta.icon} tone={meta.tone} className="h-full" />
              </button>
            );
          })}
        </div>
      )}

      <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)] sm:p-5">
        {/* Status chips */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Request status">
          {TABS.map((t) => {
            const on = tab === t && !counter;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setTab(t);
                  setCounter(undefined);
                  resetPage();
                }}
                className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition ${
                  on ? 'border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700'
                }`}
              >
                {t}
                {t === 'Pending' && counters && counters.pending_count > 0 && (
                  <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${on ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'}`}>{counters.pending_count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_minmax(0,1.6fr)_auto]">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Request No. or employee"
              aria-label="Search"
              className={`${FIELD} w-full pl-9`}
            />
          </div>
          <select
            value={typeId ?? ''}
            onChange={(e) => {
              setTypeId(e.target.value ? Number(e.target.value) : undefined);
              resetPage();
            }}
            aria-label="Leave type"
            className={`${FIELD} select-chevron cursor-pointer`}
          >
            <option value="">Leave type: All</option>
            {types.map((t) => (
              <option key={t.leave_type_id} value={t.leave_type_id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={depId ?? ''}
            onChange={(e) => {
              setDepId(e.target.value ? Number(e.target.value) : undefined);
              resetPage();
            }}
            aria-label="Department"
            className={`${FIELD} select-chevron cursor-pointer`}
          >
            <option value="">Department: All</option>
            {(departments as any[]).map((d) => (
              <option key={d.dep_id ?? d.id} value={d.dep_id ?? d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="min-w-0">
            <SearchableSelect
              options={(employees as any[]).map((e) => ({ value: e.emp_id, label: e.name }))}
              value={empId ?? null}
              onChange={(v) => {
                setEmpId(v ? Number(v) : undefined);
                resetPage();
              }}
              placeholder="Employee: All"
              clearable
            />
          </div>
          <div className="col-span-2 flex items-center gap-1.5 text-xs text-slate-500 md:col-span-2 xl:col-span-1">
            <input
              type="date"
              value={fromDate}
              aria-label="From date"
              onChange={(e) => {
                setFromDate(e.target.value);
                resetPage();
              }}
              className={`${FIELD} min-w-0 flex-1 font-medium`}
            />
            <span>to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              aria-label="To date"
              onChange={(e) => {
                setToDate(e.target.value);
                resetPage();
              }}
              className={`${FIELD} min-w-0 flex-1 font-medium`}
            />
          </div>
          {!teamMode && (
            <div className="col-span-2 flex items-center justify-end gap-1.5 md:col-span-1">
              <Btn onClick={exportPdf}>
                <Printer className="h-3.5 w-3.5" /> PDF
              </Btn>
              <Btn
                loading={isDownloading}
                onClick={async () => {
                  setExportError('');
                  try {
                    await download(leaveExportUrl('requests/export', { ...filters, page: undefined, page_size: undefined, format: 'xlsx' }), 'leave-requests.xlsx');
                  } catch (e: any) {
                    setExportError(errMessage(e));
                  }
                }}
              >
                <Download className="h-3.5 w-3.5" /> Excel
              </Btn>
            </div>
          )}
        </div>
        {exportError && <p role="alert" className="text-xs text-rose-600">{exportError}</p>}
        {error && <p role="alert" className="text-xs text-rose-600">{errMessage(error)}</p>}

        {isLoading ? (
          <div className="space-y-2 py-1" aria-busy="true" aria-label="Loading requests">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-slate-700">
              {tab === 'Pending' && noFilters ? 'No leave requests waiting for you' : 'No leave requests match your filters'}
            </p>
            <p className="mt-1 text-xs text-slate-500">{tab === 'Pending' && noFilters ? 'New requests will appear here.' : 'Try another tab, date range or search word.'}</p>
          </div>
        ) : (
          <>
            {/* Phones: one card per request */}
            <ul className="space-y-2.5 md:hidden">
              {rows.map((r) => (
                <li key={r.request_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-bold text-white ring-2 ring-white shadow-sm">
                      {initialsOf(r.employee_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{r.employee_name}</p>
                      <p className="truncate text-[11px] text-slate-500">{r.department_name || '—'} · {r.request_no}</p>
                    </div>
                    <StatusBadge status={r.status} label={r.status_label} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-700">
                    <span className="font-semibold">{r.leave_type_name}</span>
                    <PaidTag paid={r.is_paid} />
                    {r.is_short_notice && <ShortNoticeTag />}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600">{dateRangeLabel(r.from_date, r.to_date, r.duration)}</span>
                    <b className="tabular-nums text-slate-900">{fmtDays(r.leave_days)} d</b>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <span className="text-[11px] text-slate-400">
                      Applied {appliedLabel(r.applied_at)}
                      {r.balance_after !== null && r.balance_after !== undefined ? ` · balance after ${fmtDays(r.balance_after)}` : ''}
                    </span>
                    {rowAction(r)}
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablets and computers: a table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="whitespace-nowrap px-4 py-3">Employee</th>
                    <th className="whitespace-nowrap px-4 py-3">Leave</th>
                    <th className="whitespace-nowrap px-4 py-3">Dates</th>
                    <th className="whitespace-nowrap px-4 py-3">Days</th>
                    <th className="whitespace-nowrap px-4 py-3">Bal. after</th>
                    <th className="whitespace-nowrap px-4 py-3">Applied</th>
                    <th className="whitespace-nowrap px-4 py-3">Status</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {rows.map((r) => (
                    <tr key={r.request_id} className="align-middle transition-colors hover:bg-blue-50/30">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-[11px] font-bold text-white ring-2 ring-white shadow-sm">
                            {initialsOf(r.employee_name)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{r.employee_name}</div>
                            <div className="truncate text-[11px] text-slate-400">{r.department_name || '—'} · {r.request_no}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-slate-800">
                          {r.leave_type_name} <PaidTag paid={r.is_paid} />
                        </div>
                        {r.is_short_notice && <div className="mt-1"><ShortNoticeTag /></div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">{dateRangeLabel(r.from_date, r.to_date, r.duration)}</td>
                      <td className="px-4 py-3.5 font-semibold tabular-nums text-slate-900">{fmtDays(r.leave_days)}</td>
                      <td className="px-4 py-3.5 tabular-nums text-slate-700">{r.balance_after === null || r.balance_after === undefined ? '—' : fmtDays(r.balance_after)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">{appliedLabel(r.applied_at)}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={r.status} label={r.status_label} />
                        {r.is_self_approved && <div className="mt-0.5 text-[10px] text-slate-400">● Self-approved</div>}
                      </td>
                      <td className="px-4 py-3.5 text-right">{rowAction(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 tabular-nums">{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Next page" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      <LeaveRequestDetailsModal requestId={viewId} onClose={() => setViewId(null)} />
      {!teamMode && (
        <ApplyLeaveModal
          open={addOpen}
          adminMode
          currentEmpId={user?.emp_id}
          onClose={() => setAddOpen(false)}
          onSaved={(no) => flash(`Leave ${no} added and approved. The employee and Reporting Manager have been told.`)}
        />
      )}
    </div>
  );
};
