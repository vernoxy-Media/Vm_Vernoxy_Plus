import React from 'react';
import type { AttendanceRegularization } from '../types/attendance.types';

const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  approved: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-100', dot: 'bg-emerald-500' },
  rejected: { pill: 'bg-rose-50 text-rose-700 ring-rose-100', dot: 'bg-rose-500' },
  cancelled: { pill: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  pending: { pill: 'bg-amber-50 text-amber-700 ring-amber-100', dot: 'bg-amber-500' },
};

export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
};

/** "2026-10-20" → { date: "20 Oct 2026", weekday: "Tue" } */
export function formatDay(workDate: string): { date: string; weekday: string } {
  const [y, m, d] = workDate.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    date: dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    weekday: dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
  };
}

const clock = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

/** The punches the employee asked for, as "09:30 AM → 06:00 PM" ("—" for the one they did not ask to change) */
export const RequestedTimes: React.FC<{ r: AttendanceRegularization }> = ({ r }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
    <span className={clock(r.requestedCheckInAt) ? 'text-slate-800' : 'text-slate-300'}>{clock(r.requestedCheckInAt) ?? '—'}</span>
    <span className="text-slate-300">→</span>
    <span className={clock(r.requestedCheckOutAt) ? 'text-slate-800' : 'text-slate-300'}>{clock(r.requestedCheckOutAt) ?? '—'}</span>
  </span>
);

export const submittedOn = (r: AttendanceRegularization) =>
  r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';

/** Small bordered type chip */
export const TypeChip: React.FC<{ type: string }> = ({ type }) => (
  <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{type}</span>
);
