import React from 'react';
import { PayrollSettingsForm } from '@/features/payroll/components/PayrollSettingsForm';

/** Settings -> HR -> Payroll Settings (Admin). Same settings the Payroll page used to open in a popup. */
export const SettingsPayrollSection: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Payroll Settings</h2>
      <p className="mt-0.5 text-[13px] text-slate-500">
        PF, rounding, pay day, Accounts users and adjustment categories. New values apply to runs calculated from now; locked runs are not
        changed. Every change is kept in the Change Log.
      </p>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <PayrollSettingsForm canEdit />
    </div>
  </div>
);
