import React from 'react';
import { AlarmClock, CalendarClock, CalendarDays, PhoneOff } from 'lucide-react';
import type { FollowUpFlag } from '../../types/sales.types';
import { formatDateTimeIST, parseDate } from '../../utils/date';

export interface FollowUpFlagBadgeProps {
  flag?: FollowUpFlag | string | null;
  at?: string | null;
  noFollowUp?: boolean;
  /** "stack" (default): label over date, good for cards and table cells. "inline": one line. */
  layout?: 'stack' | 'inline';
  className?: string;
}

const LOOK = {
  overdue: { label: 'Overdue', Icon: AlarmClock, pill: 'bg-rose-50 border-rose-200', chip: 'bg-rose-100 text-rose-600', title: 'text-rose-700', sub: 'text-rose-500' },
  today: { label: 'Due today', Icon: CalendarClock, pill: 'bg-amber-50 border-amber-200', chip: 'bg-amber-100 text-amber-600', title: 'text-amber-800', sub: 'text-amber-600' },
  upcoming: { label: 'Upcoming', Icon: CalendarDays, pill: 'bg-emerald-50 border-emerald-200', chip: 'bg-emerald-100 text-emerald-600', title: 'text-emerald-800', sub: 'text-emerald-600' },
  other: { label: 'Pending', Icon: CalendarDays, pill: 'bg-slate-50 border-slate-200', chip: 'bg-slate-100 text-slate-500', title: 'text-slate-700', sub: 'text-slate-500' },
} as const;

/** "27 Oct, 4:43 PM" (the year only when it is not this year), in IST. */
function shortWhen(at: string): string {
  const d = parseDate(at);
  if (!d) return '—';
  const sameYear = new Date().getFullYear() === Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(d));
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/** How late or how soon, as a short phrase: "3d late", "in 2h". */
function distance(at: string): string {
  const d = parseDate(at);
  if (!d) return '';
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const text = mins < 60 ? `${Math.max(mins, 1)}m` : mins < 60 * 24 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  return diff < 0 ? `${text} late` : `in ${text}`;
}

export const FollowUpFlagBadge: React.FC<FollowUpFlagBadgeProps> = ({ flag, at, noFollowUp = false, layout = 'stack', className = '' }) => {
  if (noFollowUp) {
    return (
      <span
        title="Open lead with no follow-up for 7+ days"
        className={`inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 ${className}`}
      >
        <PhoneOff className="h-3.5 w-3.5 text-rose-500" />
        No follow-up
      </span>
    );
  }

  if (!flag && !at) return <span className="text-xs italic text-slate-400">None</span>;

  const look = LOOK[(flag as keyof typeof LOOK) in LOOK ? (flag as keyof typeof LOOK) : 'other'];
  const { Icon } = look;

  return (
    <span
      title={at ? `Follow-up due: ${formatDateTimeIST(at)}` : look.label}
      className={`inline-flex max-w-full items-center gap-2 rounded-xl border px-2 py-1.5 ${look.pill} ${className}`}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${look.chip}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      {layout === 'inline' ? (
        <span className={`truncate text-[11px] font-semibold ${look.title}`}>
          {look.label}
          {at && <span className={`ml-1 font-medium ${look.sub}`}>· {shortWhen(at)}</span>}
        </span>
      ) : (
        <span className="min-w-0 leading-tight">
          <span className={`flex items-center gap-1.5 text-[11px] font-bold ${look.title}`}>
            {look.label}
            {at && <span className={`rounded-full bg-white/70 px-1.5 py-px text-[9px] font-semibold ${look.sub}`}>{distance(at)}</span>}
          </span>
          {at && <span className={`block truncate text-[11px] font-medium ${look.sub}`}>{shortWhen(at)}</span>}
        </span>
      )}
    </span>
  );
};
