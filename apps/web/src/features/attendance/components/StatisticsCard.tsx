import React from 'react';
import type { AttendanceStatistics } from '../types/attendance.types';
import { ProgressStatRow } from './ProgressStatRow';

export interface StatisticsCardProps {
  statistics: AttendanceStatistics;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({ statistics }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
      <div>
        {/* Card Header: Title in blue */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold text-blue-600 tracking-tight">Statistics</h2>
          <span className="text-xs font-semibold text-slate-500">Work Metrics</span>
        </div>

        {/* 4 progress rows with coloured bars + numeric text as in mockup */}
        <div className="mt-4 space-y-2.5">
          {/* Today - Teal/emerald */}
          <ProgressStatRow
            label="Today"
            current={statistics.today.worked_hours}
            target={statistics.today.target_hours}
            barColor="bg-emerald-400"
          />

          {/* This Week - Coral/Red-Orange */}
          <ProgressStatRow
            label="This Week"
            current={statistics.this_week.worked_hours}
            target={statistics.this_week.target_hours}
            barColor="bg-rose-500"
          />

          {/* This Month - Amber/Orange */}
          <ProgressStatRow
            label="This Month"
            current={statistics.this_month.worked_hours}
            target={statistics.this_month.target_hours}
            barColor="bg-amber-400"
          />

          {/* Remaining - Blue */}
          <ProgressStatRow
            label="Remaining"
            current={statistics.remaining.worked_hours}
            target={statistics.remaining.target_hours}
            barColor="bg-blue-500"
          />

          {/* Overtime (optional mockup row) */}
          {statistics.overtime_hours !== undefined && (
            <ProgressStatRow
              label="Overtime"
              current={statistics.overtime_hours}
              target={undefined}
              barColor="bg-yellow-400"
            />
          )}
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span>Standard work target: 8 hrs / day</span>
        <span className="font-semibold text-slate-700">40 hrs / week</span>
      </div>
    </div>
  );
};
