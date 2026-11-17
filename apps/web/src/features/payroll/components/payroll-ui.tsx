import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PayrollEmployeeItem, RunStatus, usePayrollMe } from '../hooks/use-payroll';

export { Modal, Banner, FieldError, Pager, StatCard, btn, filterCls, FilterField, inputCls } from '@/features/expense/components/expense-ui';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const money = (n: number | null | undefined, decimals = 2) =>
  `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
export const num = (n: number | null | undefined) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fmtStamp = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const RUN_TONE: Record<RunStatus, { label: string; chip: string; dot: string }> = {
  NOT_STARTED: { label: 'Not started', chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  DRAFT: { label: 'Draft', chip: 'bg-amber-50 text-amber-700 ring-amber-100', dot: 'bg-amber-500' },
  LOCKED: { label: 'Locked', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-100', dot: 'bg-indigo-500' },
  PAID: { label: 'Paid', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', dot: 'bg-emerald-500' },
};

export const RunStatusBadge: React.FC<{ status: RunStatus }> = ({ status }) => {
  const t = RUN_TONE[status] ?? RUN_TONE.NOT_STARTED;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${t.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {t.label}
    </span>
  );
};

/** Register "Flag" column: errors red, warnings amber, joined/left/adjusted as information. */
export const EmployeeFlag: React.FC<{ e: PayrollEmployeeItem }> = ({ e }) => {
  const chips: Array<{ label: string; cls: string; title: string }> = [];
  for (const i of e.issues || []) {
    if (i.level === 'ERROR') chips.push({ label: 'Error', cls: 'bg-rose-50 text-rose-700 ring-rose-100', title: i.message });
    else if (i.level === 'WARNING') chips.push({ label: shortWarning(i.code), cls: 'bg-amber-50 text-amber-700 ring-amber-100', title: i.message });
    else if (i.code === 'JOINED' || i.code === 'LEFT') chips.push({ label: i.message, cls: 'bg-violet-50 text-violet-700 ring-violet-100', title: i.message });
  }
  if (e.adjustment_count > 0) chips.push({ label: 'Adjusted', cls: 'bg-blue-50 text-blue-700 ring-blue-100', title: `${e.adjustment_count} adjustment(s)` });
  if (!chips.length) return <span className="text-xs text-slate-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span key={i} title={c.title} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ${c.cls}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
};

function shortWarning(code: string) {
  switch (code) {
    case 'NO_UAN':
      return 'UAN missing';
    case 'BANK_DETAILS':
      return 'Bank details missing';
    case 'ONBOARDING':
      return 'Not activated';
    default:
      return 'Warning';
  }
}

export const PAID_AS_LABEL: Record<string, string> = { FULL: 'Full day', HALF: 'Half day', UNPAID: 'Unpaid', NOT_APPLICABLE: '—' };

/** Payroll pages are for the Admin and Accounts only (BFD Section 14). */
export const PayrollGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading } = usePayrollMe();
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!data?.can_use_payroll) return <Navigate to="/" replace />;
  return <>{children}</>;
};
