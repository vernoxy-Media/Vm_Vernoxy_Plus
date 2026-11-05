import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, History, FileText, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  BalanceCard,
  LeaveRequestItem,
  useLeaveLookupsQuery,
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
} from '../components/leave-ui';

const PAGE_SIZE = 20;

export interface MyLeavePageProps {
  hideBreadcrumb?: boolean;
}

export const BalanceCardView: React.FC<{ b: BalanceCard }> = ({ b }) => {
  const c = colorStyle(b.calendar_color);
  const parts: string[] = [];
  if (b.balance_tracked) {
    parts.push(`${fmtDays(b.credited)} credited`);
    parts.push(`${fmtDays(b.taken)} taken`);
    if (b.approved_ahead) parts.push(`${fmtDays(b.approved_ahead)} approved ahead`);
    if (b.pending) parts.push(`${fmtDays(b.pending)} pending`);
  } else {
    parts.push(b.is_paid ? 'Paid' : 'Unpaid');
    parts.push(`${fmtDays(b.taken + b.approved_ahead)} taken`);
    if (b.pending) parts.push(`${fmtDays(b.pending)} pending`);
  }
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${c.bar}`} />
      <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
        {b.balance_tracked ? fmtDays(b.available) : 'No limit'}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span className="text-xs font-bold text-slate-800">{b.leave_type_name}</span>
        <PaidTag paid={b.is_paid} />
      </div>
      <div className="mt-1 text-[11px] text-slate-500 leading-snug">{parts.join(' · ')}</div>
      {b.is_comp_off && (
        <div className="mt-1 text-[11px] text-purple-700">
          {b.nearest_expiry ? `Expires ${fmtDate(b.nearest_expiry)}` : 'No Comp-off to expire'}
        </div>
      )}
    </div>
  );
};

export const MyLeavePage: React.FC<MyLeavePageProps> = ({ hideBreadcrumb = false }) => {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useMyLeaveQuery(year);
  const { data: lookups } = useLeaveLookupsQuery();

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
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const hasFilters = typeFilter !== 'ALL' || statusFilter !== 'ALL';

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  return (
    <div className="w-full space-y-5">
      {!hideBreadcrumb && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Leave</span>
          <span className="text-slate-300">&gt;</span>
          <span className="font-semibold text-slate-700">My Leave</span>
        </div>
      )}

      {/* 1 Page title · 2 + Apply Leave */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Leave</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {data?.has_policy ? `${data.policy_name} · Leave year ${data.leave_year_label}` : 'No leave policy assigned'}
          </p>
        </div>
        <Btn variant="primary" onClick={() => setApplyOpen(true)} disabled={!data?.can_apply} title={data?.can_apply ? '' : 'Apply Leave is not available'}>
          <Plus className="w-4 h-4" /> Apply Leave
        </Btn>
      </div>

      {toast && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{errMessage(error)}</div>}

      {data && !data.has_policy && (
        <div className="flex items-start gap-2 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No leave policy is assigned to you. Please contact the Admin.
        </div>
      )}

      {/* 3 Available balance */}
      {data?.has_policy && (
        <div>
          <h2 className="text-xs font-bold text-slate-700 mb-2">Available balance</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {data.balances.map((b) => (
              <BalanceCardView key={b.leave_type_id} b={b} />
            ))}
          </div>
        </div>
      )}

      {/* Requests */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
        {/* 4 Filters · 5 Leave Ledger */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={year ?? data?.leave_year ?? ''}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
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
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Leave Type: All</option>
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Status: All</option>
            {(lookups?.leave_request_status || []).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setLedgerOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <History className="w-4 h-4" /> Leave Ledger
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Request No.</th>
                <th className="py-2.5 px-3">Leave Type</th>
                <th className="py-2.5 px-3">Dates</th>
                <th className="py-2.5 px-3">Days</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">Loading…</td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    {hasFilters ? (
                      <p className="text-slate-600">
                        No leave requests match your filters.{' '}
                        <button
                          type="button"
                          className="text-blue-600 font-semibold hover:underline cursor-pointer"
                          onClick={() => {
                            setTypeFilter('ALL');
                            setStatusFilter('ALL');
                          }}
                        >
                          Clear filters
                        </button>
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-slate-600">You have not applied for leave yet.</p>
                        {data?.can_apply && (
                          <Btn variant="primary" onClick={() => setApplyOpen(true)}>
                            <Plus className="w-4 h-4" /> Apply Leave
                          </Btn>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.request_id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">{r.request_no}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-800">
                        {r.leave_type_name} <PaidTag paid={r.is_paid} />
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {dateRangeLabel(r.from_date, r.to_date, r.duration)}
                      {r.from_date !== r.to_date && r.duration !== 'FULL_DAY' && ` (${durationLabel(r.duration)})`}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{fmtDays(r.leave_days)}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={r.status} label={r.status_label} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <button type="button" onClick={() => setViewId(r.request_id)} className="font-semibold text-blue-600 hover:underline cursor-pointer">
                        View
                      </button>
                      {r.can_withdraw && (
                        <>
                          <span className="text-slate-300"> · </span>
                          <button
                            type="button"
                            onClick={() => {
                              setWithdrawItem(r);
                              setReasonText('');
                              setReasonErr('');
                            }}
                            className="font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            Withdraw
                          </button>
                        </>
                      )}
                      {r.can_request_cancellation && (
                        <>
                          <span className="text-slate-300"> · </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCancelItem(r);
                              setReasonText('');
                              setReasonErr('');
                            }}
                            className="font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            Request cancellation
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 cursor-pointer">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2">
                {current} / {totalPages}
              </span>
              <button type="button" disabled={current >= totalPages} onClick={() => setPage(current + 1)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center disabled:opacity-40 cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

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
