import React from 'react';
import { AlarmClock, CalendarClock, PhoneOff, UserCheck, X } from 'lucide-react';

export interface QuickFilterState {
  lead_by: string;
  follow_up_filter: string;
}

export interface LeadQuickFiltersProps {
  value: QuickFilterState;
  onChange: (patch: Partial<QuickFilterState>) => void;
  onClearAll?: () => void;
  hasAnyFilter: boolean;
}

// Each chip has its own colour, so what it means is clear before it is read.
const TONES = {
  blue: { icon: 'text-blue-500', on: 'border-blue-200 bg-blue-50 text-blue-700 ring-blue-500/20', dot: 'bg-blue-500' },
  rose: { icon: 'text-rose-500', on: 'border-rose-200 bg-rose-50 text-rose-700 ring-rose-500/20', dot: 'bg-rose-500' },
  amber: { icon: 'text-amber-500', on: 'border-amber-200 bg-amber-50 text-amber-800 ring-amber-500/20', dot: 'bg-amber-500' },
  slate: { icon: 'text-slate-400', on: 'border-slate-300 bg-slate-100 text-slate-700 ring-slate-500/20', dot: 'bg-slate-500' },
} as const;

/** One-tap filters for the things people look for every day. */
export const LeadQuickFilters: React.FC<LeadQuickFiltersProps> = ({ value, onChange, onClearAll, hasAnyFilter }) => {
  const chips = [
    { id: 'mine', label: 'My leads', Icon: UserCheck, tone: 'blue' as const, on: value.lead_by === 'me', toggle: () => onChange({ lead_by: value.lead_by === 'me' ? '' : 'me' }) },
    { id: 'overdue', label: 'Overdue', Icon: AlarmClock, tone: 'rose' as const, on: value.follow_up_filter === 'overdue', toggle: () => onChange({ follow_up_filter: value.follow_up_filter === 'overdue' ? '' : 'overdue' }) },
    { id: 'today', label: 'Due today', Icon: CalendarClock, tone: 'amber' as const, on: value.follow_up_filter === 'today', toggle: () => onChange({ follow_up_filter: value.follow_up_filter === 'today' ? '' : 'today' }) },
    { id: 'none', label: 'No follow-up', Icon: PhoneOff, tone: 'slate' as const, on: value.follow_up_filter === 'none', toggle: () => onChange({ follow_up_filter: value.follow_up_filter === 'none' ? '' : 'none' }) },
  ];

  return (
    <div
      role="group"
      aria-label="Quick filters"
      className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pr-6 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] sm:flex-wrap sm:overflow-visible sm:pr-0 sm:[mask-image:none]"
    >
      {chips.map(({ id, label, Icon, tone, on, toggle }) => {
        const t = TONES[tone];
        return (
          <button
            key={id}
            type="button"
            onClick={toggle}
            aria-pressed={on}
            className={`group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-all focus:outline-hidden focus-visible:ring-2 ${
              on ? `${t.on} ring-2 shadow-2xs` : 'border-transparent bg-gray-100/70 text-gray-600 ring-primary/20 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 transition-colors ${on ? '' : t.icon} ${on ? '' : 'group-hover:opacity-100'}`} />
            {label}
            {on && <X className="-mr-0.5 h-3 w-3 opacity-60" aria-hidden />}
          </button>
        );
      })}

      {hasAnyFilter && onClearAll && (
        <>
          <span className="mx-0.5 hidden h-4 w-px shrink-0 bg-gray-200 sm:block" aria-hidden />
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex h-8 shrink-0 items-center rounded-lg px-2 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
          >
            Clear all
          </button>
        </>
      )}
    </div>
  );
};
