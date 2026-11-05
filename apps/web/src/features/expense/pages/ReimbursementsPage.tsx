import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarRange, Loader2 } from 'lucide-react';
import { ReimbursementRow, errorText, fieldErrors, useAddToPayroll, useDraftPayrollRuns, useExpenseLookups, useRecordPayment, useReimbursements } from '../hooks/use-expenses';
import { ClaimReviewModal } from '../components/ClaimReviewModal';
import { Banner, ClaimStatusBadge, FieldError, MONTHS, Modal, btn, fmtDate, inputCls, inr, todayIST } from '../components/expense-ui';

/** Section 8: pay approved claims back, directly or with salary (Accounts or Admin). */
export const ReimbursementsPage: React.FC = () => {
  const [status, setStatus] = useState<'APPROVED' | 'REIMBURSED'>('APPROVED');
  const { data: rows = [], isLoading, error } = useReimbursements(status);
  const { data: lookups } = useExpenseLookups();
  const [selected, setSelected] = useState<number[]>([]);
  const [popup, setPopup] = useState<null | 'pay' | 'payroll'>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => setSelected([]), [status]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const groups = useMemo(() => {
    const m = new Map<number, { emp_id: number; name: string; dept: string | null; bank: string; rows: ReimbursementRow[] }>();
    for (const r of rows) {
      if (!m.has(r.emp_id)) {
        m.set(r.emp_id, {
          emp_id: r.emp_id,
          name: r.employee_name,
          dept: r.department_name,
          bank: [r.bank_name, r.account_number, r.ifsc_code].filter(Boolean).join(' · '),
          rows: [],
        });
      }
      m.get(r.emp_id)!.rows.push(r);
    }
    return Array.from(m.values());
  }, [rows]);

  const sel = rows.filter((r) => selected.includes(r.claim_id));
  const selEmp = sel[0]?.emp_id ?? null;
  const selTotal = sel.reduce((s, r) => s + r.amount, 0);
  const payable = (r: ReimbursementRow) => r.status === 'APPROVED' && !r.payroll_run_id;

  const toggle = (r: ReimbursementRow) => {
    if (!payable(r)) return;
    setSelected((prev) => {
      if (prev.includes(r.claim_id)) return prev.filter((x) => x !== r.claim_id);
      // Direct payment is for the claims of one employee at a time.
      const sameEmp = prev.filter((id) => rows.find((x) => x.claim_id === id)?.emp_id === r.emp_id);
      return [...sameEmp, r.claim_id];
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reimbursement</h1>
          <p className="text-[13px] text-slate-500">Pay approved claims back directly, or add them to a Draft payroll run.</p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
          {(['APPROVED', 'REIMBURSED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${status === s ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {s === 'APPROVED' ? 'Waiting for payment' : 'Reimbursed'}
            </button>
          ))}
        </div>
      </div>

      {toast && <Banner tone="ok">{toast}</Banner>}

      {status === 'APPROVED' && sel.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
          <p className="text-[13px] font-semibold text-blue-900">
            {sel.length} claim{sel.length === 1 ? '' : 's'} of {sel[0].employee_name} · {inr(selTotal)}
          </p>
          <div className="flex gap-2">
            <button type="button" className={btn.secondary} onClick={() => setPopup('payroll')}>
              <CalendarRange className="h-4 w-4" /> Add to payroll
            </button>
            <button type="button" className={btn.primary} onClick={() => setPopup('pay')}>
              <Banknote className="h-4 w-4" /> Record payment
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <Banner>{errorText(error)}</Banner>
      ) : !groups.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center text-[13px] text-slate-500">
          {status === 'APPROVED' ? 'No approved claims are waiting for payment.' : 'No reimbursed claims yet.'}
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.emp_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
              <div>
                <p className="text-[13.5px] font-bold text-slate-900">{g.name}</p>
                <p className="text-[11.5px] text-slate-500">
                  {g.dept || '—'} · {g.bank || <span className="text-amber-600">No bank details on file</span>}
                </p>
              </div>
              <p className="text-[13px] font-bold text-slate-900">{inr(g.rows.reduce((s, r) => s + r.amount, 0))}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[12.5px]">
                <tbody className="divide-y divide-slate-100">
                  {g.rows.map((r) => (
                    <tr key={r.claim_id} className="hover:bg-slate-50/70">
                      {status === 'APPROVED' && (
                        <td className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            disabled={!payable(r)}
                            title={selEmp !== null && selEmp !== r.emp_id ? 'Selecting this starts a new selection for this employee' : undefined}
                            checked={selected.includes(r.claim_id)}
                            onChange={() => toggle(r)}
                            aria-label={`Select ${r.claim_no}`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <button type="button" className={btn.link} onClick={() => setViewId(r.claim_id)}>
                          {r.claim_no}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{fmtDate(r.expense_date)}</td>
                      <td className="px-3 py-3 text-slate-700">{r.category_name || '—'}</td>
                      <td className="px-3 py-3 text-slate-600">Approved {fmtDate(r.decided_at)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-900">{inr(r.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'REIMBURSED' ? (
                          <span className="text-[11.5px] text-slate-500">
                            Paid {fmtDate(r.payment_date)} · {r.reimbursement_method === 'PAYROLL' ? 'with salary' : r.payment_mode} · {r.payment_reference_no}
                          </span>
                        ) : r.payroll_run_id ? (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            In {MONTHS[(r.payroll_month || 1) - 1]} {r.payroll_year} payroll
                          </span>
                        ) : (
                          <ClaimStatusBadge status={r.status} label="Not paid" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <PayModal
        open={popup === 'pay'}
        claims={sel}
        modes={lookups?.payment_modes || []}
        onClose={() => setPopup(null)}
        onDone={(m) => {
          setPopup(null);
          setSelected([]);
          setToast(m);
        }}
      />
      <PayrollModal
        open={popup === 'payroll'}
        claims={sel}
        onClose={() => setPopup(null)}
        onDone={(m) => {
          setPopup(null);
          setSelected([]);
          setToast(m);
        }}
      />
      <ClaimReviewModal claimId={viewId} onClose={() => setViewId(null)} onMessage={setToast} />
    </div>
  );
};

const PayModal: React.FC<{
  open: boolean;
  claims: ReimbursementRow[];
  modes: Array<{ code: string; label: string }>;
  onClose: () => void;
  onDone: (m: string) => void;
}> = ({ open, claims, modes, onClose, onDone }) => {
  const pay = useRecordPayment();
  const today = todayIST();
  const minDate = claims.map((c) => (c.decided_at || '').slice(0, 10)).sort().pop() || '';
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState('');
  const [ref, setRef] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(today);
    setMode('');
    setRef('');
    setErrs({});
    setBanner(null);
  }, [open, today]);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!date) e.payment_date = 'Please fill this field.';
    else if (date > today) e.payment_date = 'The payment date cannot be in the future.';
    else if (minDate && date < minDate) e.payment_date = `The payment date cannot be before the approval date (${fmtDate(minDate)}).`;
    if (!mode) e.payment_mode_code = 'Please choose the payment mode.';
    if (!ref.trim()) e.payment_reference_no = 'Please fill this field.';
    if (Object.keys(e).length) return setErrs(e);
    try {
      const r = await pay.mutateAsync({ claim_ids: claims.map((c) => c.claim_id), payment_date: date, payment_mode_code: mode, payment_reference_no: ref.trim() });
      onDone(`${r.count} claim${r.count === 1 ? '' : 's'} marked Reimbursed (${inr(r.total)}).`);
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrs(fe);
      else setBanner(errorText(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record payment"
      subtitle={claims.length ? `${claims[0].employee_name} · ${claims.length} claim(s) · ${inr(claims.reduce((s, c) => s + c.amount, 0))}` : undefined}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btn.primary} disabled={pay.isPending} onClick={submit}>
            {pay.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Mark as Reimbursed
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {banner && <Banner>{banner}</Banner>}
        {errs.claim_ids && <Banner>{errs.claim_ids}</Banner>}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Payment Date<span className="text-rose-500">*</span>
          </label>
          <input type="date" className={inputCls} value={date} min={minDate} max={today} onChange={(e) => setDate(e.target.value)} />
          <FieldError msg={errs.payment_date} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Payment Mode<span className="text-rose-500">*</span>
          </label>
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="">Select mode</option>
            {modes.map((m) => (
              <option key={m.code} value={m.code}>
                {m.label}
              </option>
            ))}
          </select>
          <FieldError msg={errs.payment_mode_code} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Reference No.<span className="text-rose-500">*</span>
          </label>
          <input className={inputCls} maxLength={80} placeholder="UTR / UPI ref / cheque no." value={ref} onChange={(e) => setRef(e.target.value)} />
          <FieldError msg={errs.payment_reference_no} />
        </div>
      </div>
    </Modal>
  );
};

const PayrollModal: React.FC<{ open: boolean; claims: ReimbursementRow[]; onClose: () => void; onDone: (m: string) => void }> = ({ open, claims, onClose, onDone }) => {
  const { data: runs = [], isLoading } = useDraftPayrollRuns(open);
  const add = useAddToPayroll();
  const [runId, setRunId] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRunId('');
      setErr(null);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to payroll"
      subtitle="Each claim is added as a Reimbursement Addition. It becomes Reimbursed when the run is marked Paid."
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btn.primary}
            disabled={add.isPending || !runId}
            onClick={async () => {
              setErr(null);
              try {
                const r = await add.mutateAsync({ claim_ids: claims.map((c) => c.claim_id), payroll_run_id: Number(runId) });
                onDone(`${r.count} claim${r.count === 1 ? '' : 's'} added to payroll.`);
              } catch (e) {
                setErr(errorText(e));
              }
            }}
          >
            {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {err && <Banner>{err}</Banner>}
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Payroll Month<span className="text-rose-500">*</span>
        </label>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : runs.length ? (
          <select className={inputCls} value={runId} onChange={(e) => setRunId(e.target.value)}>
            <option value="">Select a Draft run</option>
            {runs.map((r) => (
              <option key={r.payroll_run_id} value={r.payroll_run_id}>
                {MONTHS[r.payroll_month - 1]} {r.payroll_year}
              </option>
            ))}
          </select>
        ) : (
          <Banner tone="warn">There is no Draft payroll run. Create the month in Salary &amp; Payroll first, or pay directly.</Banner>
        )}
      </div>
    </Modal>
  );
};
