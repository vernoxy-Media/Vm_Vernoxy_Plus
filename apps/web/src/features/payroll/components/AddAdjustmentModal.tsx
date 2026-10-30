import React, { useState } from 'react';
import { X, PlusCircle, MinusCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAddAdjustmentMutation } from '../hooks/use-payroll';

interface AddAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payrollEmployeeId: number;
  employeeName?: string;
}

export const AddAdjustmentModal: React.FC<AddAdjustmentModalProps> = ({
  isOpen,
  onClose,
  payrollEmployeeId,
  employeeName,
}) => {
  const addMutation = useAddAdjustmentMutation();

  const [kind, setKind] = useState<'ADDITION' | 'DEDUCTION'>('ADDITION');
  const [categoryCode, setCategoryCode] = useState<string>('bonus');
  const [amount, setAmount] = useState<string>('');
  const [relatedDate, setRelatedDate] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const additionCategories = [
    { code: 'bonus', label: 'Bonus / Incentive' },
    { code: 'referral_bonus', label: 'Referral Bonus' },
    { code: 'arrears', label: 'Arrears' },
    { code: 'reimbursement', label: 'Reimbursement' },
    { code: 'other', label: 'Other Addition' },
  ];

  const deductionCategories = [
    { code: 'salary_advance_recovery', label: 'Salary Advance Recovery' },
    { code: 'loan_instalment', label: 'Loan Instalment' },
    { code: 'penalty', label: 'Penalty' },
    { code: 'excess_payment_recovery', label: 'Excess Payment Recovery' },
    { code: 'other', label: 'Other Deduction' },
  ];

  const currentCategories = kind === 'ADDITION' ? additionCategories : deductionCategories;

  const handleKindChange = (newKind: 'ADDITION' | 'DEDUCTION') => {
    setKind(newKind);
    setCategoryCode(newKind === 'ADDITION' ? 'bonus' : 'salary_advance_recovery');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter an amount more than 0.');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Please write at least 10 characters explaining the reason.');
      return;
    }

    try {
      await addMutation.mutateAsync({
        payrollEmployeeId,
        data: {
          kind,
          category_code: categoryCode,
          amount: numAmount,
          related_date: relatedDate || undefined,
          reference_number: referenceNumber || undefined,
          reason: reason.trim(),
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add adjustment');
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
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Add Adjustment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              One-time addition or deduction for {employeeName || 'employee'} in this month.
            </p>
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
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Kind Toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleKindChange('ADDITION')}
                className={`p-3 rounded-2xl border flex items-center justify-center gap-2 font-bold text-xs transition ${
                  kind === 'ADDITION'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Addition (+)</span>
              </button>

              <button
                type="button"
                onClick={() => handleKindChange('DEDUCTION')}
                className={`p-3 rounded-2xl border flex items-center justify-center gap-2 font-bold text-xs transition ${
                  kind === 'DEDUCTION'
                    ? 'border-rose-500 bg-rose-50/60 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MinusCircle className="w-4 h-4 text-rose-600" />
                <span>Deduction (-)</span>
              </button>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                {currentCategories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="2000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Related date & Reference */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Related Date (Optional)
                </label>
                <input
                  type="date"
                  value={relatedDate}
                  onChange={(e) => setRelatedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                  Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CAN-0043, ADV-102"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason <span className="text-rose-500">*</span> (10 to 250 characters)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Referral bonus for candidate who joined, per company policy..."
                maxLength={250}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
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
              disabled={addMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Add adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
