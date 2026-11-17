import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, Eye, Undo2 } from 'lucide-react';
import { Pagination } from '@/shared/ui/Pagination';
import { RowActionsMenu, type RowAction } from '@/shared/ui/RowActionsMenu';
import {
  Plus,
  History,
  FileText,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  CalendarCheck,
  Hourglass,
  Wallet,
  Infinity as InfinityIcon,
  UserCheck,
} from 'lucide-react';
import { KpiStat } from '@/shared/ui/dashboard/DashboardShell';
import { BalanceRing, whenLabel } from '../components/leave-visuals';
import {
  BalanceCard,
  LeaveRequestItem,
  useMyLeaveQuery,
  useRequestLeaveCancellationMutation,
  useWithdrawLeaveMutation,
} from '../hooks/use-leave';
import { ApplyLeaveModal } from '../components/ApplyLeaveModal';
import { LeaveRequestDetailsModal } from '../components/LeaveRequestDetailsModal';
import { LeaveLedgerModal } from '../components/LeaveLedgerModal';
import {
  Btn,
  FieldError,
  Modal,
  PaidTag,
  StatusBadge,
  colorStyle,
  dateRangeLabel,
  durationLabel,
  errMessage,
  fmtDate,
  fmtDays,
  fmtDayMonth,
  todayYmd,
} from '../components/leave-ui';


export interface MyLeavePageProps {
  hideBreadcrumb?: boolean;
}

