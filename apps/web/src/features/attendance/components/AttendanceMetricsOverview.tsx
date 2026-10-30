import React, { useMemo } from 'react';
import { User, TrendingUp } from 'lucide-react';
import type { MonthSummary, DayRecord, AttendanceStatistics } from '../types/attendance.types';

export interface AttendanceMetricsOverviewProps {
  todayWorkedSeconds: number;
  todayBreakSeconds: number;
  monthSummary: MonthSummary;
  records: DayRecord[];
  statistics?: AttendanceStatistics;
}

export const AttendanceStatsSummaryCard: React.FC<{
  todayWorkedSeconds: number;
  todayBreakSeconds: number;
  records: DayRecord[];
  monthSummary: MonthSummary;
  statistics?: AttendanceStatistics;
}> = ({ todayWorkedSeconds, todayBreakSeconds, records, monthSummary, statistics }) => {
  const formatShortHM = (sec: number) => {
    if (!sec || sec <= 0) return '0m';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const todayWorkedText = formatShortHM(todayWorkedSeconds);
  const todayBreakText = formatShortHM(todayBreakSeconds);

  // Overall Performance calculations from records/monthSummary
  const presentDays = monthSummary.present_days || records.filter((r) => Boolean(r.punch_in)).length || 1;
  const totalWorkedSec = monthSummary.total_working_seconds || records.reduce((acc, r) => acc + (r.production_seconds || 0), 0);
  const avgWorkedSec = statistics?.this_month?.worked_hours
    ? Math.round((statistics.this_month.worked_hours * 3600) / Math.max(1, presentDays))
    : Math.round(totalWorkedSec / Math.max(1, presentDays));
  const avgWorkedText = formatShortHM(avgWorkedSec);

  // Calculate On-Time Percentage
  const onTimePercentage = useMemo(() => {
    const presentRecords = records.filter((r) => Boolean(r.punch_in));
    if (presentRecords.length === 0) return 0;
    const onTimeRecords = presentRecords.filter((r) => {
      if ((r as any)?.is_late !== undefined) return !(r as any).is_late;
      const match = r.punch_in?.match(/^(\d{1,2}):(\d{2})/);
      if (!match) return true;
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      return h * 60 + m <= 540; // 09:00 AM or earlier
    });
    return Math.round((onTimeRecords.length / presentRecords.length) * 100);
  }, [records]);

  return (
    <div
      id="attendance-stats-summary-card"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between"
    >
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-4">
        ATTENDANCE STATS (LAST 30 DAYS)
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-center">
        {/* Row 1: Today */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <User className="w-5 h-5 fill-white stroke-white" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">Today</span>
          </div>

          <div className="flex items-center">
            <div className="text-right">
              <div className="font-mono text-sm font-extrabold text-slate-900">{todayWorkedText}</div>
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">WORKED</div>
            </div>

            <div className="w-[1px] h-7 bg-slate-200 mx-4" />

            <div className="text-right">
              <div className="font-mono text-sm font-extrabold text-slate-900">{todayBreakText}</div>
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">ON BREAK</div>
            </div>
          </div>
        </div>

        {/* Row 2: Overall Performance */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">Overall Performance</span>
          </div>

          <div className="flex items-center">
            <div className="text-right">
              <div className="font-mono text-sm font-extrabold text-slate-900">{avgWorkedText}</div>
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">AVG WORKED</div>
            </div>

            <div className="w-[1px] h-7 bg-slate-200 mx-4" />

            <div className="text-right">
              <div className="font-mono text-sm font-extrabold text-slate-900">{onTimePercentage}%</div>
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">ON TIME</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AttendanceBreakdownRow: React.FC<{
  monthSummary: MonthSummary;
  records: DayRecord[];
}> = ({ monthSummary, records }) => {
  // 1. Calculate Exceptions
  const lateCount = useMemo(() => {
    return records.filter((r) => {
      if ((r as any)?.is_late !== undefined) return Boolean((r as any).is_late);
      if (!r.punch_in) return false;
      const match = r.punch_in.match(/^(\d{1,2}):(\d{2})/);
      if (!match) return false;
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      return h * 60 + m > 540; // After 09:00 AM
    }).length;
  }, [records]);

  const earlyExitCount = useMemo(() => {
    return records.filter((r) => {
      if ((r as any)?.is_early_exit !== undefined) return Boolean((r as any).is_early_exit);
      if (!r.punch_out) return false;
      const match = r.punch_out.match(/^(\d{1,2}):(\d{2})/);
      if (!match) return false;
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      return h * 60 + m < 1050; // Before 05:30 PM
    }).length;
  }, [records]);

  // 2. Format Hours Summary
  const productiveSec = monthSummary.total_working_seconds || records.reduce((acc, r) => acc + (r.production_seconds || 0), 0);
  const breakSec = monthSummary.total_break_seconds || records.reduce((acc, r) => acc + (r.break_seconds || 0), 0);

  const formatHM = (sec: number) => {
    if (!sec || sec <= 0) return '0m';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const productiveHoursText = formatHM(productiveSec);
  const breakHoursText = formatHM(breakSec);

  // 3. Monthly Attendance counts
  const totalWorkingDays = monthSummary.scheduled_days || 20;
  const presentDays = monthSummary.present_days || 1;
  const absentDays = monthSummary.absent_days !== undefined ? monthSummary.absent_days : 18;
  const leaveDays = monthSummary.leave_days || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 lg:gap-5 items-stretch">
      {/* Card 1: MONTHLY ATTENDANCE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-4">
          MONTHLY ATTENDANCE
        </div>

        <div className="space-y-3.5 text-xs font-semibold">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Total Working Days</span>
            <span className="font-extrabold text-slate-900 font-mono text-sm">{totalWorkingDays} days</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Present</span>
            <span className="font-extrabold text-slate-900 font-mono text-sm">{presentDays} days</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Absent</span>
            <span className="font-extrabold text-rose-500 font-mono text-sm">{absentDays} days</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">On Leave</span>
            <span className="font-extrabold text-amber-500 font-mono text-sm">{leaveDays} days</span>
          </div>
        </div>
      </div>

      {/* Card 2: EXCEPTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-4">
          EXCEPTIONS
        </div>

        <div className="space-y-3.5 text-xs font-semibold">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Late Arrivals</span>
            <span className="font-extrabold text-slate-900 font-mono text-sm">{lateCount}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Early Exits</span>
            <span className="font-extrabold text-slate-900 font-mono text-sm">{earlyExitCount}</span>
          </div>
        </div>
      </div>

      {/* Card 3: HOURS SUMMARY */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-4">
          HOURS SUMMARY
        </div>

        <div className="space-y-3.5 text-xs font-semibold">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Productive Hours</span>
            <span className="font-extrabold text-slate-900 font-mono text-sm">{productiveHoursText}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Break Hours</span>
            <span className="font-extrabold text-slate-900 font-mono text-sm">{breakHoursText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
