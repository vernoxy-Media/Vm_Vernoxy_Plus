import React from 'react';
import { CheckCircle2, Clock, Send, Hourglass } from 'lucide-react';
import type { CalendarSummaryResult } from '../types';

interface CalendarKpiCardsProps {
  summary: CalendarSummaryResult;
  isLoading?: boolean;
  contextLabel?: string; // e.g. "This Month", "Oct 19–25", "Today"
}

function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export const CalendarKpiCards: React.FC<CalendarKpiCardsProps> = ({ summary, isLoading, contextLabel }) => {
  const cards = [
    {
      label: 'Tasks Done',
      value: summary.tasks_done,
      subtext: contextLabel || 'Completed this month',
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100',
    },
    {
      label: 'Submitted Tasks',
      value: summary.tasks_submitted,
      subtext: 'Awaiting review',
      icon: Send,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
    },
    {
      label: 'Approved Tasks',
      value: summary.tasks_approved,
      subtext: 'Approved by lead/admin',
      icon: Clock,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Total Allocated Time',
      value: formatMinutes(summary.total_allocated_minutes),
      subtext: 'Estimated total effort',
      icon: Hourglass,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      iconColor: 'text-indigo-600',
      borderColor: 'border-indigo-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`p-4 rounded-xl border bg-white shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between ${c.borderColor}`}
          >
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{c.label}</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">
                {isLoading ? <span className="animate-pulse text-slate-300">...</span> : c.value}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{c.subtext}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bgColor} ${c.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
