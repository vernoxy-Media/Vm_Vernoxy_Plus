import React from 'react';
import {
  CalendarDays,
  UserCheck,
  Clock,
  Coffee,
  CalendarOff,
  AlertTriangle,
} from 'lucide-react';
import type { MonthSummary } from '../types/attendance.types';
import { StatCard } from './StatCard';
import { MonthDistributionBar } from './MonthDistributionBar';
import { formatHoursMinutes } from './TickingWorkedTimer';

export interface MonthDetailsCardProps {
  summary: MonthSummary;
}

export const MonthDetailsCard: React.FC<MonthDetailsCardProps> = ({ summary }) => {
  const totalWorkingHoursFormatted = `${formatHoursMinutes(summary.total_working_seconds)} hrs`;
  const totalBreakHoursFormatted = `${formatHoursMinutes(summary.total_break_seconds)} hrs`;
  const totalScheduled = summary.scheduled_days || 22;

  return (
    <div id="month-details-card" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
      <div>
        {/* Card Header: Title in blue */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h2 className="text-lg font-bold text-blue-600 tracking-tight">Month Details</h2>
          <span className="text-xs font-semibold text-slate-500">Summary & Ratio</span>
        </div>

        {/* Stacked CSS proportion bar */}
        <MonthDistributionBar summary={summary} />

        {/* Vertical list of StatCards with tooltip definition */}
        <div className="space-y-2.5">
          <StatCard
            label="Total working days"
            value={`${summary.scheduled_days} days`}
            icon={CalendarDays}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            tooltip="Number of scheduled workdays in the selected calendar month"
          />

          <StatCard
            label="Days present"
            value={`${summary.present_days} of ${summary.scheduled_days}`}
            icon={UserCheck}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
            tooltip="Days with recorded attendance and active production"
          />

          <StatCard
            label="Total working hours"
            value={totalWorkingHoursFormatted}
            icon={Clock}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
            tooltip="Cumulative logged working time across the entire month"
          />

          <StatCard
            label="Total break hours"
            value={totalBreakHoursFormatted}
            icon={Coffee}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
            tooltip="Cumulative break time taken during work shifts"
          />

          <StatCard
            label="Total leaves"
            value={`${summary.leave_days} days`}
            icon={CalendarOff}
            iconBgColor="bg-violet-50"
            iconColor="text-violet-600"
            tooltip="Approved full or half-day leaves taken"
          />

          <StatCard
            label="Absent days"
            value={`${summary.absent_days} ${summary.absent_days === 1 ? 'day' : 'days'}`}
            icon={AlertTriangle}
            iconBgColor="bg-rose-50"
            iconColor="text-rose-600"
            tooltip="Unscheduled or unapproved absences requiring correction"
          />
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span>Attendance Rate:</span>
        <span className="font-extrabold text-emerald-600">
          {totalScheduled > 0 ? Math.round((summary.present_days / totalScheduled) * 100) : 0}%
        </span>
      </div>
    </div>
  );
};
