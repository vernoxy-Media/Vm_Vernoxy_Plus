import React, { useMemo } from 'react';
import { User, TrendingUp, BarChart2, Calendar, AlertTriangle, Layers } from 'lucide-react';
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
  monthSummary?: MonthSummary;
  statistics?: AttendanceStatistics;
}> = ({ todayWorkedSeconds, todayBreakSeconds, records }) => {
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
  const completedPresentDays = records.filter(
    (r) => r.status === 'present' || r.status === 'half_day' || (r.punch_in && r.punch_out && !r.is_today)
  ).length;

  const avgWorkedSec = completedPresentDays > 0
    ? Math.round(
        records
          .filter((r) => r.status === 'present' || r.status === 'half_day' || (r.punch_in && r.punch_out && !r.is_today))
          .reduce((acc, r) => acc + (r.production_seconds || 0), 0) / completedPresentDays
      )
    : todayWorkedSeconds > 0
    ? todayWorkedSeconds
    : 0;

  const avgWorkedText = formatShortHM(avgWorkedSec);

  // Calculate On-Time Percentage
  const onTimePercentage = useMemo(() => {
    const presentRecords = records.filter((r) => r.status === 'present');
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
      className="bg-white rounded-[22px] border border-[#D4DCE6] shadow-floating-card card-hover-lift p-6 flex flex-col justify-between"
    >
      {/* Card Header matching reference image: purple icon + title */}
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-4 h-4 text-[#5B4CF8] stroke-[1.75]" />
        <h3 className="font-semibold text-[#1E293B] text-[15px] tracking-tight">
          Attendance Stats <span className="text-[#64748B] font-medium text-xs">(Last 30 Days)</span>
        </h3>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {/* Row 1: Today */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF2F7]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-400 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <User className="w-4 h-4 fill-white stroke-white" />
            </div>
            <span className="font-semibold text-sm text-[#1E293B] tracking-tight">Today</span>
          </div>

          <div className="flex items-center gap-5 sm:gap-7">
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight leading-none font-mono">
                {todayWorkedText}
              </div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mt-1">
                Worked
              </div>
            </div>

            <div className="text-right min-w-[55px]">
              <div className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight leading-none font-mono">
                {todayBreakText}
              </div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mt-1">
                On Break
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Overall Performance */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF2F7]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-4 h-4 stroke-[1.75]" />
            </div>
            <span className="font-semibold text-sm text-[#1E293B] tracking-tight">Overall Performance</span>
          </div>

          <div className="flex items-center gap-5 sm:gap-7">
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight leading-none font-mono">
                {avgWorkedText}
              </div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mt-1">
                Avg Worked
              </div>
            </div>

            <div className="text-right min-w-[55px]">
              <div className="text-xl sm:text-2xl font-black text-[#1E293B] tracking-tight leading-none font-mono">
                {onTimePercentage}%
              </div>
              <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mt-1">
                On Time
              </div>
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
  statistics?: AttendanceStatistics;
}> = ({ monthSummary, records, statistics }) => {
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

  const missingClockoutCount = useMemo(() => {
    return records.filter((r) => {
      if (r.status === 'incomplete') return true;
      if (r.punch_in && !r.punch_out && !r.is_today) return true;
      return false;
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

  // OT Hours
  const otSec = useMemo(() => {
    if (statistics?.overtime_hours !== undefined && statistics.overtime_hours > 0) {
      return Math.round(statistics.overtime_hours * 3600);
    }
    return records.reduce((acc, r) => {
      const recOt = (r as any)?.overtime_seconds;
      if (typeof recOt === 'number') return acc + recOt;
      if (r.production_seconds && r.production_seconds > 28800) {
        return acc + (r.production_seconds - 28800);
      }
      return acc;
    }, 0);
  }, [statistics, records]);
  const otHoursText = formatHM(otSec);

  // 3. Monthly Attendance counts
  const totalWorkingDays = monthSummary.scheduled_days ?? 0;
  const presentDays = monthSummary.present_days ?? 0;
  const absentDays = monthSummary.absent_days ?? 0;
  const leaveDays = monthSummary.leave_days ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
      {/* Card 1: MONTHLY ATTENDANCE */}
      <div className="bg-white rounded-[22px] border border-[#D4DCE6] shadow-floating-card card-hover-lift p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-[#5B4CF8] stroke-[1.75]" />
          <h3 className="font-semibold text-[#1E293B] text-[15px] tracking-tight">Monthly Attendance</h3>
        </div>

        <div className="space-y-3.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">Total Working Days</span>
            <span className="font-bold text-[#1E293B] text-sm">{totalWorkingDays} days</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">Present</span>
            <span className="font-bold text-[#1E293B] text-sm">{presentDays} days</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">Absent</span>
            <span className="bg-[#FEE2E2] text-[#991B1B] font-bold text-xs px-2.5 py-0.5 rounded-full">
              {absentDays} days
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">On Leave</span>
            <span className="bg-[#FEF3C7] text-[#92400E] font-bold text-xs px-2.5 py-0.5 rounded-full">
              {leaveDays} days
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: EXCEPTIONS */}
      <div className="bg-white rounded-[22px] border border-[#D4DCE6] shadow-floating-card card-hover-lift p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-[#5B4CF8] stroke-[1.75]" />
          <h3 className="font-semibold text-[#1E293B] text-[15px] tracking-tight">Exceptions</h3>
        </div>

        <div className="space-y-3.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">Late Arrivals</span>
            <span className="bg-[#FEF3C7] text-[#92400E] font-bold text-xs px-2.5 py-0.5 rounded-full">
              {lateCount}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">Early Exits</span>
            <span className="bg-[#FEF3C7] text-[#92400E] font-bold text-xs px-2.5 py-0.5 rounded-full">
              {earlyExitCount}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">Missing Clock-Outs</span>
            <span className="bg-[#FEE2E2] text-[#991B1B] font-bold text-xs px-2.5 py-0.5 rounded-full">
              {missingClockoutCount}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: HOURS SUMMARY */}
      <div className="bg-white rounded-[22px] border border-[#D4DCE6] shadow-floating-card card-hover-lift p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-[#5B4CF8] stroke-[1.75]" />
          <h3 className="font-semibold text-[#1E293B] text-[15px] tracking-tight">Hours Summary</h3>
        </div>

        <div className="space-y-3.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">Productive Hours</span>
            <span className="bg-[#F8FAFC] text-[#1E293B] font-bold text-xs px-2.5 py-1 rounded-lg border border-[#D4DCE6]">
              {productiveHoursText}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">Break Hours</span>
            <span className="bg-[#F8FAFC] text-[#1E293B] font-bold text-xs px-2.5 py-1 rounded-lg border border-[#D4DCE6]">
              {breakHoursText}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#64748B] font-medium">OT Hours</span>
            <span className="bg-[#F8FAFC] text-[#1E293B] font-bold text-xs px-2.5 py-1 rounded-lg border border-[#D4DCE6]">
              {otHoursText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
