import React from 'react';
import type { LeadCounters, LeadStatusType } from '../../types/sales.types';

export interface LeadSummaryStripProps {
  counters: LeadCounters;
  isLoading?: boolean;
  /** The stage that is showing now ("All" for the whole pipeline). */
  active?: LeadStatusType | 'All';
  onSelect?: (stage: LeadStatusType | 'All') => void;
}

const STAGES: Array<{ id: LeadStatusType; label: string; bar: string }> = [
  { id: 'New', label: 'New', bar: 'bg-blue-500' },
  { id: 'Contacted', label: 'Contacted', bar: 'bg-amber-500' },
  { id: 'Qualified', label: 'Qualified', bar: 'bg-violet-500' },
  { id: 'On Hold', label: 'On Hold', bar: 'bg-orange-400' },
  { id: 'Converted', label: 'Won', bar: 'bg-emerald-500' },
  { id: 'Lost', label: 'Lost', bar: 'bg-slate-400' },
];

/** The pipeline in numbers: total, then one tile per stage. A tile also filters the board. */
export const LeadSummaryStrip: React.FC<LeadSummaryStripProps> = ({ counters, isLoading = false, active = 'All', onSelect }) => {
  const by = counters.by_status ?? ({} as LeadCounters['by_status']);
  const total = STAGES.reduce((n, s) => n + (by[s.id] ?? 0), 0);

  const tiles: Array<{ id: LeadStatusType | 'All'; label: string; value: number; bar: string }> = [
    { id: 'All', label: 'Total Leads', value: total, bar: 'bg-slate-700' },
    ...STAGES.map((s) => ({ id: s.id as LeadStatusType | 'All', label: s.label, value: by[s.id] ?? 0, bar: s.bar })),
  ];

  return (
    <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 lg:grid lg:grid-cols-7 lg:overflow-visible">
      {tiles.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect?.(t.id)}
            aria-pressed={on}
            className={`relative flex shrink-0 snap-start items-baseline gap-2 overflow-hidden rounded-xl border bg-white py-2.5 pl-4 pr-3.5 text-left transition-all lg:min-w-0 ${
              on ? 'border-gray-300 shadow-md ring-2 ring-gray-900/5' : 'border-gray-200/80 shadow-2xs hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <span className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${t.bar}`} aria-hidden="true" />
            <span className="flex min-w-0 items-baseline gap-2">
              <span className={`text-lg font-bold leading-none tracking-tight text-gray-900 ${isLoading ? 'animate-pulse text-gray-300' : ''}`}>{isLoading ? '––' : t.value.toLocaleString('en-IN')}</span>
              <span className="truncate text-[13px] font-medium text-gray-500">{t.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
