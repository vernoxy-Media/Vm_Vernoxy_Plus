import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, Paperclip, ExternalLink, Loader2 } from 'lucide-react';
import {
  useAdminCancelLeaveMutation,
  useApproveLeaveRequestMutation,
  useDecideLeaveCancellationMutation,
  useLeaveRequestDetailsQuery,
  useRejectLeaveRequestMutation,
  useRequestLeaveCancellationMutation,
  useWithdrawLeaveMutation,
} from '../hooks/use-leave';
import {
  Btn,
  FieldError,
  Modal,
  PaidTag,
  ShortNoticeTag,
  StatusBadge,
  dateRangeLabel,
  durationLabel,
  errMessage,
  fmtDateTime,
  fmtDays,
  fmtWeekday,
} from './leave-ui';

type Pending = null | 'approve' | 'reject' | 'agree' | 'keep' | 'cancel' | 'withdraw' | 'request_cancel';

export const LeaveRequestDetailsModal: React.FC<{ requestId: number | null; onClose: () => void }> = ({ requestId, onClose }) => {
  const { data, isLoading, error } = useLeaveRequestDetailsQuery(requestId);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Pending>(null);
  const [message, setMessage] = useState('');
  const [fieldErr, setFieldErr] = useState('');

  const approveMut = useApproveLeaveRequestMutation();
  const rejectMut = useRejectLeaveRequestMutation();
  const decideMut = useDecideLeaveCancellationMutation();
  const cancelMut = useAdminCancelLeaveMutation();
  const withdrawMut = useWithdrawLeaveMutation();
  const reqCancelMut = useRequestLeaveCancellationMutation();

  useEffect(() => {
    setText('');
    setMode(null);
    setMessage('');
    setFieldErr('');
  }, [requestId]);

  if (!requestId) return null;
  const busy =
    approveMut.isPending || rejectMut.isPending || decideMut.isPending || cancelMut.isPending || withdrawMut.isPending || reqCancelMut.isPending;

  const run = async (fn: () => Promise<any>, closeAfter = false) => {
    setMessage('');
    setFieldErr('');
    try {
      await fn();
      setText('');
      setMode(null);
      if (closeAfter) onClose();
    } catch (err: any) {
      setMessage(errMessage(err));
    }
  };

  const r = data?.request;
  const a = data?.actions;
  const isAdminView = data?.viewer_role === 'ADMIN';

  // What the text box is for, depending on status / chosen action
  let textLabel = '';
  let textHint = '';
  if (a?.can_approve || a?.can_reject) {
    textLabel = 'Remarks to the employee';
    textHint = 'optional to approve, required to reject';
  } else if (a?.can_agree_cancel || a?.can_keep_leave) {
    textLabel = 'Remarks to the employee';
    textHint = 'required to keep the leave';
  } else if (mode === 'cancel') {
    textLabel = 'Reason for cancelling';
    textHint = 'required';
  } else if (mode === 'withdraw') {
    textLabel = 'Reason';
    textHint = 'optional';
  } else if (mode === 'request_cancel') {
    textLabel = 'Reason for cancellation';
    textHint = '10 to 500 characters';
  }

  const need = (cond: boolean, msg: string) => {
    if (cond) {
      setFieldErr(msg);
      return true;
    }
    return false;
  };

  const footer = r && a && (
    <>
      {a.own_leave_note && <span className="mr-auto self-center text-[11px] text-slate-500">{a.own_leave_note}</span>}
      <Btn onClick={onClose}>Close</Btn>
      {a.can_withdraw && (
        <Btn
          variant="danger"
          loading={withdrawMut.isPending}
          onClick={() =>
            mode !== 'withdraw' ? setMode('withdraw') : run(() => withdrawMut.mutateAsync({ id: r.request_id, reason: text.trim() || undefined }))
          }
        >
          {mode === 'withdraw' ? 'Confirm Withdraw' : 'Withdraw'}
        </Btn>
      )}
      {a.can_request_cancellation && (
        <Btn
          variant="danger"
          loading={reqCancelMut.isPending}
          onClick={() => {
            if (mode !== 'request_cancel') return setMode('request_cancel');
            const len = text.trim().length;
            if (need(len < 10 || len > 500, 'Please write a reason of 10 to 500 characters.')) return;
            run(() => reqCancelMut.mutateAsync({ id: r.request_id, cancellation_reason: text.trim() }));
          }}
        >
          {mode === 'request_cancel' ? 'Send cancellation request' : 'Request cancellation'}
        </Btn>
      )}
      {a.can_cancel_leave && (
        <Btn
          variant="danger"
          loading={cancelMut.isPending}
          onClick={() => {
            if (mode !== 'cancel') return setMode('cancel');
            if (need(text.trim().length < 3, 'Please write a reason (3 to 500 characters).')) return;
            run(() => cancelMut.mutateAsync({ id: r.request_id, reason: text.trim() }));
          }}
        >
          {mode === 'cancel' ? 'Confirm Cancel Leave' : 'Cancel Leave'}
        </Btn>
      )}
      {a.can_keep_leave && (
        <Btn
          loading={decideMut.isPending && mode === 'keep'}
          onClick={() => {
            if (need(!text.trim(), 'Remarks are required to keep the leave.')) return;
            setMode('keep');
            run(() => decideMut.mutateAsync({ id: r.request_id, agree: false, remarks: text.trim() }));
          }}
        >
          Keep leave
        </Btn>
      )}
      {a.can_agree_cancel && (
        <Btn
          variant="primary"
          loading={decideMut.isPending && mode === 'agree'}
          onClick={() => {
            setMode('agree');
            run(() => decideMut.mutateAsync({ id: r.request_id, agree: true, remarks: text.trim() || undefined }));
          }}
        >
          Agree to cancel
        </Btn>
      )}
      {a.can_reject && (
        <Btn
          variant="danger"
          loading={rejectMut.isPending}
          onClick={() => {
            if (need(!text.trim(), 'Remarks are required to reject a leave request.')) return;
            run(() => rejectMut.mutateAsync({ id: r.request_id, remarks: text.trim() }));
          }}
        >
          Reject
        </Btn>
      )}
      {a.can_approve && (
        <Btn variant="success" loading={approveMut.isPending} onClick={() => run(() => approveMut.mutateAsync({ id: r.request_id, remarks: text.trim() || undefined }))}>
          Approve
        </Btn>
      )}
    </>
  );

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-4xl"
      title={
        r ? (
          <span className="flex items-center gap-2">
            {r.request_no} <StatusBadge status={r.status} label={r.status_label} />
            {r.is_short_notice && <ShortNoticeTag />}
          </span>
        ) : (
          'Leave request'
        )
      }
      subtitle={
        r &&
        [
          r.employee_name,
          r.emp_code,
          r.department_name,
          r.reporting_manager_name ? `Reporting Manager: ${r.reporting_manager_name}` : null,
          `Applied ${fmtDateTime(r.applied_at)}`,
          r.added_by_admin ? `Added by ${r.applied_by_name || 'Admin'}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      }
      footer={footer}
    >
      {isLoading && (
        <div className="py-12 flex justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}
      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{errMessage(error)}</div>}

      {r && data && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: Request + remarks */}
          <div className="lg:col-span-3 space-y-4">
            {message && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{message}</div>}

            <section className="rounded-2xl border border-slate-200 p-4">
              <h4 className="font-bold text-slate-900 text-xs mb-2">Request</h4>
              <dl className="divide-y divide-slate-100">
                {[
                  ['Leave type', <span key="t" className="inline-flex items-center gap-1.5 font-semibold text-slate-800">{r.leave_type_name} <PaidTag paid={r.is_paid} /></span>],
                  ['Dates', `${dateRangeLabel(r.from_date, r.to_date)}, ${durationLabel(r.duration)}`],
                  [
                    'Leave days',
                    `${fmtDays(r.leave_days)}${r.excluded_notes?.length ? ` (${r.excluded_notes.join('; ')})` : ''}`,
                  ],
                  ['Days counted', r.days?.length ? r.days.map((d) => fmtWeekday(d.date)).join(', ') : '—'],
                  ['Reason', r.reason || '—'],
                  [
                    'Attachment',
                    r.attachment_url ? (
                      <a key="a" href={r.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline">
                        <Paperclip className="w-3.5 h-3.5" /> View attachment <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      '—'
                    ),
                  ],
                  ...(r.decision_remarks ? [['Remarks', r.decision_remarks] as [string, React.ReactNode]] : []),
                  ...(r.decided_by_name && r.decided_at
                    ? [[r.status === 'REJECTED' ? 'Rejected by' : 'Decided by', `${r.decided_by_name}, ${fmtDateTime(r.decided_at)}${r.is_self_approved ? ' (Self-approved)' : ''}`] as [string, React.ReactNode]]
                    : []),
                  ...(r.cancellation_reason ? [['Cancellation reason', r.cancellation_reason] as [string, React.ReactNode]] : []),
                  ...(r.cancellation_remarks ? [['Cancellation remarks', r.cancellation_remarks] as [string, React.ReactNode]] : []),
                ].map(([k, v], i) => (
                  <div key={i} className="py-2 grid grid-cols-3 gap-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="col-span-2 text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {textLabel && (
              <section>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {textLabel} <span className="font-normal text-slate-400">{textHint}</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setFieldErr('');
                  }}
                  disabled={busy}
                  className={`w-full px-3 py-2 rounded-xl border bg-white text-xs ${fieldErr ? 'border-rose-300' : 'border-slate-200'}`}
                  placeholder="Write a remark…"
                />
                <FieldError message={fieldErr} />
              </section>
            )}
          </div>

          {/* Right: Balance, Checks, History */}
          <div className="lg:col-span-2 space-y-4">
            {data.balance ? (
              <section className="rounded-2xl border border-slate-200 p-4">
                <h4 className="font-bold text-slate-900 text-xs mb-2">{r.leave_type_name} balance</h4>
                {[
                  ['Credited this year', data.balance.credited],
                  ['Taken', data.balance.taken],
                  ['This request', data.balance.this_request],
                  ...(data.balance.other_pending ? [['Other pending', data.balance.other_pending] as [string, number]] : []),
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between py-1 text-slate-600">
                    <span>{k}</span>
                    <span className="font-semibold text-slate-800">{fmtDays(Number(v))}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-1 border-t border-slate-100 font-bold text-slate-900">
                  <span>{r.status === 'PENDING' ? 'Balance after approval' : 'Available now'}</span>
                  <span>{fmtDays(r.status === 'PENDING' ? data.balance.balance_after_approval : data.balance.available)}</span>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-slate-200 p-4 text-slate-500">
                {r.leave_type_name}: no balance is kept (No limit).
              </section>
            )}

            {isAdminView || data.viewer_role === 'REPORTING_MANAGER' ? (
              <section className="rounded-2xl border border-slate-200 p-4">
                <h4 className="font-bold text-slate-900 text-xs mb-2">Checks on these dates</h4>
                <ul className="space-y-1.5">
                  {data.checks.map((c, i) => (
                    <li key={i} className={`flex items-start gap-1.5 ${c.info ? 'text-amber-700' : c.ok ? 'text-slate-700' : 'text-rose-700'}`}>
                      {c.info ? (
                        <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                      ) : c.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                      )}
                      <span>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 p-4">
              <h4 className="font-bold text-slate-900 text-xs mb-2">History</h4>
              <ol className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {data.history.length === 0 && <li className="text-slate-400">No events yet.</li>}
                {data.history.map((h) => (
                  <li key={h.history_id} className="text-[11px]">
                    <div className="text-slate-400">{fmtDateTime(h.performed_at)} · {h.performed_by_name}</div>
                    <div className="text-slate-700">
                      <span className="font-semibold">{h.event}</span>
                      {h.summary && h.summary !== h.event ? ` — ${h.summary}` : ''}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
};
