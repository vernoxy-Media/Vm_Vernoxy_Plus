import React, { useState } from 'react';
import { X, Lock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useLockPayrollMutation } from '../hooks/use-payroll';

interface LockPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  monthName: string;
  totals: {
    total_employees: number;
    gross_earnings: number;
    employee_pf_total: number;
    employer_pf_total: number;
    total_salary: number;
  };
  checks: {
    can_lock: boolean;
    errors: any[];
    warnings: any[];
  };
}

export const LockPayrollModal: React.FC<LockPayrollModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  monthName,
  totals,
  checks,
}) => {
  const lockMutation = useLockPayrollMutation();
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const totalPf = (totals.employee_pf_total || 0) + (totals.employer_pf_total || 0);

  const handleLock = async () => {
    if (!confirmed || !checks.can_lock) return;
    try {
      await lockMutation.mutateAsync({ year, month });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to lock payroll');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Lock Payroll • {monthName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                After locking, figures freeze. Salary slips can then be generated.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Lock checks */}
          <div>
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Lock Checks
            </p>
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700">Attendance month verified</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {checks.can_lock ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span className={checks.can_lock ? 'text-slate-700' : 'text-amber-800 font-semibold'}>
                  All OT entries are approved or rejected
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {checks.errors.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span className={checks.errors.length === 0 ? 'text-slate-700' : 'text-rose-700 font-bold'}>
                  {checks.errors.length === 0 ? 'No employee has an error' : `${checks.errors.length} calculation errors exist`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700">Calculated after the last change</span>
              </div>
            </div>
          </div>

          {/* Warnings (if any) */}
          {checks.warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/60 text-2xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{checks.warnings.length} warning(s) found (these do not block the lock):</span>
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-800/90">
                {checks.warnings.slice(0, 3).map((w, idx) => (
                  <li key={idx}>
                    {w.employee_name}: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Totals being locked */}
          <div>
            <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Totals Being Locked
            </p>
            <div className="grid grid-cols-4 gap-2 p-3.5 rounded-2xl bg-blue-50/40 border border-blue-100 text-center">
              <div>
                <p className="text-3xs text-slate-500 font-medium">Employees</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{totals.total_employees}</p>
              </div>
              <div>
                <p className="text-3xs text-slate-500 font-medium">Gross</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">₹ {totals.gross_earnings.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-3xs text-slate-500 font-medium">PF (Emp+Co)</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">₹ {totalPf.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-3xs text-slate-500 font-medium">Total Salary</p>
                <p className="text-xs font-bold text-blue-700 mt-0.5">₹ {totals.total_salary.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="pt-2 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="confirm-lock-checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="confirm-lock-checkbox" className="text-xs font-medium text-slate-700 cursor-pointer">
              I have checked the Payroll Register and the warnings.
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmed || !checks.can_lock || lockMutation.isPending}
            onClick={handleLock}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {lockMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            <span>Lock Payroll</span>
          </button>
        </div>
      </div>
    </div>
  );
};
