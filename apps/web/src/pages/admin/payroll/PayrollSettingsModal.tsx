import React, { useState, useEffect } from 'react';
import { X, Settings, ShieldCheck, Loader2, Check } from 'lucide-react';
import {
  usePayrollSettingsQuery,
  useUpdatePayrollSettingsMutation,
  PayrollSettings,
} from '../../../hooks/use-payroll';

interface PayrollSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PayrollSettingsModal: React.FC<PayrollSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: settings, isLoading } = usePayrollSettingsQuery();
  const updateMutation = useUpdatePayrollSettingsMutation();

  const [form, setForm] = useState<Partial<PayrollSettings>>({});
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        default_employee_pf_pct: Number(settings.default_employee_pf_pct) || 12,
        default_employer_pf_pct: Number(settings.default_employer_pf_pct) || 12,
        apply_pf_wage_limit: settings.apply_pf_wage_limit !== false,
        pf_wage_limit: Number(settings.pf_wage_limit) || 15000,
        missing_punch_default: settings.missing_punch_default || 'UNPAID',
        ot_rounding: settings.ot_rounding || 'THIRTY',
        total_salary_rounding: settings.total_salary_rounding || 'NEAREST_RUPEE',
        pay_day: Number(settings.pay_day) || 7,
      });
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync(form);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200/80">
              <Settings className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Payroll Settings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure payroll calculation rules, PF policies, and overtime rounding.
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
        <form onSubmit={handleSave}>
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Settings saved successfully! New runs will use these rules.</span>
              </div>
            )}

            {/* PF Settings */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
                Provident Fund (PF) Rules
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Employee PF Share (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.default_employee_pf_pct ?? 12}
                    onChange={(e) =>
                      setForm({ ...form, default_employee_pf_pct: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Employer PF Share (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.default_employer_pf_pct ?? 12}
                    onChange={(e) =>
                      setForm({ ...form, default_employer_pf_pct: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Apply Statutory PF Wage Limit</p>
                  <p className="text-2xs text-slate-500">Cap PF wage calculation at ₹ 15,000</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.apply_pf_wage_limit ?? true}
                  onChange={(e) => setForm({ ...form, apply_pf_wage_limit: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
              </div>

              {form.apply_pf_wage_limit && (
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    PF Wage Limit (₹)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={form.pf_wage_limit ?? 15000}
                    onChange={(e) => setForm({ ...form, pf_wage_limit: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}
            </div>

            {/* Attendance & Rounding Rules */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
                Attendance & Rounding Rules
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Missing Punch at Lock
                  </label>
                  <select
                    value={form.missing_punch_default || 'UNPAID'}
                    onChange={(e) =>
                      setForm({ ...form, missing_punch_default: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="UNPAID">Unpaid (Loss of Pay)</option>
                    <option value="FULL">Full day (Paid)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Overtime (OT) Rounding
                  </label>
                  <select
                    value={form.ot_rounding || 'THIRTY'}
                    onChange={(e) => setForm({ ...form, ot_rounding: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="THIRTY">Down to 30 minutes</option>
                    <option value="FIFTEEN">Down to 15 minutes</option>
                    <option value="NONE">Exact hours (No rounding)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Total Salary Rounding
                  </label>
                  <select
                    value={form.total_salary_rounding || 'NEAREST_RUPEE'}
                    onChange={(e) =>
                      setForm({ ...form, total_salary_rounding: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="NEAREST_RUPEE">Nearest rupee (50p round up)</option>
                    <option value="NONE">Keep 2 decimal places</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Monthly Pay Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={form.pay_day ?? 7}
                    onChange={(e) => setForm({ ...form, pay_day: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-3xs text-slate-400 mt-1">Normal salary disbursement day of month</p>
                </div>
              </div>
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
              disabled={updateMutation.isPending || isLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
