import React, { useMemo, useState } from 'react';
import { Plus, Search, Download, Printer, ChevronLeft, ChevronRight, CalendarDays, Wallet, BarChart3, CheckCircle2 } from 'lucide-react';
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

  return (
    <div className="w-full space-y-4">
      {/* 1 Title · 2 Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{teamMode ? 'Team Leave' : 'Leave Requests'}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {teamMode
              ? 'Leave requests of your team. The Admin approves every request.'
              : 'Every leave request of every employee'}
          </p>
        </div>
        {!teamMode && (
          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={() => onNavigate?.('calendar')}>
              <CalendarDays className="w-4 h-4 text-slate-500" /> Leave Calendar
            </Btn>
            <Btn onClick={() => onNavigate?.('balances')}>
              <Wallet className="w-4 h-4 text-slate-500" /> Balances
            </Btn>
            <Btn onClick={() => onNavigate?.('reports')}>
              <BarChart3 className="w-4 h-4 text-slate-500" /> Reports
            </Btn>
            <Btn variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add Leave for Employee
            </Btn>
          </div>
        )}
      </div>

      {toast && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Counters (each opens the matching list) */}
      {counters && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {counterCards.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setCounter(counter === c.key ? undefined : c.key);
                setTab('All');
                resetPage();
              }}
              className={`text-left bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition cursor-pointer ${
                counter === c.key ? 'border-blue-400 ring-2 ring-blue-500/15' : 'border-slate-200/80'
              }`}
            >
              <div className="text-2xl font-extrabold text-slate-900">{c.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{c.label}</div>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        {/* 3 Tabs · 4 Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setCounter(undefined);
                  resetPage();
                }}
                className={`px-3.5 py-1 rounded-full font-semibold cursor-pointer ${
                  tab === t && !counter ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Request No. or employee"
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-52"
            />
          </div>
          <select
            value={typeId ?? ''}
            onChange={(e) => {
              setTypeId(e.target.value ? Number(e.target.value) : undefined);
              resetPage();
            }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <option value="">Leave Type: All</option>
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
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <option value="">Department: All</option>
            {(departments as any[]).map((d) => (
              <option key={d.dep_id ?? d.id} value={d.dep_id ?? d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="w-48">
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
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); resetPage(); }} className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs" />
            <span>to</span>
            <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => { setToDate(e.target.value); resetPage(); }} className="px-2 py-1.5 rounded-xl border border-slate-200 text-xs" />
          </div>
          {!teamMode && (
            <div className="ml-auto flex items-center gap-1.5">
              <Btn onClick={exportPdf}>
                <Printer className="w-3.5 h-3.5" /> PDF
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
                <Download className="w-3.5 h-3.5" /> Excel
              </Btn>
            </div>
          )}
        </div>
        {exportError && <p className="text-xs text-rose-600">{exportError}</p>}
        {error && <p className="text-xs text-rose-600">{errMessage(error)}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Request No.</th>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Leave Type</th>
                <th className="py-2.5 px-3">Dates</th>
                <th className="py-2.5 px-3">Days</th>
                <th className="py-2.5 px-3">Bal. After</th>
                <th className="py-2.5 px-3">Applied</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    {tab === 'Pending' && !counter && !search && !typeId && !depId && !empId && !fromDate && !toDate
                      ? 'No leave requests waiting for you'
                      : 'No leave requests match your filters'}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const review = !teamMode && (r.status === 'PENDING' || r.status === 'CANCELLATION_REQUESTED');
                  return (
                    <tr key={r.request_id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">{r.request_no}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{r.employee_name}</div>
                        <div className="text-[11px] text-slate-400">{r.department_name || '—'}</div>
                        {r.is_short_notice && <div className="mt-1"><ShortNoticeTag /></div>}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-800">{r.leave_type_name}</div>
                        <div className="mt-0.5"><PaidTag paid={r.is_paid} /></div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{dateRangeLabel(r.from_date, r.to_date, r.duration)}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{fmtDays(r.leave_days)}</td>
                      <td className="py-3 px-3 text-slate-700">
                        {r.balance_after === null || r.balance_after === undefined ? '—' : fmtDays(r.balance_after)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{appliedLabel(r.applied_at)}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={r.status} label={r.status_label} />
                        {r.is_self_approved && <div className="text-[10px] text-slate-400 mt-0.5">● Self-approved</div>}
                      </td>
                      <td className="py-3 px-3">
                        <button type="button" onClick={() => setViewId(r.request_id)} className="font-semibold text-blue-600 hover:underline cursor-pointer">
                          {review ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 cursor-pointer">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2">{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

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
