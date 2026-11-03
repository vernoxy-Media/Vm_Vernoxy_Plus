import React, { useState } from 'react';
import {
  X,
  Loader2,
  Check,
  Building2,
  Lock,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface ActivateEmployeeAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    emp_id: number;
    name: string;
    email: string;
    office_email?: string | null;
    personal_email?: string | null;
    joining_date: string;
    department?: { name: string } | null;
    departments?: Array<{ dep_id: number; name: string }> | null;
    role?: { role_name: string } | null;
    employee_code?: string;
  };
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export const ActivateEmployeeAccountModal: React.FC<ActivateEmployeeAccountModalProps> = ({
  isOpen,
  onClose,
  employee,
  onConfirm,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const empCode = employee.employee_code || `EMP-${String(employee.emp_id).padStart(4, '0')}`;
  const officeEmail = employee.office_email || employee.email || `${employee.name.toLowerCase().replace(/\s+/g, '.')}@vernoxy.com`;
  const personalEmail = employee.personal_email || '';

  // Determine if joining date is in the future
  const joiningDateObj = employee.joining_date ? new Date(employee.joining_date) : new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureJoining = joiningDateObj.getTime() > today.getTime();

  const formattedJoiningDate = joiningDateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const [activationChoice, setActivationChoice] = useState<string>(
    isFutureJoining ? `on_joining` : 'now',
  );
  const [emailToOffice, setEmailToOffice] = useState(true);
  const [emailToPersonal, setEmailToPersonal] = useState(true);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  const departmentsList = employee.departments && employee.departments.length > 0
    ? employee.departments
    : employee.department
    ? [{ dep_id: 1, name: employee.department.name }]
    : [{ dep_id: 1, name: 'General' }];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Reference Screen 11 */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Activate Employee Account</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleActivateSubmit} className="p-7 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Marker 1: Employee Strip */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {getInitials(employee.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm truncate">{employee.name}</span>
                <span className="text-xs text-slate-400 font-mono">• {empCode}</span>
              </div>
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                <span>All required onboarding items are done</span>
                <span>✓</span>
              </p>
            </div>
          </div>

          {/* Marker 2 & 3: Login ID & Activation Choice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1">
                <span>Login ID (Office Email)</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={officeEmail}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600 text-xs font-mono font-medium cursor-not-allowed"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1">
                <span>Activation</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={activationChoice}
                  onChange={(e) => setActivationChoice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition cursor-pointer appearance-none pr-8"
                >
                  <option value="on_joining">On Joining Date — {formattedJoiningDate}</option>
                  <option value="now">Now</option>
                </select>
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Marker 4: CRM access from departments */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 tracking-tight">
              CRM access from departments
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap gap-2">
              {departmentsList.map((dep) => (
                <span
                  key={dep.dep_id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold"
                >
                  <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>{dep.name} → All Projects, Attendance, CRM</span>
                </span>
              ))}
            </div>
          </div>

          {/* Marker 5: Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 tracking-tight">Password</label>
            <div className="relative">
              <input
                type="text"
                disabled
                value="System generates a site link for employee to set their own password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-500 text-xs italic cursor-not-allowed"
              />
              <Sparkles className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400">Nobody types it, and the Admin never sees it. The employee sets their own password via the site link.</p>
          </div>

          {/* Marker 6: Emails Checkboxes */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={emailToOffice}
                onChange={(e) => setEmailToOffice(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700">
                Email login details to office email (<span className="text-slate-900 font-semibold">{officeEmail}</span>)
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={emailToPersonal}
                onChange={(e) => setEmailToPersonal(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700">
                Send a &quot;your login is ready&quot; note to personal email
                {personalEmail ? (
                  <> (<span className="text-slate-900 font-semibold">{personalEmail}</span>)</>
                ) : (
                  ' (if on file)'
                )}
              </span>
            </label>
          </div>

          {/* Marker 7: Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Activate &amp; Generate Login</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
