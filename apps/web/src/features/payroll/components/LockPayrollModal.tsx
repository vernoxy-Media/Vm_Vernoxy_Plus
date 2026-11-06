import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { PayrollRegisterResponse, errorText, useLockPayrollMutation } from '../hooks/use-payroll';
import { Banner, Modal, btn, money } from './payroll-ui';

/** Screen 8: Lock Payroll pop-up (BFD 10 Part 1). */
export const LockPayrollModal: React.FC<{ open: boolean; onClose: () => void; data: PayrollRegisterResponse }> = ({ open, onClose, data }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lock = useLockPayrollMutation();
  const { run, checks } = data;

  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setErr(null);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Lock Payroll · ${run.month_label}`}
      subtitle="After locking, no figure can change. Salary Slips can then be generated."
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btn.primary}
            disabled={!confirmed || !checks.can_lock || lock.isPending}
            onClick={async () => {
              setErr(null);
              try {
                await lock.mutateAsync({ year: run.payroll_year, month: run.payroll_month });
                onClose();
              } catch (e) {
                setErr(errorText(e));
              }
            }}
          >
            {lock.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Lock Payroll
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {err && <Banner>{err}</Banner>}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lock checks</p>
          <ul className="space-y-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5">
            {checks.lock_checks.map((c) => (
              <li key={c.key} className={`flex items-start gap-2 text-[12.5px] ${c.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                {c.ok ? <CheckCircle2 className="mt-px h-4 w-4 shrink-0" /> : <XCircle className="mt-px h-4 w-4 shrink-0" />}
                {c.label}
              </li>
            ))}
            {checks.warnings
              .filter((w) => w.code !== 'OT_PENDING')
              .slice(0, 6)
              .map((w, i) => (
                <li key={`w${i}`} className="flex items-start gap-2 text-[12.5px] text-amber-700">
                  <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
                  {w.employee_code}: {w.message}
                </li>
              ))}
            {checks.warnings.filter((w) => w.code !== 'OT_PENDING').length > 6 && (
              <li className="text-[12px] text-amber-700">and {checks.warnings.length - 6} more warnings (Checks tab)</li>
            )}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Totals being locked</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Employees', String(run.total_employees)],
              ['Gross', money(run.gross_earnings, 0)],
              ['PF employee + employer', money(run.employee_pf_total + run.employer_pf_total, 0)],
              ['Total Salary', money(run.total_salary, 0)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10.5px] text-slate-500">{k}</p>
                <p className="text-[14px] font-bold text-slate-900">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!checks.can_lock} />
          I have checked the Payroll Register and the warnings
        </label>
      </div>
    </Modal>
  );
};
