import React from 'react';
import { X } from 'lucide-react';

export { initials } from '@/features/complaint/components/complaint-ui';

/** Jira look shared by every Expense screen: flat 3px corners, #172B4D text, #DFE1E6 borders, #0052CC actions. */
export const inputCls =
  'h-9 w-full rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] px-2.5 text-[14px] text-[#172B4D] placeholder:text-[#7A869A] transition hover:bg-[#EBECF0] focus:border-[#4C9AFF] focus:bg-white focus:outline-hidden';

/** Labelled wrapper for a control. */
export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <label className="mb-1 block text-[12px] font-semibold text-[#6B778C]">{label}</label>
    {children}
  </div>
);

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  icon: React.ElementType;
  tone?: string;
  tile?: string;
  bar?: string;
  onClick?: () => void;
}

/** A flat Jira-style summary card: small grey label, large number, a small icon tile. */
export const StatCard: React.FC<StatCardProps> = ({ label, value, unit, hint, icon: Icon, tone = 'text-[#172B4D]', tile = 'bg-[#DEEBFF] text-[#0052CC]', onClick }) => {
  const cls = 'rounded-[3px] border border-[#DFE1E6] bg-white p-4 text-left transition';
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#6B778C]">{label}</p>
          <p className={`mt-1.5 text-[26px] font-medium leading-8 ${tone}`}>
            {value}
            {unit && <span className="ml-1.5 text-sm font-normal text-[#6B778C]">{unit}</span>}
          </p>
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] ${tile.replace(/ring-\S+/g, '')}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {hint && <p className="mt-2 text-[12px] text-[#6B778C]">{hint}</p>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:bg-[#F4F5F7]`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
};

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
  DRAFT: { label: 'Draft', chip: 'bg-[#DFE1E6] text-[#42526E]', dot: 'bg-[#42526E]' },
  SUBMITTED: { label: 'Submitted', chip: 'bg-[#FFF0B3] text-[#172B4D]', dot: 'bg-[#FF991F]' },
  APPROVED: { label: 'Approved', chip: 'bg-[#E3FCEF] text-[#006644]', dot: 'bg-[#00875A]' },
  REIMBURSED: { label: 'Reimbursed', chip: 'bg-[#DEEBFF] text-[#0747A6]', dot: 'bg-[#0052CC]' },
  REJECTED: { label: 'Rejected', chip: 'bg-[#FFEBE6] text-[#BF2600]', dot: 'bg-[#DE350B]' },
};

export const ClaimStatusBadge: React.FC<{ status: string; label?: string }> = ({ status, label }) => {
  const t = CLAIM_STATUS[status] ?? CLAIM_STATUS.DRAFT;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${t.chip}`}>
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
        <span key={c.key} className="inline-flex items-center rounded-[3px] bg-[#FFF0B3] px-1.5 py-0.5 text-[10.5px] font-bold uppercase text-[#172B4D]">
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
  /** Flat, square Jira-style dialog. */
  jira?: boolean;
}> = ({ open, title, subtitle, onClose, children, footer, width = 'max-w-lg', jira = true }) => {
  if (!open) return null;
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${jira ? 'bg-[#091E42]/55' : 'bg-slate-900/40 backdrop-blur-[2px]'}`} onMouseDown={onClose}>
      <div
        className={`flex max-h-[92vh] w-full ${width} flex-col overflow-hidden bg-white ${jira ? 'rounded-[3px] shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]' : 'rounded-2xl shadow-2xl'}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={`flex items-start justify-between gap-4 px-6 ${jira ? 'pb-2 pt-5' : 'border-b border-slate-100 py-4'}`}>
          <div className="min-w-0">
            <h3 className={jira ? 'text-[20px] font-medium leading-7 text-[#172B4D]' : 'text-[15px] font-bold text-slate-900'}>{title}</h3>
            {subtitle && <div className={`mt-0.5 text-xs ${jira ? 'text-[#6B778C]' : 'text-slate-500'}`}>{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto px-6 ${jira ? 'py-3' : 'py-4'}`}>{children}</div>
        {footer && <div className={`flex flex-wrap items-center justify-end gap-2 px-6 py-4 ${jira ? '' : 'border-t border-slate-100 bg-slate-50/60'}`}>{footer}</div>}
      </div>
    </div>
  );
};

export const btn = {
  primary: 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-[#0052CC] px-3 text-[14px] font-medium text-white transition hover:bg-[#0065FF] disabled:cursor-not-allowed disabled:bg-[#F4F5F7] disabled:text-[#A5ADBA]',
  secondary: 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-[rgba(9,30,66,0.04)] px-3 text-[14px] font-medium text-[#42526E] transition hover:bg-[rgba(9,30,66,0.08)] disabled:cursor-not-allowed disabled:opacity-50',
  danger: 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-[#DE350B] px-3 text-[14px] font-medium text-white transition hover:bg-[#BF2600] disabled:cursor-not-allowed disabled:opacity-50',
  link: 'inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[13px] font-medium text-[#0052CC] transition hover:bg-[#DEEBFF] hover:underline disabled:cursor-not-allowed disabled:opacity-50',
  success: 'inline-flex h-8 items-center justify-center gap-1.5 rounded-[3px] bg-[#00875A] px-3 text-[14px] font-medium text-white transition hover:bg-[#006644] disabled:cursor-not-allowed disabled:opacity-50',
};

export const FieldError: React.FC<{ msg?: string | null }> = ({ msg }) =>
  msg ? <p className="mt-1 text-[11.5px] font-medium text-rose-600">{msg}</p> : null;

export const Banner: React.FC<{ tone?: 'error' | 'warn' | 'info' | 'ok'; children: React.ReactNode }> = ({ tone = 'error', children }) => {
  const cls = {
    error: 'bg-[#FFEBE6] text-[#BF2600]',
    warn: 'bg-[#FFFAE6] text-[#172B4D]',
    info: 'bg-[#DEEBFF] text-[#0747A6]',
    ok: 'bg-[#E3FCEF] text-[#006644]',
  }[tone];
  return <div className={`rounded-[3px] px-3.5 py-2.5 text-[13px] font-medium ${cls}`}>{children}</div>;
};

export const Pager: React.FC<{ page: number; pageSize: number; total: number; onPage: (p: number) => void }> = ({ page, pageSize, total, onPage }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#DFE1E6] px-4 py-3 text-xs text-[#6B778C]">
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
    <span className="mb-1 text-[12px] font-semibold text-[#6B778C]">{label}</span>
    {children}
  </div>
);

/** Inline filter controls: same look as inputs, but sized by the caller so they sit in one row. */
export const filterCls =
  'h-9 shrink-0 rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] px-2.5 text-[14px] text-[#172B4D] transition hover:bg-[#EBECF0] focus:border-[#4C9AFF] focus:bg-white focus:outline-hidden';
