import React from 'react';
import { BarChart3, Sun, Calendar, Clock, Compass, Zap } from 'lucide-react';
import type { AttendanceStatistics } from '../types/attendance.types';
import { ProgressStatRow } from './ProgressStatRow';

export interface StatisticsCardProps {
  statistics: AttendanceStatistics;
  dayLabel?: string;
  weekLabel?: string;
  monthLabel?: string;
  selectedDate?: string;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  statistics,
  dayLabel = 'Today',
  weekLabel = 'This Week',
  monthLabel = 'This Month',
}) => {
  return (
    <div id="statistics-card" className="bg-white rounded-2xl border border-slate-300 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Work Statistics</h2>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
            Work Metrics
          </span>
        </div>

        {/* 4-5 progress rows with rich gradients and icons */}
        <div className="mt-4 space-y-2.5">
          {/* Day Metric - Teal/emerald gradient */}
          <ProgressStatRow
            label={dayLabel}
            current={statistics.today.worked_hours}
            target={statistics.today.target_hours}
            gradientClass="bg-gradient-to-r from-emerald-500 to-teal-400"
            icon={Sun}
            badgeBgColor="bg-emerald-50"
            badgeTextColor="text-emerald-600"
          />

          {/* Week Metric - Blue/indigo gradient */}
          <ProgressStatRow
            label={weekLabel}
            current={statistics.this_week.worked_hours}
            target={statistics.this_week.target_hours}
            gradientClass="bg-gradient-to-r from-blue-500 to-indigo-500"
            icon={Calendar}
            badgeBgColor="bg-blue-50"
            badgeTextColor="text-blue-600"
          />

          {/* Month Metric - Violet/purple gradient */}
          <ProgressStatRow
            label={monthLabel}
            current={statistics.this_month.worked_hours}
            target={statistics.this_month.target_hours}
            gradientClass="bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500"
            icon={Clock}
            badgeBgColor="bg-indigo-50"
            badgeTextColor="text-indigo-600"
          />

          {/* Remaining - Amber/orange gradient */}
          <ProgressStatRow
            label="Remaining Hours"
            current={statistics.remaining.worked_hours}
            target={statistics.remaining.target_hours}
            gradientClass="bg-gradient-to-r from-amber-500 to-orange-400"
            icon={Compass}
            badgeBgColor="bg-amber-50"
            badgeTextColor="text-amber-600"
          />

          {/* Overtime (optional mockup row) */}
          {statistics.overtime_hours !== undefined && (
            <ProgressStatRow
              label="Overtime"
              current={statistics.overtime_hours}
              target={undefined}
              gradientClass="bg-gradient-to-r from-rose-500 to-pink-500"
              icon={Zap}
              badgeBgColor="bg-rose-50"
              badgeTextColor="text-rose-600"
            />
          )}
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span className="font-medium text-slate-500">Target: 8 hrs / day</span>
        <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
          40 hrs / week
        </span>
      </div>
    </div>
  );
};

