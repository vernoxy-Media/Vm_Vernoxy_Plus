import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Loader2, Pencil, RotateCcw, Trash2, Undo2, XCircle } from 'lucide-react';
import {
  errorText,
  fieldErrors,
  useApproveClaim,
  useClaimDetails,
  useCopyClaim,
  useDeleteClaim,
  useExpenseLookups,
  useRejectClaim,
  useReopenClaim,
  useWithdrawClaim,
} from '../hooks/use-expenses';
import { ReceiptViewer } from './ReceiptViewer';
import { Banner, ClaimStatusBadge, FieldError, Modal, btn, fmtDate, fmtDateTime, inputCls, inr } from './expense-ui';

type Popup = null | 'approve' | 'reject' | 'reopen' | 'withdraw' | 'delete';

/** Screen 4: Review Claim (BFD 7). Buttons follow the viewer's permissions from the server. */
export const ClaimReviewModal: React.FC<{
  claimId: number | null;
  onClose: () => void;
  onEdit?: (id: number) => void;
  onMessage?: (msg: string) => void;
  onOpenClaim?: (id: number) => void;
}> = ({ claimId, onClose, onEdit, onMessage, onOpenClaim }) => {
  const { data: c, isLoading, error } = useClaimDetails(claimId);
  const { data: lookups } = useExpenseLookups();
  const approve = useApproveClaim();
  const reject = useRejectClaim();
  const reopen = useReopenClaim();
  const withdraw = useWithdrawClaim();
  const del = useDeleteClaim();
  const copy = useCopyClaim();

  const [popup, setPopup] = useState<Popup>(null);
  const [remarks, setRemarks] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [ack, setAck] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    setPopup(null);
    setBanner(null);
  }, [claimId]);

  const openPopup = (p: Popup) => {
    setRemarks('');
    setReasonCode('');
    setAck(false);
    setErrs({});
    setPopup(p);
  };

  const act = async (fn: () => Promise<unknown>, done: string, closeAll = false) => {
    setErrs({});
    try {
      await fn();
      setPopup(null);
      onMessage?.(done);
      if (closeAll) onClose();
    } catch (err: any) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrs(fe);
      else {
        setPopup(null);
        setBanner(errorText(err));
      }
    }
  };

  const hasFlags = !!c?.flags.length;

  return (
    <>
      <Modal
        open={!!claimId}
        onClose={onClose}
        width="max-w-4xl"
        title={c?.claim_no ? `Review Claim · ${c.claim_no}` : 'Expense Claim'}
        subtitle={c ? <ClaimStatusBadge status={c.status} /> : undefined}
        footer={
          c && (
            <>
              {c.permissions.can_delete && (
                <button type="button" className={btn.secondary} onClick={() => openPopup('delete')}>
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
              {c.permissions.can_edit && onEdit && (
                <button type="button" className={btn.primary} onClick={() => onEdit(c.claim_id)}>
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              )}
              {c.permissions.can_withdraw && (
                <button type="button" className={btn.secondary} onClick={() => openPopup('withdraw')}>
                  <Undo2 className="h-4 w-4" /> Withdraw
                </button>
              )}
              {c.permissions.can_copy && (
                <button
                  type="button"
                  className={btn.primary}
                  disabled={copy.isPending}
                  onClick={() =>
                    act(async () => {
                      const n = await copy.mutateAsync(c.claim_id);
                      onEdit?.(n.claim_id);
                    }, 'A new Draft was created from this claim.')
                  }
                >
                  <Copy className="h-4 w-4" /> Copy to new claim
                </button>
              )}
              {c.permissions.can_reopen && (
                <button type="button" className={btn.secondary} onClick={() => openPopup('reopen')}>
                  <RotateCcw className="h-4 w-4" /> Reopen approval
                </button>
              )}
              {c.permissions.can_decide && (
                <>
                  <button type="button" className={btn.danger} onClick={() => openPopup('reject')}>
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                  <button type="button" className={btn.success} onClick={() => openPopup('approve')}>
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                </>
              )}
            </>
          )
        }
      >
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error || !c ? (
          <Banner>{errorText(error, 'This claim could not be opened.')}</Banner>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4">
              {banner && <Banner>{banner}</Banner>}
              {c.permissions.self_approval && (
                <Banner tone="warn">You are the only Admin, so you can decide your own claim. It will be marked Self-approved.</Banner>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-slate-200 p-4 text-[12.5px]">
                <Info label="Employee" value={`${c.employee.name} · ${c.employee.emp_code}`} />
                <Info label="Department" value={c.employee.department_name || '—'} />
                <Info label="Expense Date" value={fmtDate(c.expense_date)} />
                <Info label="Category" value={c.category?.name || '—'} />
                <Info label="Expense Type" value={c.expense_type || '—'} />
                <Info label="Amount" value={c.amount != null ? inr(c.amount) : '—'} strong />
                <Info label="Merchant / Paid to" value={c.merchant_name || '—'} />
                <Info label="Submitted" value={fmtDateTime(c.submitted_at)} />
                <div className="col-span-2">
                  <Info label="Description / Purpose" value={c.description || '—'} />
                </div>
                {c.status !== 'DRAFT' && <Info label="Approver" value={c.decided_by_name || c.approver_name || 'Admin'} />}
                {c.decided_at && <Info label="Decided" value={fmtDateTime(c.decided_at)} />}
                {c.rejection_reason && <Info label="Rejection Reason" value={c.rejection_reason} />}
                {c.decision_remarks && <Info label="Remarks" value={c.decision_remarks} />}
                {c.status === 'REIMBURSED' && (
                  <>
                    <Info label="Paid" value={`${fmtDate(c.payment_date)}${c.reimbursement_method === 'PAYROLL' ? ' · with salary' : c.payment_mode ? ` · ${c.payment_mode}` : ''}`} />
                    <Info label="Reference" value={c.payment_reference_no || '—'} />
                  </>
                )}
                {c.status === 'APPROVED' && c.payroll_run_id && <Info label="Reimbursement" value="Added to a payroll run" />}
                {c.bank && (
                  <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2">
                    <Info label="Bank details" value={[c.bank.bank_name, c.bank.account_number, c.bank.ifsc_code].filter(Boolean).join(' · ') || 'Not on file'} />
                  </div>
                )}
              </div>

              {c.checks.length > 0 && (
                <div>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Checks</h4>
                  <ul className="space-y-1.5">
                    {c.checks.map((k, i) => (
                      <li key={i} className={`flex items-center gap-2 text-[12.5px] ${k.ok ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {k.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <span>{k.label}</span>
                        {!k.ok && k.claim_id && onOpenClaim && (
                          <button type="button" className={btn.link} onClick={() => onOpenClaim(k.claim_id!)}>
                            Open
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">History</h4>
                <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                  {c.history.map((h, i) => (
                    <li key={i} className="text-[12.5px]">
                      <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />
                      <p className="font-semibold text-slate-800">
                        {h.event} <span className="font-normal text-slate-400">· {fmtDateTime(h.at)}</span>
                      </p>
                      <p className="text-slate-500">
                        {h.summary}
                        {h.by ? ` — ${h.by}` : ''}
                      </p>
                    </li>
                  ))}
                  {!c.history.length && <li className="text-[12.5px] text-slate-400">No history yet.</li>}
                </ol>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Receipts ({c.receipts.length})</h4>
              <ReceiptViewer receipts={c.receipts} claimId={c.claim_id} claimNo={c.claim_no} />
            </div>
          </div>
        )}
      </Modal>

      {/* Approve */}
      <Modal
        open={popup === 'approve' && !!c}
        onClose={() => setPopup(null)}
        title={`Approve ${c?.claim_no ?? ''}?`}
        subtitle={c ? `${c.employee.name} · ${inr(c.amount)}` : undefined}
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setPopup(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={btn.success}
              disabled={approve.isPending || (hasFlags && !ack)}
              onClick={() => act(() => approve.mutateAsync({ id: c!.claim_id, remarks: remarks.trim(), flags_acknowledged: ack }), `${c!.claim_no} approved.`)}
            >
              Approve
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {hasFlags && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              {c!.flags.map((f) => (
                <p key={f.code} className="text-[12.5px] text-amber-800">
                  • {f.label}
                  {f.claim_no ? ` (${f.claim_no})` : ''}
                </p>
              ))}
              <label className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-900">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I have checked the flags
              </label>
              <FieldError msg={errs.flags_acknowledged} />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Remarks (optional)</label>
            <textarea rows={3} maxLength={500} className={`${inputCls} h-auto py-2`} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            <FieldError msg={errs.remarks} />
          </div>
        </div>
      </Modal>

      {/* Reject */}
      <Modal
        open={popup === 'reject' && !!c}
        onClose={() => setPopup(null)}
        title={`Reject ${c?.claim_no ?? ''}?`}
        subtitle="The employee can copy it into a new claim."
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setPopup(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={btn.danger}
              disabled={reject.isPending}
              onClick={() => {
                const e: Record<string, string> = {};
                if (!reasonCode) e.reason_code = 'Please choose the reason.';
                if (remarks.trim().length < 10) e.remarks = 'Please write at least 10 characters so the employee knows what to fix.';
                if (Object.keys(e).length) return setErrs(e);
                void act(() => reject.mutateAsync({ id: c!.claim_id, reason_code: reasonCode, remarks: remarks.trim() }), `${c!.claim_no} rejected.`);
              }}
            >
              Reject
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Reason<span className="text-rose-500">*</span>
            </label>
            <select className={inputCls} value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
              <option value="">Select reason</option>
              {(lookups?.rejection_reasons || []).map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
            <FieldError msg={errs.reason_code} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Remarks<span className="text-rose-500">*</span>
            </label>
            <textarea rows={3} maxLength={500} className={`${inputCls} h-auto py-2`} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            <FieldError msg={errs.remarks} />
          </div>
        </div>
      </Modal>

      {/* Reopen (Admin) */}
      <Modal
        open={popup === 'reopen' && !!c}
        onClose={() => setPopup(null)}
        title="Reopen approval?"
        subtitle="The claim goes back to Submitted. The employee and Accounts are told."
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setPopup(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={btn.primary}
              disabled={reopen.isPending}
              onClick={() => {
                if (remarks.trim().length < 10) return setErrs({ reason: 'Please write at least 10 characters.' });
                void act(() => reopen.mutateAsync({ id: c!.claim_id, reason: remarks.trim() }), `${c!.claim_no} reopened.`);
              }}
            >
              Reopen
            </button>
          </>
        }
      >
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Reason<span className="text-rose-500">*</span>
        </label>
        <textarea rows={3} maxLength={500} className={`${inputCls} h-auto py-2`} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        <FieldError msg={errs.reason} />
      </Modal>

      {/* Withdraw (employee) */}
      <Modal
        open={popup === 'withdraw' && !!c}
        onClose={() => setPopup(null)}
        title={`Withdraw ${c?.claim_no ?? ''}?`}
        subtitle="It goes back to Draft and keeps its Claim No. You can edit and submit it again."
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setPopup(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={btn.primary}
              disabled={withdraw.isPending}
              onClick={() => act(() => withdraw.mutateAsync({ id: c!.claim_id, reason: remarks.trim() }), `${c!.claim_no} withdrawn.`)}
            >
              Withdraw
            </button>
          </>
        }
      >
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reason (optional)</label>
        <textarea rows={2} maxLength={300} className={`${inputCls} h-auto py-2`} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </Modal>

      {/* Delete draft */}
      <Modal
        open={popup === 'delete' && !!c}
        onClose={() => setPopup(null)}
        title="Delete this Draft?"
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setPopup(null)}>
              Cancel
            </button>
            <button type="button" className={btn.danger} disabled={del.isPending} onClick={() => act(() => del.mutateAsync(c!.claim_id), 'Draft deleted.', true)}>
              Delete
            </button>
          </>
        }
      >
        <p className="text-[13px] text-slate-600">The Draft and its receipts will be removed.</p>
      </Modal>
    </>
  );
};

const Info: React.FC<{ label: string; value: React.ReactNode; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="min-w-0">
    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    <p className={`break-words ${strong ? 'text-[15px] font-bold text-slate-900' : 'text-slate-700'}`}>{value}</p>
  </div>
);
