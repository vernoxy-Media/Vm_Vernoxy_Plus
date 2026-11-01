import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Send,
  Hourglass,
  Users,
  CalendarCheck,
  AlertCircle,
} from 'lucide-react';
import type { CalendarSummaryResult } from '../types';
import type { LeaveCalendarItem } from '@/features/leave/hooks/use-leave';

interface CalendarKpiCardsProps {
  summary?: CalendarSummaryResult;
  leaves?: LeaveCalendarItem[];
  kpiMode?: 'tasks' | 'leaves' | 'attendance';
  isLoading?: boolean;
  contextLabel?: string;
  selectedDate?: Date;
}

function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export const CalendarKpiCards: React.FC<CalendarKpiCardsProps> = ({
  summary,
  leaves = [],
  kpiMode = 'tasks',
  isLoading,
  contextLabel,
  selectedDate,
}) => {
  const leaveMetrics = useMemo(() => {
    if (kpiMode !== 'leaves') {
      return { distinctEmployees: 0, paidDays: 0, unpaidDays: 0, onLeaveTargetDayCount: 0 };
    }
    const targetDate = selectedDate || new Date();
    const targetYMD = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    const employeeIds = new Set<number>();
    let paidDays = 0;
    let unpaidDays = 0;
    let onLeaveTargetDayCount = 0;

    for (const l of leaves) {
      employeeIds.add(l.emp_id);
      const daysCount = Number(l.leave_days) || 1;
      if (l.is_paid) {
        paidDays += daysCount;
      } else {
        unpaidDays += daysCount;
      }

      const fromStr = l.from_date.slice(0, 10);
      const toStr = l.to_date.slice(0, 10);
      if (targetYMD >= fromStr && targetYMD <= toStr) {
        onLeaveTargetDayCount += 1;
      }
    }

    return {
      distinctEmployees: employeeIds.size,
      paidDays,
      unpaidDays,
      onLeaveTargetDayCount,
    };
  }, [leaves, selectedDate, kpiMode]);

  if (kpiMode === 'leaves') {
    const leaveCards = [
      {
        label: 'Employees on Leave',
        value: leaveMetrics.distinctEmployees,
        subtext: contextLabel || 'In current range',
        icon: Users,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-100',
      },
      {
        label: 'Paid Leave Days',
        value: `${leaveMetrics.paidDays}d`,
        subtext: 'Approved paid leaves',
        icon: CalendarCheck,
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        iconColor: 'text-emerald-600',
        borderColor: 'border-emerald-100',
      },
      {
        label: 'Unpaid / LOP Days',
        value: `${leaveMetrics.unpaidDays}d`,
        subtext: 'Loss of pay leaves',
        icon: AlertCircle,
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        iconColor: 'text-rose-600',
        borderColor: 'border-rose-100',
      },
      {
        label: 'On Leave Selected Day',
        value: leaveMetrics.onLeaveTargetDayCount,
        subtext: selectedDate
          ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'Today',
        icon: Clock,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        iconColor: 'text-amber-600',
        borderColor: 'border-amber-100',
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {leaveCards.map((c, i) => {
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
  }

  const safeSummary = summary || {
    tasks_done: 0,
    tasks_submitted: 0,
    tasks_approved: 0,
    total_allocated_minutes: 0,
    attendance_present_days: 0,
    attendance_absent_days: 0,
    attendance_half_days: 0,
    attendance_late_days: 0,
    attendance_total_work_minutes: 0,
  };

  const taskCards = [
    {
      label: 'Tasks Done',
      value: safeSummary.tasks_done,
      subtext: contextLabel || 'Completed this month',
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100',
    },
    {
      label: 'Submitted Tasks',
      value: safeSummary.tasks_submitted,
      subtext: 'Awaiting review',
      icon: Send,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
    },
    {
      label: 'Approved Tasks',
      value: safeSummary.tasks_approved,
      subtext: 'Approved by lead/admin',
      icon: Clock,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Total Allocated Time',
      value: formatMinutes(safeSummary.total_allocated_minutes),
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
      {taskCards.map((c, i) => {
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