export const BalanceCardView: React.FC<{ b: BalanceCard }> = ({ b }) => {
  const c = colorStyle(b.calendar_color);
  const tracked = b.balance_tracked;
  const credited = b.credited ?? 0;
  const available = b.available ?? 0;
  // Less than a sixth left of what was given
  const low = tracked && credited > 0 && available > 0 && available / credited <= 0.17;
  const empty = tracked && credited > 0 && available <= 0;
  const used = b.taken + b.approved_ahead;
  return (
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md">
      <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${c.bar}`} />
      {tracked ? (
        <BalanceRing value={available} total={credited} tone={b.calendar_color} label={`${fmtDays(available)} of ${fmtDays(credited)} days left`}>
          <span className="text-[15px] font-extrabold leading-none tabular-nums text-slate-900">{fmtDays(available)}</span>
        </BalanceRing>
      ) : (
        <span className={`flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full ${c.soft} ${c.text}`}>
          <InfinityIcon className="h-7 w-7" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-bold text-slate-900">{b.leave_type_name}</span>
          <PaidTag paid={b.is_paid} />
          {low && <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Running low</span>}
          {empty && <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">None left</span>}
        </div>
        {tracked ? (
          <>
            <p className="mt-0.5 text-[11px] text-slate-500">{fmtDays(available)} days left of {fmtDays(credited)}</p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <dt className="text-slate-400">Used</dt>
                <dd className="font-semibold tabular-nums text-slate-800">{fmtDays(used)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Pending</dt>
                <dd className={`font-semibold tabular-nums ${b.pending ? 'text-amber-700' : 'text-slate-800'}`}>{fmtDays(b.pending)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Ahead</dt>
                <dd className="font-semibold tabular-nums text-slate-800">{fmtDays(b.approved_ahead)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="mt-0.5 text-[11px] text-slate-500">
            No limit · {fmtDays(used)} taken{b.pending ? ` · ${fmtDays(b.pending)} pending` : ''}
          </p>
        )}
        {b.is_comp_off && (
          <p className="mt-1 text-[11px] text-purple-700">{b.nearest_expiry ? `Expires ${fmtDate(b.nearest_expiry)}` : 'No Comp-off to expire'}</p>
        )}
      </div>
    </div>
  );
};

export const MyLeavePage: React.FC<MyLeavePageProps> = ({ hideBreadcrumb = false }) => {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading, error } = useMyLeaveQuery(year);

  const [applyOpen, setApplyOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);
  const [withdrawItem, setWithdrawItem] = useState<LeaveRequestItem | null>(null);
  const [cancelItem, setCancelItem] = useState<LeaveRequestItem | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const [toast, setToast] = useState('');

  const withdrawMut = useWithdrawLeaveMutation();
  const reqCancelMut = useRequestLeaveCancellationMutation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Dashboard shortcut: /leave?apply=1 opens the Apply Leave form.
  useEffect(() => {
    if (searchParams.get('apply') === '1' && data?.can_apply) {
      setApplyOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('apply');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, data?.can_apply, setSearchParams]);

  const requests = data?.requests || [];
  const typeOptions = useMemo(() => {
    const map = new Map<number, string>();
    (data?.balances || []).forEach((b) => map.set(b.leave_type_id, b.leave_type_name));
    requests.forEach((r) => map.set(r.leave_type_id, r.leave_type_name));
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [data, requests]);

  const filtered = useMemo(
    () =>
      requests.filter(
        (r) =>
          (typeFilter === 'ALL' || r.leave_type_id === typeFilter) &&
          (statusFilter === 'ALL' || r.status === statusFilter),
      ),
    [requests, typeFilter, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const hasFilters = typeFilter !== 'ALL' || statusFilter !== 'ALL';

  const today = todayYmd();
  const isActive = data?.employee?.status === 'Active';
  // Why Apply Leave is off, in words
  const cannotApplyReason = !data
    ? ''
    : !data.has_policy
      ? 'No leave policy is assigned to you yet. Ask the Admin to assign one, then you can apply.'
      : !isActive
        ? 'Your account is not active, so you cannot apply for leave.'
        : !data.can_apply
          ? 'Apply Leave is not available right now.'
          : '';

  const summary = useMemo(() => {
    const balances = data?.balances || [];
    const paidTracked = balances.filter((b) => b.balance_tracked && b.is_paid);
    const available = paidTracked.reduce((n, b) => n + (b.available ?? 0), 0);
    const taken = balances.reduce((n, b) => n + b.taken, 0);
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const upcoming = requests
      .filter((r) => r.status === 'APPROVED' && r.to_date.slice(0, 10) >= today)
      .sort((x, y) => x.from_date.localeCompare(y.from_date))[0];
    return { available, taken, pending, upcoming };
  }, [data, requests, today]);

  // Request status chips, each with how many requests it holds (after the leave type filter)
  const statusChips = useMemo(() => {
    const inScope = requests.filter((r) => typeFilter === 'ALL' || r.leave_type_id === typeFilter);
    const counts = new Map<string, { label: string; n: number }>();
    for (const r of inScope) {
      const hit = counts.get(r.status) ?? { label: r.status_label, n: 0 };
      hit.n += 1;
      counts.set(r.status, hit);
    }
    return { total: inScope.length, list: Array.from(counts.entries()).map(([value, v]) => ({ value, ...v })) };
  }, [requests, typeFilter]);

  const sortedRows = useMemo(
    () => [...filtered].sort((x, y) => y.from_date.localeCompare(x.from_date) || y.request_id - x.request_id),
    [filtered],
  );
  const shownRows = sortedRows.slice((current - 1) * pageSize, current * pageSize);

  // Row menu (⋮): View, and Withdraw / Request cancellation when the request allows it.
  const rowActions = (r: LeaveRequestItem) => {
    const actions: RowAction[] = [{ label: 'View details', icon: Eye, onClick: () => setViewId(r.request_id) }];
    if (r.can_withdraw) {
      actions.push({
        label: 'Withdraw',
        icon: Undo2,
        danger: true,
        onClick: () => {
          setWithdrawItem(r);
          setReasonText('');
          setReasonErr('');
        },
      });
    }
    if (r.can_request_cancellation) {
      actions.push({
        label: 'Request cancellation',
        icon: Ban,
        danger: true,
        onClick: () => {
          setCancelItem(r);
          setReasonText('');
          setReasonErr('');
        },
      });
    }
    return <RowActionsMenu label={`Actions for ${r.request_no}`} actions={actions} />;
  };
  const whenNote = (r: LeaveRequestItem) =>
    r.status === 'APPROVED' ? <span className="text-[11px] font-medium text-emerald-700">{whenLabel(r.from_date.slice(0, 10), r.to_date.slice(0, 10), today)}</span> : null;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  return (
    <div className="w-full space-y-5">
      {/* Title, policy and the two main actions */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-blue-50 via-white to-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {!hideBreadcrumb && (
              <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
                <span>Leave</span>
                <span className="text-slate-300">&gt;</span>
                <span className="font-semibold text-slate-700">My Leave</span>
              </div>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">My Leave</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {data?.has_policy ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                    <FileText className="h-3.5 w-3.5" /> {data.policy_name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Leave year {data.leave_year_label}
                  </span>
                  {data.employee.reporting_manager_name && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" /> Approver: {data.employee.reporting_manager_name}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-500">{data ? 'No leave policy assigned' : 'Loading…'}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={() => setLedgerOpen(true)} disabled={!data}>
              <History className="h-4 w-4" /> Leave ledger
            </Btn>
            <Btn variant="primary" onClick={() => setApplyOpen(true)} disabled={!data?.can_apply} title={cannotApplyReason || undefined} className="h-10 px-5">
              <Plus className="h-4 w-4" /> Apply Leave
            </Btn>
          </div>
        </div>
      </section>

      {toast && (
        <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {toast}
        </div>
      )}
      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{errMessage(error)}</div>}

      {cannotApplyReason && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">You cannot apply for leave yet</p>
            <p className="mt-0.5 text-amber-800">{cannotApplyReason}</p>
          </div>
        </div>
      )}

      {/* The numbers that matter */}
      {data?.has_policy && (
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
          <KpiStat label="Paid days left" value={fmtDays(summary.available)} hint="Across leave with a balance" icon={Wallet} tone="emerald" />
          <KpiStat label="Taken this year" value={fmtDays(summary.taken)} hint={`Leave year ${data.leave_year_label}`} icon={CalendarDays} tone="blue" />
          <KpiStat label="Waiting for approval" value={summary.pending} hint={summary.pending ? 'Pending requests' : 'Nothing pending'} icon={Hourglass} tone={summary.pending ? 'amber' : 'slate'} />
          <KpiStat
            label="Next leave"
            value={summary.upcoming ? fmtDayMonth(summary.upcoming.from_date) : 'None'}
            hint={summary.upcoming ? `${whenLabel(summary.upcoming.from_date.slice(0, 10), summary.upcoming.to_date.slice(0, 10), today)} · ${fmtDays(summary.upcoming.leave_days)} days` : 'No approved leave ahead'}
            icon={CalendarCheck}
            tone="purple"
          />
        </div>
      )}

      {/* Balance of each leave type */}
      {data?.has_policy && data.balances.length > 0 && (
        <section aria-labelledby="leave-balances">
          <h2 id="leave-balances" className="mb-2.5 text-sm font-bold text-slate-800">Your balance</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data.balances.map((b) => (
              <BalanceCardView key={b.leave_type_id} b={b} />
            ))}
          </div>
        </section>
      )}

      {/* Requests */}
      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5" aria-labelledby="leave-requests">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="leave-requests" className="mr-auto text-sm font-bold text-slate-800">
            Leave requests <span className="ml-1 text-xs font-medium text-slate-400">{filtered.length}</span>
          </h2>
          <select
            value={year ?? data?.leave_year ?? ''}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Leave year"
            className="h-9 cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
          >
            {(data?.year_options || []).map((y) => (
              <option key={y.value} value={y.value}>
                Year: {y.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
              setPage(1);
            }}
            aria-label="Leave type"
            className="h-9 cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
          >
            <option value="ALL">Leave type: All</option>
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status chips with their counts */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Request status">
          {[{ value: 'ALL', label: 'All', n: statusChips.total }, ...statusChips.list].map((chip) => {
            const on = statusFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setStatusFilter(chip.value);
                  setPage(1);
                }}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  on ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                {chip.label}
                <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${on ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>{chip.n}</span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-2 py-2" aria-busy="true" aria-label="Loading requests">
            {[0, 1, 2].map((n) => (
              <div key={n} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : shownRows.length === 0 ? (
          <div className="py-12 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FileText className="h-6 w-6" />
            </span>
            {hasFilters ? (
              <p className="text-sm text-slate-600">
                No leave requests match your filters.{' '}
                <button
                  type="button"
                  className="cursor-pointer font-semibold text-blue-600 hover:underline"
                  onClick={() => {
                    setTypeFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                >
                  Clear filters
                </button>
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">You have not applied for leave yet.</p>
                {data?.can_apply && (
                  <Btn variant="primary" onClick={() => setApplyOpen(true)}>
                    <Plus className="h-4 w-4" /> Apply Leave
                  </Btn>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Phones: one card per request */}
            <ul className="space-y-2.5 md:hidden">
              {shownRows.map((r) => {
                const c = colorStyle(r.calendar_color);
                return (
                  <li key={r.request_id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5">
                    <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${c.bar}`} />
                    <div className="flex items-start justify-between gap-2 pl-1.5">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-slate-900">
                          {r.leave_type_name} <PaidTag paid={r.is_paid} />
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{r.request_no}</p>
                      </div>
                      <StatusBadge status={r.status} label={r.status_label} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 pl-1.5 text-xs">
                      <span className="text-slate-700">
                        {dateRangeLabel(r.from_date, r.to_date, r.duration)}
                        {r.from_date !== r.to_date && r.duration !== 'FULL_DAY' && ` (${durationLabel(r.duration)})`}
                      </span>
                      <b className="shrink-0 tabular-nums text-slate-900">{fmtDays(r.leave_days)} d</b>
                    </div>
                    {whenNote(r) && <div className="mt-1 pl-1.5">{whenNote(r)}</div>}
                    <div className="mt-2.5 border-t border-slate-100 pt-2 pl-1.5">{rowActions(r)}</div>
                  </li>
                );
              })}
            </ul>

            {/* Tablets and computers: a table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2.5">Request</th>
                    <th className="px-3 py-2.5">Leave type</th>
                    <th className="px-3 py-2.5">Dates</th>
                    <th className="px-3 py-2.5">Days</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shownRows.map((r) => {
                    const c = colorStyle(r.calendar_color);
                    return (
                      <tr key={r.request_id} className="transition-colors hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{r.request_no}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-2 text-slate-800">
                            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                            {r.leave_type_name} <PaidTag paid={r.is_paid} />
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                          {dateRangeLabel(r.from_date, r.to_date, r.duration)}
                          {r.from_date !== r.to_date && r.duration !== 'FULL_DAY' && ` (${durationLabel(r.duration)})`}
                          {whenNote(r) && <div className="mt-0.5">{whenNote(r)}</div>}
                        </td>
                        <td className="px-3 py-3 font-semibold tabular-nums text-slate-900">{fmtDays(r.leave_days)}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={r.status} label={r.status_label} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">{rowActions(r)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {filtered.length > 0 && (
          <Pagination
            page={current}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        )}
      </section>

      {data && (
        <ApplyLeaveModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          onSaved={(no) => flash(`Leave request ${no} submitted. The Admin has been told.`)}
          header={{
            name: data.employee.name,
            emp_code: data.employee.emp_code,
            department_name: data.employee.department_name,
            policy_name: data.policy_name,
          }}
          applyTypes={data.apply_types}
        />
      )}

      <LeaveRequestDetailsModal requestId={viewId} onClose={() => setViewId(null)} />

      {ledgerOpen && (
        <LeaveLedgerModal
          open
          onClose={() => setLedgerOpen(false)}
          yearOptions={data?.year_options}
          defaultYear={data?.leave_year}
          typeOptions={typeOptions}
          employeeName={data?.employee.name}
        />
      )}

      {/* Withdraw (reason optional) */}
      <Modal
        open={Boolean(withdrawItem)}
        onClose={() => setWithdrawItem(null)}
        width="max-w-md"
        title={`Withdraw ${withdrawItem?.request_no || ''}?`}
        subtitle={withdrawItem ? `${withdrawItem.leave_type_name} · ${dateRangeLabel(withdrawItem.from_date, withdrawItem.to_date, withdrawItem.duration)}` : ''}
        footer={
          <>
            <Btn onClick={() => setWithdrawItem(null)}>Keep request</Btn>
            <Btn
              variant="danger"
              loading={withdrawMut.isPending}
              onClick={async () => {
                if (!withdrawItem) return;
                try {
                  await withdrawMut.mutateAsync({ id: withdrawItem.request_id, reason: reasonText.trim() || undefined });
                  flash(`${withdrawItem.request_no} withdrawn. The booked days are back in your balance.`);
                  setWithdrawItem(null);
                } catch (e: any) {
                  setReasonErr(errMessage(e));
                }
              }}
            >
              Withdraw
            </Btn>
          </>
        }
      >
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
          Reason <span className="font-normal text-slate-400">optional</span>
        </label>
        <textarea rows={3} maxLength={500} value={reasonText} onChange={(e) => setReasonText(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
        <FieldError message={reasonErr} />
      </Modal>

      {/* Request cancellation (reason 10-500) */}
      <Modal
        open={Boolean(cancelItem)}
        onClose={() => setCancelItem(null)}
        width="max-w-md"
        title={`Request cancellation of ${cancelItem?.request_no || ''}`}
        subtitle="The leave stays Approved until the Admin decides."
        footer={
          <>
            <Btn onClick={() => setCancelItem(null)}>Close</Btn>
            <Btn
              variant="primary"
              loading={reqCancelMut.isPending}
              onClick={async () => {
                if (!cancelItem) return;
                const len = reasonText.trim().length;
                if (len < 10 || len > 500) {
                  setReasonErr('Please write a reason of 10 to 500 characters.');
                  return;
                }
                try {
                  await reqCancelMut.mutateAsync({ id: cancelItem.request_id, cancellation_reason: reasonText.trim() });
                  flash(`Cancellation of ${cancelItem.request_no} requested. The Admin has been told.`);
                  setCancelItem(null);
                } catch (e: any) {
                  setReasonErr(errMessage(e));
                }
              }}
            >
              Request cancellation
            </Btn>
          </>
        }
      >
        <p className="text-slate-600 mb-3">
          {cancelItem && `${cancelItem.leave_type_name}, ${dateRangeLabel(cancelItem.from_date, cancelItem.to_date, cancelItem.duration)} (${fmtDays(cancelItem.leave_days)} days). Only the whole request can be cancelled.`}
        </p>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
          Reason <span className="text-rose-500">*</span> <span className="font-normal text-slate-400">10 to 500 characters</span>
        </label>
        <textarea
          rows={3}
          maxLength={500}
          value={reasonText}
          onChange={(e) => {
            setReasonText(e.target.value);
            setReasonErr('');
          }}
          className={`w-full px-3 py-2 rounded-xl border text-xs ${reasonErr ? 'border-rose-300' : 'border-slate-200'}`}
        />
        <FieldError message={reasonErr} />
      </Modal>
    </div>
  );
};
