import React from 'react';
import type { MonthSummary } from '../types/attendance.types';

export interface MonthDistributionBarProps {
  summary: MonthSummary;
}

export const MonthDistributionBar: React.FC<MonthDistributionBarProps> = ({ summary }) => {
  const totalScheduled = summary.scheduled_days || 22;
  const presentPct = Math.min(Math.round((summary.present_days / totalScheduled) * 100), 100);
  const leavePct = Math.min(Math.round((summary.leave_days / totalScheduled) * 100), 100);
  const absentPct = Math.min(Math.round((summary.absent_days / totalScheduled) * 100), 100);
  const remainingPct = Math.max(0, 100 - (presentPct + leavePct + absentPct));

  return (
    <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
        <span>Workdays Distribution</span>
        <span>{totalScheduled} scheduled days</span>
      </div>

      <div
        className="h-2.5 w-full rounded-full bg-slate-200 flex overflow-hidden"
        role="progressbar"
        aria-label="Attendance distribution"
      >
        <div
          style={{ width: `${presentPct}%` }}
          className="bg-emerald-500 transition-all duration-300"
          title={`Present: ${summary.present_days} days (${presentPct}%)`}
        />
        <div
          style={{ width: `${leavePct}%` }}
          className="bg-violet-500 transition-all duration-300"
          title={`Leave: ${summary.leave_days} days (${leavePct}%)`}
        />
        <div
          style={{ width: `${absentPct}%` }}
          className="bg-rose-500 transition-all duration-300"
          title={`Absent: ${summary.absent_days} days (${absentPct}%)`}
        />
        <div
          style={{ width: `${remainingPct}%` }}
          className="bg-slate-300 transition-all duration-300"
          title={`Remaining: ${summary.remaining_days} days (${remainingPct}%)`}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px] font-semibold text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Present ({summary.present_days})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
          <span>Leave ({summary.leave_days})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
          <span>Absent ({summary.absent_days})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
          <span>Remaining ({summary.remaining_days})</span>
        </div>
      </div>
    </div>
  );
};
