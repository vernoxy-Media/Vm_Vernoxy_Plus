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
      bgColor: 'bg-emerald-500 shadow-emerald-500/30',
      textColor: 'text-emerald-900',
      iconColor: 'text-white',
      borderColor: 'from-emerald-50 border-emerald-100',
    },
    {
      label: 'Submitted Tasks',
      value: summary.tasks_submitted,
      subtext: 'Awaiting review',
      icon: Send,
      bgColor: 'bg-amber-500 shadow-amber-500/30',
      textColor: 'text-amber-900',
      iconColor: 'text-white',
      borderColor: 'from-amber-50 border-amber-100',
    },
    {
      label: 'Approved Tasks',
      value: summary.tasks_approved,
      subtext: 'Approved by lead/admin',
      icon: Clock,
      bgColor: 'bg-blue-500 shadow-blue-500/30',
      textColor: 'text-blue-900',
      iconColor: 'text-white',
      borderColor: 'from-blue-50 border-blue-100',
    },
    {
      label: 'Total Allocated Time',
      value: formatMinutes(summary.total_allocated_minutes),
      subtext: 'Estimated total effort',
      icon: Hourglass,
      bgColor: 'bg-violet-500 shadow-violet-500/30',
      textColor: 'text-violet-900',
      iconColor: 'text-white',
      borderColor: 'from-violet-50 border-violet-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className={`flex items-center gap-3 rounded-2xl border bg-gradient-to-br ${c.borderColor} to-white p-3 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md sm:p-4`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md sm:h-11 sm:w-11 ${c.bgColor} ${c.iconColor}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className={`text-xl font-extrabold leading-none tracking-tight sm:text-2xl ${c.textColor}`}>
                {isLoading ? <span className="animate-pulse text-slate-300">...</span> : c.value}
              </h3>
              <p className="mt-1 truncate text-[11px] font-semibold text-slate-600">{c.label}</p>
              <p className="hidden truncate text-[11px] text-slate-400 sm:block">{c.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
