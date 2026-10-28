import React, { useState } from 'react';
import { X, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { useSaveDayAdjustmentMutation, PayrollDayItem } from '../../../hooks/use-payroll';

interface DayAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: PayrollDayItem | null;
  payrollEmployeeId: number;
  employeeName?: string;
  dailyRate: number;
}

export const DayAdjustmentModal: React.FC<DayAdjustmentModalProps> = ({
  isOpen,
  onClose,
  day,
  payrollEmployeeId,
  employeeName,
  dailyRate,
}) => {
  const saveMutation = useSaveDayAdjustmentMutation();

  const [paidAs, setPaidAs] = useState<'FULL' | 'HALF' | 'UNPAID'>('FULL');
  const [reason, setReason] = useState<string>('Attendance correction after month lock');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !day) return null;

  const currentPaidAs = day.paid_as;

  // Calculate effect
  const getAmountForPaidAs = (mode: 'FULL' | 'HALF' | 'UNPAID') => {
    if (mode === 'FULL') return dailyRate;
    if (mode === 'HALF') return Math.round(dailyRate * 0.5 * 100) / 100;
    return 0;
  };

  const currentAmount = getAmountForPaidAs(currentPaidAs as any);
  const newAmount = getAmountForPaidAs(paidAs);
  const diff = Math.round((newAmount - currentAmount) * 100) / 100;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paidAs === currentPaidAs) {
      setError(`This day is already paid as ${currentPaidAs === 'FULL' ? 'Full day' : currentPaidAs === 'HALF' ? 'Half day' : 'Unpaid'}.`);
      return;
    }
    if (note.trim().length < 10) {
      setError('Please write at least 10 characters explaining the reason.');
      return;
    }

    try {
      await saveMutation.mutateAsync({
        payrollEmployeeId,
        dayId: day.payroll_employee_day_id,
        data: {
          pay_this_day_as: paidAs,
          reason,
          note: note.trim(),
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save adjustment');
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
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Day Adjustment • {day.attendance_date}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust how {employeeName || 'this employee'} is paid on this working day.
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
        <form onSubmit={handleSave}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Attendance Status & Paid Now As */}
            <div className="grid grid-cols-2 gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div>
                <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Attendance Status</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {day.attendance_code === 'P'
                    ? 'P - Present'
                    : day.attendance_code === 'HD'
                    ? 'HD - Half Day'
                    : day.attendance_code === 'L'
                    ? 'L - Leave'
                    : day.attendance_code === 'MP'
                    ? 'MP - Missing Punch'
                    : 'A - Absent (no check-in)'}
                </p>
              </div>
              <div>
                <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Paid Now As</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {currentPaidAs} • ₹ {currentAmount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Pay this day as */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Pay this day as <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'FULL', label: 'Full day', amt: dailyRate },
                  { value: 'HALF', label: 'Half day', amt: Math.round(dailyRate * 0.5 * 100) / 100 },
                  { value: 'UNPAID', label: 'Unpaid', amt: 0 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaidAs(opt.value as any)}
                    className={`p-3 rounded-2xl border text-center transition ${
                      paidAs === opt.value
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold">{opt.label}</p>
                    <p className="text-2xs font-semibold text-slate-500 mt-0.5">₹ {opt.amt.toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="Attendance correction after month lock">
                  Attendance correction after month lock
                </option>
                <option value="Approved work outside office">Approved work outside office</option>
                <option value="Management approval (paid absence)">
                  Management approval (paid absence)
                </option>
                <option value="Penalty">Penalty</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Note <span className="text-rose-500">*</span> (10 to 250 characters)
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Client visit at site confirmed by reporting manager..."
                maxLength={250}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-3xs text-slate-400 mt-1">{note.length} / 250 characters</p>
            </div>

            {/* Effect */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900">
              <span className="font-bold">Effect on Basic Salary: </span>
              {diff >= 0 ? `+ ₹ ${diff.toLocaleString()}` : `- ₹ ${Math.abs(diff).toLocaleString()}`}
              <p className="text-2xs text-blue-700/80 mt-0.5">
                Attendance record remains unchanged; only payroll is credited for this day.
              </p>
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
              disabled={saveMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
