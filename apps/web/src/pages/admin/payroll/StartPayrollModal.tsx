import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Users,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  useStartPayrollEligibilityQuery,
  useStartOrCalculatePayrollMutation,
} from '../../../hooks/use-payroll';

interface StartPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalculate?: (year: number, month: number) => void;
  isCalculating?: boolean;
  defaultYear?: number;
  defaultMonth?: number;
}

export const StartPayrollModal: React.FC<StartPayrollModalProps> = ({
  isOpen,
  onClose,
  onCalculate,
  isCalculating: externalCalculating,
  defaultYear,
  defaultMonth,
}) => {
  const navigate = useNavigate();
  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth || currentMonthNum);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear || currentYearNum);
  const [showEmployeesList, setShowEmployeesList] = useState(false);

  useEffect(() => {
    if (defaultYear) setSelectedYear(defaultYear);
    if (defaultMonth) setSelectedMonth(defaultMonth);
  }, [defaultYear, defaultMonth]);

  const { data: eligibility, isLoading } = useStartPayrollEligibilityQuery(selectedYear, selectedMonth);
  const startMutation = useStartOrCalculatePayrollMutation();

  if (!isOpen) return null;

  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const handleStart = async () => {
    if (onCalculate) {
      onCalculate(selectedYear, selectedMonth);
    } else {
      await startMutation.mutateAsync({ year: selectedYear, month: selectedMonth });
      onClose();
      navigate(`/admin/payroll/${selectedYear}/${selectedMonth}`);
    }
  };

  const isWorking = externalCalculating || startMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Start Payroll</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The system lists everyone to be paid and checks the data before calculating.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Month & Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payroll Month <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} {selectedYear}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Period
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs text-slate-600 font-medium">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{eligibility?.period || 'Calculating period...'}</span>
              </div>
            </div>
          </div>

          {/* Attendance Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Attendance
            </label>
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs ${
                eligibility?.attendance_locked
                  ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800'
                  : 'bg-amber-50 border-amber-200/80 text-amber-800'
              }`}
            >
              {eligibility?.attendance_locked ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{eligibility?.attendance_message || 'Checking attendance status...'}</p>
                {!eligibility?.attendance_locked && (
                  <p className="text-2xs text-amber-700/90 mt-0.5">
                    The run can be calculated as a draft to preview numbers, but cannot be locked until attendance is verified.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Employees Included */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Employees included
              </label>
              <button
                type="button"
                onClick={() => setShowEmployeesList(!showEmployeesList)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                {showEmployeesList ? 'Hide list' : 'View list'}
              </button>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {eligibility?.total_employees_included || 0} employees
                  </p>
                  <p className="text-2xs text-slate-500">
                    Eligible active, joined, and onboarded staff with joining dates in this month
                  </p>
                </div>
              </div>
            </div>

            {showEmployeesList && eligibility?.employees_preview && (
              <div className="mt-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 max-h-40 overflow-y-auto space-y-1.5">
                {eligibility.employees_preview.map((e: any) => (
                  <div key={e.emp_id} className="flex items-center justify-between text-2xs py-1 border-b border-slate-200/40 last:border-0">
                    <span className="font-semibold text-slate-800">{e.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border text-slate-600 text-3xs font-medium">
                      {e.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checks Before Calculation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Checks before calculation
            </label>
            <div className="space-y-2">
              {eligibility?.checks?.map((chk: any) => (
                <div
                  key={chk.id}
                  className="flex items-center gap-2.5 text-xs text-slate-700"
                >
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span className={chk.passed ? 'text-slate-700' : 'text-amber-800 font-medium'}>
                    {chk.passed ? chk.label : (chk.warningMessage || chk.label)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isWorking || isLoading}
            onClick={handleStart}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50"
          >
            {isWorking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Calculate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
