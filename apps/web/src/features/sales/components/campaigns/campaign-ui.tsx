import React from 'react';
import type { CallingStatus, CampaignStatus } from '../../types/campaign.types';

export const inputCls =
  'h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-500';
export const textareaCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-2xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
export const labelCls = 'mb-1 block text-[13px] font-semibold text-gray-700';
export const primaryBtn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryBtn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-2xs transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
export const cardCls = 'rounded-2xl border border-slate-200/80 bg-white shadow-xs';

const CAMPAIGN_TONES: Record<CampaignStatus, string> = {
  Draft: 'bg-gray-100 text-gray-700 ring-gray-200',
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Paused: 'bg-amber-50 text-amber-700 ring-amber-200',
  Completed: 'bg-blue-50 text-blue-700 ring-blue-200',
};

export const CampaignStatusPill: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
      CAMPAIGN_TONES[status as CampaignStatus] ?? CAMPAIGN_TONES.Draft
    }`}
  >
    {status}
  </span>
);

const CALLING_TONES: Record<CallingStatus, string> = {
  Pending: 'bg-gray-100 text-gray-700 ring-gray-200',
  Connected: 'bg-sky-50 text-sky-700 ring-sky-200',
  'Not Received': 'bg-rose-50 text-rose-700 ring-rose-200',
  Interested: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Not Interested': 'bg-slate-100 text-slate-600 ring-slate-200',
};

export const CallingStatusPill: React.FC<{ status: CallingStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${CALLING_TONES[status] ?? CALLING_TONES.Pending}`}>
    {status}
  </span>
);

export const KpiCard: React.FC<{ label: string; value: number | string; hint?: string; tone?: 'default' | 'good' | 'warn' }> = ({
  label,
  value,
  hint,
  tone = 'default',
}) => {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-gray-900';
  return (
    <div className={`${cardCls} p-4`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${color}`}>{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
};

/** A thin progress bar: how many of the target are done. */
export const ProgressBar: React.FC<{ done: number; total: number; className?: string }> = ({ done, total, className = '' }) => {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-gray-100 ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? <p className="mt-1 text-[12px] font-medium text-rose-600">{message}</p> : null;

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

/** "2026-11-18" -> "18 Nov 2026" */
export function fmtDay(ymd: string | null | undefined): string {
  if (!ymd) return '-';
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '-' : dateFmt.format(d);
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : dateTimeFmt.format(d);
}

export function isDueByToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return new Date(iso).getTime() <= end.getTime();
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}
