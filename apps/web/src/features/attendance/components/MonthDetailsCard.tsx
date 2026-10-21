import React from 'react';
import {
  CalendarDays,
  UserCheck,
  Clock,
  Coffee,
  CalendarOff,
  AlertTriangle,
  Award,
  HelpCircle,
} from 'lucide-react';
import type { MonthSummary } from '../types/attendance.types';
import { MonthDistributionBar } from './MonthDistributionBar';
import { formatHoursMinutes } from './TickingWorkedTimer';

export interface MonthDetailsCardProps {
  summary: MonthSummary;
}

export const MonthDetailsCard: React.FC<MonthDetailsCardProps> = ({ summary }) => {
  const totalWorkingHoursFormatted = `${formatHoursMinutes(summary.total_working_seconds)} hrs`;
  const totalBreakHoursFormatted = `${formatHoursMinutes(summary.total_break_seconds)} hrs`;
  const totalScheduled = summary.scheduled_days || 22;
  const attendanceRate =
    totalScheduled > 0 ? Math.round((summary.present_days / totalScheduled) * 100) : 0;

  const statItems = [
    {
      label: 'Scheduled Days',
      value: `${summary.scheduled_days} days`,
      icon: CalendarDays,
      iconBg: 'bg-blue-50 text-blue-600',
      tooltip: 'Total scheduled workdays in this month',
    },
    {
      label: 'Days Present',
      value: `${summary.present_days} of ${summary.scheduled_days}`,
      icon: UserCheck,
      iconBg: 'bg-emerald-50 text-emerald-600',
      tooltip: 'Days with recorded active production',
    },
    {
      label: 'Working Hours',
      value: totalWorkingHoursFormatted,
      icon: Clock,
      iconBg: 'bg-indigo-50 text-indigo-600',
      tooltip: 'Cumulative logged working hours',
    },
    {
      label: 'Break Hours',
      value: totalBreakHoursFormatted,
      icon: Coffee,
      iconBg: 'bg-amber-50 text-amber-600',
      tooltip: 'Cumulative break duration taken',
    },
    {
      label: 'Total Leaves',
      value: `${summary.leave_days} days`,
      icon: CalendarOff,
      iconBg: 'bg-amber-50 text-amber-700',
      tooltip: 'Approved leaves in this month',
    },
    {
      label: 'Absent Days',
      value: `${summary.absent_days} ${summary.absent_days === 1 ? 'day' : 'days'}`,
      icon: AlertTriangle,
      iconBg: 'bg-rose-50 text-rose-600',
      tooltip: 'Unscheduled absences requiring correction',
    },
  ];

  return (
    <div id="month-details-card" className="bg-white rounded-2xl border border-slate-300 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Month Overview</h2>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
            Summary & Ratio
          </span>
        </div>

        {/* Attendance Rate Highlight Banner */}
        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-slate-50 border border-blue-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="#e2e8f0"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="#2563eb"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={125.6}
                  strokeDashoffset={125.6 - (attendanceRate / 100) * 125.6}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute font-mono text-xs font-extrabold text-slate-900">
                {attendanceRate}%
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">Attendance Rate</span>
              <span className="text-[11px] text-slate-500 block">
                {summary.present_days} of {totalScheduled} days completed
              </span>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            attendanceRate >= 80
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {attendanceRate >= 80 ? 'On Track' : 'Needs Focus'}
          </span>
        </div>

        {/* Workdays Distribution */}
        <MonthDistributionBar summary={summary} />

        {/* 2-Column Balanced Grid of Stat Tiles */}
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all shadow-2xs group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-7 h-7 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="relative group/tip cursor-help">
                    <HelpCircle className="w-3 h-3 text-slate-300 hover:text-slate-500" />
                    <div className="hidden group-hover/tip:block absolute bottom-full right-0 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-white text-[10px] font-normal leading-tight shadow-md whitespace-nowrap z-20">
                      {item.tooltip}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  {item.label}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 block mt-0.5 tracking-tight font-mono truncate">
                  {item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 mt-5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span className="font-semibold text-slate-500">Effective Monthly Target</span>
        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md">
          {totalScheduled * 8} hrs planned
        </span>
      </div>
    </div>
  );
};

