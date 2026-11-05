import React from 'react';

export { StatCard, Field, inputCls, initials } from '@/features/complaint/components/complaint-ui';

export const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

interface Tone {
  chip: string;
  dot: string;
}

const CLAIM_STATUS: Record<string, Tone & { label: string }> = {
  DRAFT: { label: 'Draft', chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  SUBMITTED: { label: 'Under Review', chip: 'bg-amber-50 text-amber-700 ring-amber-100', dot: 'bg-amber-500' },
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
}

/** Policy flags as small pills; `clean` is what to show when there are none. */
export const FlagChips: React.FC<{ claim: FlagSource; clean?: string; limitLabel?: string }> = ({ claim, clean = '—', limitLabel = 'Limit' }) => {
  const chips: Array<{ key: string; label: string; cls: string; title: string }> = [];
  if (claim.is_above_limit) chips.push({ key: 'limit', label: limitLabel, cls: 'bg-amber-50 text-amber-700 ring-amber-100', title: 'Exceeds category limit' });
  if (claim.is_possible_duplicate) chips.push({ key: 'dup', label: 'Duplicate', cls: 'bg-rose-50 text-rose-700 ring-rose-100', title: 'Possible duplicate' });
  if (claim.is_late) chips.push({ key: 'late', label: 'Late', cls: 'bg-orange-50 text-orange-700 ring-orange-100', title: 'Submitted late' });
  if (chips.length === 0) return <span className="text-xs text-slate-300">{clean}</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {chips.map((c) => (
        <span key={c.key} title={c.title} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ${c.cls}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
};
