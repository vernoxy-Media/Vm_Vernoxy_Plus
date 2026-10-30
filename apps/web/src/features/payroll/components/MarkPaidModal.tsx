import React, { useState } from 'react';
import { X, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { useMarkPaidMutation } from '../hooks/use-payroll';

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  monthName: string;
  totalSalary: number;
  totalEmployees: number;
  employees: any[];
}

export const MarkPaidModal: React.FC<MarkPaidModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  monthName,
  totalSalary,
  totalEmployees,
  employees,
}) => {
  const markPaidMutation = useMarkPaidMutation();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentReference, setPaymentReference] = useState('');

  if (!isOpen) return null;

  const handleDownloadBankFile = () => {
    // Generate CSV for bank transfer
    const bankEmployees = employees.filter((e) => e.payment_mode === 'BANK_TRANSFER');
    const headers = ['Employee Name', 'Employee Code', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount (INR)'];
    const rows = bankEmployees.map((e) => [
      `"${e.employee_name}"`,
      `"${e.employee_code}"`,
      `"${e.bank_name || ''}"`,
      `"${e.account_number || ''}"`,
      `"${e.ifsc_code || ''}"`,
      e.total_salary,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bank_salary_disbursement_${year}_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await markPaidMutation.mutateAsync({
        year,
        month,
        data: {
          payment_date: paymentDate,
          payment_reference: paymentReference || undefined,
        },
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as paid');
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
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Record Payment • {monthName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mark salary payment as disbursed to {totalEmployees} employees.
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
        <form onSubmit={handleMarkPaid}>
          <div className="p-6 space-y-4">
            {/* Total payout card */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center">
              <p className="text-2xs font-bold text-emerald-700 uppercase tracking-wider">
                Total Salary Payout
              </p>
              <p className="text-2xl font-black text-emerald-900 mt-0.5">
                ₹ {totalSalary.toLocaleString()}
              </p>
              <p className="text-2xs text-emerald-700/80 mt-1">
                Net amount for {totalEmployees} employees
              </p>
            </div>

            {/* Bank File Download */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Download Bank File</p>
                <p className="text-2xs text-slate-500">
                  CSV file with account numbers, IFSC codes, and salary amounts
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadBankFile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>CSV</span>
              </button>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Reference / Batch Number
              </label>
              <input
                type="text"
                placeholder="e.g. UTR-982341920, BATCH-SEP-26"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-3xs text-slate-400 mt-1">
                Bank transaction reference or cheque number
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
              disabled={markPaidMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {markPaidMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Mark as Paid</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
