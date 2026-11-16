import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Eye, Search, FileText, AlertTriangle, MoreVertical, Check, X, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { approveRegularizationRequest, fetchAttendanceDashboard, fetchEmployeeAttendanceDashboard, fetchRegularizations, rejectRegularizationRequest } from '../api/attendance.api';
import { localToday } from '@/shared/utils/schedule.utils';
import type { AttendanceRegularization, DayRecord } from '../types/attendance.types';
import { AddRegularizationModal } from './AddRegularizationModal';
import { RegularizationDetailModal } from './RegularizationDetailModal';
import { Pagination } from '@/shared/ui/Pagination';
import { RequestedTimes, StatusPill, TypeChip, formatDay, submittedOn } from './regularization-ui';

/** The "⋮" menu of a row: opens beside the button and above every other layer, so the table never clips it. */
const RowMenu: React.FC<{
  label: string;
  items: Array<{ key: string; label: string; icon: React.ReactNode; tone?: 'default' | 'good' | 'bad'; onClick: () => void }>;
}> = ({ label, items }) => {
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (button.current?.contains(t) || menu.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [at]);

  const tone = { default: 'text-slate-700 hover:bg-slate-50', good: 'text-emerald-700 hover:bg-emerald-50', bad: 'text-rose-600 hover:bg-rose-50' };

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(at)}
        onClick={(e) => {
          e.stopPropagation();
          if (at) return setAt(null);
          const r = button.current!.getBoundingClientRect();
          setAt({ top: r.bottom + 6, right: window.innerWidth - r.right });
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {at &&
        createPortal(
          <div ref={menu} role="menu" style={{ position: 'fixed', top: at.top, right: at.right, zIndex: 120 }} className="w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setAt(null);
                  it.onClick();
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium cursor-pointer ${tone[it.tone ?? 'default']}`}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

const TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled'] as const;
type Tab = (typeof TABS)[number];

export const MyRegularizationsPanel: React.FC<{
  /** An administrator looking at somebody else: show that employee's requests instead */
  viewing?: { emp_id: number; name: string } | null;
}> = ({ viewing }) => {
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<AttendanceRegularization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { user } = useAuth();
  const canApprove = Boolean(user?.access?.can_manage_organization);
  /** Approve or reject straight from the row; a rejection needs a reason. */
  const [decision, setDecision] = useState<{ r: AttendanceRegularization; kind: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  /** The day to open the form on: set from "days that need attention", empty for "Add new" (today). */
  const [addDate, setAddDate] = useState<string | null>(null);
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRegularization | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      setRequests(await fetchRegularizations(viewing ? { emp_id: viewing.emp_id } : { scope: 'me' }));
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [viewing?.emp_id]);

  // The last two months of the person's days, to find the ones with a punch missing
  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const months = [0, 1].map((back) => {
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    Promise.all(months.map((m) => (viewing ? fetchEmployeeAttendanceDashboard(viewing.emp_id, m) : fetchAttendanceDashboard(m)).then((r) => r.records ?? []).catch(() => [] as DayRecord[])))
      .then((lists) => !cancelled && setRecords(lists.flat()));
    return () => {
      cancelled = true;
    };
  }, [viewing?.emp_id, requests.length]);

  /** Past working days where the check-out is missing or nothing was punched, and no request is open or approved yet. */
  const missed = useMemo(() => {
    const today = localToday();
    const handled = new Set(requests.filter((r) => r.status === 'pending' || r.status === 'approved').map((r) => r.workDate.slice(0, 10)));
    return records
      .filter((r) => r.date < today && !r.is_today && (r.status === 'incomplete' || r.status === 'absent') && !handled.has(r.date))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 10);
  }, [records, requests]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: requests.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    for (const r of requests) if (r.status in c) c[r.status as Tab]++;
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (!q) return true;
      return [r.requestId, r.requestType, r.reason, r.workDate].some((v) => (v ?? '').toLowerCase().includes(q));
    });
  }, [requests, tab, search]);

  useEffect(() => setPage(1), [tab, search, pageSize, viewing?.emp_id]);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const open = (r: AttendanceRegularization) => {
    setSelectedRequest(r);
    setIsDetailOpen(true);
  };

  /** The row's menu: View for everyone, Approve and Reject for an administrator on someone else's pending request. */
  const menuFor = (r: AttendanceRegularization) => {
    const items: Array<{ key: string; label: string; icon: React.ReactNode; tone?: 'default' | 'good' | 'bad'; onClick: () => void }> = [
      { key: 'view', label: 'View details', icon: <Eye className="h-4 w-4" />, onClick: () => open(r) },
    ];
    if (canApprove && r.status === 'pending' && r.empId !== user?.emp_id) {
      items.push(
        { key: 'approve', label: 'Approve', icon: <Check className="h-4 w-4" />, tone: 'good', onClick: () => startDecision(r, 'approve') },
        { key: 'reject', label: 'Reject', icon: <X className="h-4 w-4" />, tone: 'bad', onClick: () => startDecision(r, 'reject') },
      );
    }
    return items;
  };

  const startDecision = (r: AttendanceRegularization, kind: 'approve' | 'reject') => {
    setComment('');
    setDecisionError(null);
    setDecision({ r, kind });
  };

  const confirmDecision = async () => {
    if (!decision) return;
    if (decision.kind === 'reject' && comment.trim().length < 3) {
      setDecisionError('Please write the reason for rejecting, so the employee knows what to fix.');
      return;
    }
    setDeciding(true);
    setDecisionError(null);
    try {
      if (decision.kind === 'approve') await approveRegularizationRequest(decision.r.correctionId, comment.trim() || undefined);
      else await rejectRegularizationRequest(decision.r.correctionId, comment.trim());
      setNotice(`${decision.r.requestId} ${decision.kind === 'approve' ? 'approved' : 'rejected'}. ${decision.r.employeeName ?? 'The employee'} has been notified.`);
      window.setTimeout(() => setNotice(null), 4500);
      setDecision(null);
      await loadRequests();
    } catch (err) {
      const e = err as { detail?: string; message?: string } | null;
      setDecisionError(e?.detail || e?.message || 'That did not work. Please try again.');
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-[color:var(--ac-main,#5B4CF8)]">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {viewing ? `${viewing.name}'s regularizations` : 'My regularizations'}
            </h2>
            <p className="text-xs text-slate-500">
              {viewing ? 'Requests this employee has raised for missing or wrong punches.' : 'Request a correction when a punch is missing or wrong.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setAddDate(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[color:var(--ac-main,#1471DD)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0F5FBF] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {viewing ? 'Add for employee' : 'Add new'}
        </button>
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Requests at a glance">
        {([
          ['Pending', counts.pending, 'pending', Clock, 'bg-amber-50 text-amber-700 ring-amber-100'],
          ['Approved', counts.approved, 'approved', CheckCircle2, 'bg-emerald-50 text-emerald-700 ring-emerald-100'],
          ['Rejected', counts.rejected, 'rejected', XCircle, 'bg-rose-50 text-rose-700 ring-rose-100'],
          ['All requests', counts.all, 'all', FileText, 'bg-slate-50 text-slate-600 ring-slate-200'],
        ] as const).map(([label, n, target, Icon, cls]) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(target)}
            className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 cursor-pointer ${tab === target ? 'ring-2 !ring-[color:var(--ac-main,#5B4CF8)]' : ''}`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${cls}`}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span>
              <span className="block text-xl font-bold leading-6 tabular-nums text-slate-900">{n}</span>
              <span className="block text-xs font-medium text-slate-500">{label}</span>
            </span>
          </button>
        ))}
      </div>

      {missed.length > 0 && (
        <section aria-label="Days that need a regularization" className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60">
          <header className="flex items-center gap-2.5 border-b border-amber-200/70 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">
                {missed.length} {missed.length === 1 ? 'day needs' : 'days need'} a regularization
              </h3>
              <p className="text-xs text-slate-600">{viewing ? 'A punch is missing on these days.' : 'You forgot to punch on these days. Raise a request so they count.'}</p>
            </div>
          </header>
          <ul className="divide-y divide-amber-200/60">
            {missed.map((d) => {
              const day = formatDay(d.date);
              const none = d.status === 'absent';
              return (
                <li key={d.date} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5">
                  <span className="w-36 shrink-0 text-[13px] font-semibold text-slate-900">
                    {day.date} <span className="font-normal text-slate-500">· {day.weekday}</span>
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] text-slate-700">
                    {none ? (
                      <>No check-in or check-out recorded</>
                    ) : (
                      <>
                        Checked in at <b className="font-semibold">{d.punch_in ?? '—'}</b> · <span className="font-semibold text-rose-600">check-out not recorded</span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAddDate(d.date);
                      setIsAddOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 cursor-pointer"
                  >
                    Regularize
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#E4E8EF] bg-white shadow-sm">
        {/* status tabs with counts + search */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-2 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Request status" className="-mb-px flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-semibold capitalize transition-colors cursor-pointer ${
                  tab === t ? 'border-[color:var(--ac-main,#5B4CF8)] text-[color:var(--ac-main,#5B4CF8)]' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {t}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === t ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{counts[t]}</span>
              </button>
            ))}
          </div>
          <div className="relative pb-3 lg:pb-0 lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-[calc(50%-6px)] h-4 w-4 -translate-y-1/2 text-slate-400 lg:top-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request, type or reason"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[color:var(--ac-main,#5B4CF8)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ac-main-rgb,91_76_248)/0.15)]"
            />
          </div>
        </div>

        {/* table from tablet up */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 pl-5 pr-4">Request</th>
                <th className="px-4 py-3">Attendance date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Requested in → out</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="py-3 pl-4 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-14 text-center text-slate-400">Loading requests…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="py-14 text-center text-slate-400">No regularization requests found.</td></tr>
              ) : (
                rows.map((r) => {
                  const day = formatDay(r.workDate);
                  return (
                    <tr key={r.correctionId} onClick={() => open(r)} className="h-[56px] cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                      <td className="py-2 pl-5 pr-4 text-[13px] font-semibold text-slate-900">{r.requestId}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-[13px] text-slate-800">
                        {day.date} <span className="text-slate-400">· {day.weekday}</span>
                      </td>
                      <td className="px-4 py-2"><TypeChip type={r.requestType} /></td>
                      <td className="px-4 py-2 text-[13px]"><RequestedTimes r={r} /></td>
                      <td className="max-w-[220px] truncate px-4 py-2 text-[13px] text-slate-600" title={r.reason}>{r.reason}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-[13px] text-slate-500">{submittedOn(r)}</td>
                      <td className="px-4 py-2"><StatusPill status={r.status} /></td>
                      <td className="whitespace-nowrap py-2 pl-4 pr-5 text-right">
                        <RowMenu label={r.requestId} items={menuFor(r)} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* cards on phones */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {isLoading ? (
            <li className="py-12 text-center text-sm text-slate-400">Loading requests…</li>
          ) : rows.length === 0 ? (
            <li className="py-12 text-center text-sm text-slate-400">No regularization requests found.</li>
          ) : (
            rows.map((r) => {
              const day = formatDay(r.workDate);
              return (
                <li key={r.correctionId}>
                  <button type="button" onClick={() => open(r)} className="block w-full space-y-2 px-4 py-3.5 text-left active:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{r.requestId}</span>
                      <StatusPill status={r.status} />
                    </div>
                    <div className="text-[13px] text-slate-700">{day.date} <span className="text-slate-400">· {day.weekday}</span></div>
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <TypeChip type={r.requestType} />
                      <RequestedTimes r={r} />
                    </div>
                    {r.reason && <p className="line-clamp-2 text-xs text-slate-500">{r.reason}</p>}
                  </button>
                  {canApprove && r.status === 'pending' && r.empId !== user?.emp_id && (
                    <div className="flex gap-2 px-4 pb-3.5">
                      <button type="button" onClick={() => startDecision(r, 'approve')} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve</button>
                      <button type="button" onClick={() => startDecision(r, 'reject')} className="flex-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600">Reject</button>
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>

        {!isLoading && filtered.length > 0 && (
          <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>

      <AddRegularizationModal
        isOpen={isAddOpen}
        empId={viewing?.emp_id}
        initialDate={addDate ?? localToday()}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => loadRequests()}
      />

      {decision &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={decision.kind === 'approve' ? 'Approve request' : 'Reject request'} className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => !deciding && setDecision(null)} />
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${decision.kind === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {decision.kind === 'approve' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">{decision.kind === 'approve' ? 'Approve this request?' : 'Reject this request?'}</h3>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    {decision.r.requestId} · {decision.r.employeeName ?? 'Employee'} · {formatDay(decision.r.workDate).date}
                  </p>
                  <p className="mt-2 text-[13px] text-slate-700">
                    <span className="text-slate-500">Day after approval: </span>
                    <RequestedTimes r={decision.r} />
                  </p>
                </div>
              </div>
              <div className="px-5 py-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {decision.kind === 'approve' ? 'Comment (optional)' : 'Reason for rejecting'} {decision.kind === 'reject' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  autoFocus
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={decision.kind === 'approve' ? 'Add a note for the employee…' : 'Tell the employee what to correct…'}
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-[13px] text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                {decisionError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{decisionError}</p>}
              </div>
              <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-5 py-3">
                <button type="button" disabled={deciding} onClick={() => setDecision(null)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deciding}
                  onClick={confirmDecision}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60 cursor-pointer ${decision.kind === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  {deciding && <Loader2 className="h-4 w-4 animate-spin" />}
                  {decision.kind === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <RegularizationDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRequest(null);
        }}
        onSuccess={() => loadRequests()}
        regularization={selectedRequest}
        isApproverView={false}
      />
    </div>
  );
};
