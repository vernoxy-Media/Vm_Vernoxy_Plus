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
    <div className="mb-4 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 shadow-2xs">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
        <span className="tracking-tight">Workdays Distribution</span>
        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
          {totalScheduled} scheduled days
        </span>
      </div>

      <div
        className="h-2.5 w-full rounded-full bg-slate-200/80 flex overflow-hidden p-0.5 gap-0.5"
        role="progressbar"
        aria-label="Attendance distribution"
      >
        {presentPct > 0 && (
          <div
            style={{ width: `${presentPct}%` }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
            title={`Present: ${summary.present_days} days (${presentPct}%)`}
          />
        )}
        {leavePct > 0 && (
          <div
            style={{ width: `${leavePct}%` }}
            className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-300"
            title={`Leave: ${summary.leave_days} days (${leavePct}%)`}
          />
        )}
        {absentPct > 0 && (
          <div
            style={{ width: `${absentPct}%` }}
            className="bg-gradient-to-r from-rose-500 to-red-500 rounded-full transition-all duration-300"
            title={`Absent: ${summary.absent_days} days (${absentPct}%)`}
          />
        )}
        {remainingPct > 0 && (
          <div
            style={{ width: `${remainingPct}%` }}
            className="bg-slate-300/80 rounded-full transition-all duration-300"
            title={`Remaining: ${summary.remaining_days} days (${remainingPct}%)`}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-[11px] font-semibold text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Present: <strong className="text-slate-800">{summary.present_days}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span>Leave: <strong className="text-slate-800">{summary.leave_days}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>Absent: <strong className="text-slate-800">{summary.absent_days}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
          <span>Remaining: <strong className="text-slate-800">{summary.remaining_days}</strong></span>
        </div>
      </div>
    </div>
  );
};

