import React from 'react';
import { X } from 'lucide-react';

export { StatCard, Field, inputCls, initials } from '@/features/complaint/components/complaint-ui';

export const inr = (n: number | null | undefined) =>
  `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** Today in the company timezone (Asia/Kolkata) as YYYY-MM-DD. */
export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Tone {
  chip: string;
  dot: string;
}

/** BFD 5 status names. */
const CLAIM_STATUS: Record<string, Tone & { label: string }> = {
  DRAFT: { label: 'Draft', chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  SUBMITTED: { label: 'Submitted', chip: 'bg-amber-50 text-amber-700 ring-amber-100', dot: 'bg-amber-500' },
  APPROVED: { label: 'Approved', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100', dot: 'bg-emerald-500' },
  REIMBURSED: { label: 'Reimbursed', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-100', dot: 'bg-indigo-500' },
  REJECTED: { label: 'Rejected', chip: 'bg-rose-50 text-rose-700 ring-rose-100', dot: 'bg-rose-500' },
};

export const ClaimStatusBadge: React.FC<{ status: string; label?: string }> = ({ status, label }) => {
  const t = CLAIM_STATUS[status] ?? CLAIM_STATUS.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${t.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {label ?? t.label}
    </span>
  );
};

interface FlagSource {
  is_above_limit?: boolean;
  is_possible_duplicate?: boolean;
  is_late?: boolean;
  is_self_approved?: boolean;
}

/** Amber flags of BFD 4 Part 3 (they never stop a claim). */
export const FlagChips: React.FC<{ claim: FlagSource; clean?: string }> = ({ claim, clean = '—' }) => {
  const chips: Array<{ key: string; label: string }> = [];
  if (claim.is_above_limit) chips.push({ key: 'limit', label: 'Above limit' });
  if (claim.is_possible_duplicate) chips.push({ key: 'dup', label: 'Possible duplicate' });
  if (claim.is_late) chips.push({ key: 'late', label: 'Late' });
  if (claim.is_self_approved) chips.push({ key: 'self', label: 'Self-approved' });
  if (chips.length === 0) return <span className="text-xs text-slate-300">{clean}</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 ring-1 ring-amber-100">
          {c.label}
        </span>
      ))}
    </div>
  );
};

export const Modal: React.FC<{
  open: boolean;
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ open, title, subtitle, onClose, children, footer, width = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        className={`flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
            {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
  danger:
    'inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50',
  success:
    'inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50',
  link: 'text-[12.5px] font-semibold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50',
};

export const FieldError: React.FC<{ msg?: string | null }> = ({ msg }) =>
  msg ? <p className="mt-1 text-[11.5px] font-medium text-rose-600">{msg}</p> : null;

export const Banner: React.FC<{ tone?: 'error' | 'warn' | 'info' | 'ok'; children: React.ReactNode }> = ({ tone = 'error', children }) => {
  const cls = {
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }[tone];
  return <div className={`rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium ${cls}`}>{children}</div>;
};

export const Pager: React.FC<{ page: number; pageSize: number; total: number; onPage: (p: number) => void }> = ({ page, pageSize, total, onPage }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(total, page * pageSize)} of {total}
      </span>
      <div className="flex gap-1.5">
        <button type="button" className={btn.secondary} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button type="button" className={btn.secondary} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};

/** A filter with its BFD name above it. */
export const FilterField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex shrink-0 flex-col">
    <span className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</span>
    {children}
  </div>
);

/** Inline filter controls: same look as inputs, but sized by the caller so they sit in one row. */
export const filterCls =
  'h-10 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 transition hover:border-slate-300 focus:border-blue-500 focus:outline-hidden focus:ring-4 focus:ring-blue-500/10';
