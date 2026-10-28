import React, { useState } from 'react';
import { X, Unlock, AlertTriangle, Loader2 } from 'lucide-react';
import { useUnlockPayrollMutation } from '../../../hooks/use-payroll';

interface UnlockPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  monthName: string;
}

export const UnlockPayrollModal: React.FC<UnlockPayrollModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  monthName,
}) => {
  const unlockMutation = useUnlockPayrollMutation();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError('Please provide a reason of at least 10 characters.');
      return;
    }

    try {
      await unlockMutation.mutateAsync({ year, month, reason: reason.trim() });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to unlock payroll');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Unlock Payroll • {monthName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin authorization required to revert run to Draft.
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

        {/* Form Body */}
        <form onSubmit={handleUnlock}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900">
              <p className="font-bold">Important:</p>
              <p className="text-2xs text-amber-800 mt-1">
                Unlocking moves this run back to Draft. Any already generated salary slips will need to be re-issued as revised (-R1) after re-locking.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason for Unlocking <span className="text-rose-500">*</span> (10 to 250 characters)
              </label>
              <textarea
                rows={3}
                required
                maxLength={250}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Late attendance correction for employee, approved by HR director..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="text-3xs text-slate-400 mt-1">{reason.length} / 250 characters</p>
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
              type="submit"
              disabled={unlockMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {unlockMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              <span>Unlock Run</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
