import React from 'react';
import {
  Timer,
  BarChart3,
  Calendar,
  TrendingUp,
  Coffee,
} from 'lucide-react';
import type { AttendanceStatistics, DayRecord } from '../types/attendance.types';

export interface AttendanceTopSummaryCardsProps {
  statistics: AttendanceStatistics;
  records: DayRecord[];
  todayWorkedSeconds: number;
  todayBreakSeconds: number;
}

function formatDurationH_M(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0h 00m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export const AttendanceTopSummaryCards: React.FC<AttendanceTopSummaryCardsProps> = ({
  statistics,
  records,
  todayWorkedSeconds,
  todayBreakSeconds,
}) => {
  const todayDateStr = new Date().toISOString().slice(0, 10);

  // 1. Today Working Hours
  const todayTargetSec = 8 * 3600;
  const todayProgress = Math.min(100, Math.round((todayWorkedSeconds / todayTargetSec) * 100));
  const todayFormatted = formatDurationH_M(todayWorkedSeconds);

  // 2. This Week Working Hours (Monday to Sunday, removing holidays & weekly off)
  const todayObj = new Date(`${todayDateStr}T00:00:00Z`);
  const dayOfWeek = todayObj.getUTCDay();
  const diffToMon = (dayOfWeek < 1 ? 7 : 0) + dayOfWeek - 1;
  const weekStart = new Date(todayObj);
  weekStart.setUTCDate(todayObj.getUTCDate() - diffToMon);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const weekRecords = records.filter((r) => r.date >= weekStartStr && r.date <= weekEndStr);
  const weekWorkingDays = weekRecords.filter(
    (r) => r.status !== 'weekly_off' && r.status !== 'holiday' && !r.holiday_name
  );
  const weekTargetHours = weekWorkingDays.length > 0
    ? weekWorkingDays.length * 8
    : (statistics.this_week.target_hours || 40);

  const weekWorkedSec = weekRecords.reduce((acc, r) => {
    if (r.is_today || r.date === todayDateStr) {
      return acc + Math.max(r.production_seconds || 0, todayWorkedSeconds);
    }
    return acc + (r.production_seconds || 0);
  }, 0);
  const weekProgress = weekTargetHours > 0
    ? Math.min(100, Math.round((weekWorkedSec / (weekTargetHours * 3600)) * 100))
    : 0;
  const weekFormatted = formatDurationH_M(weekWorkedSec);

  // 3. This Month Working Hours (Removing holidays & weekly off from target)
  const monthWorkingDays = records.filter(
    (r) => r.status !== 'weekly_off' && r.status !== 'holiday' && !r.holiday_name
  );
  const monthTargetHours = monthWorkingDays.length > 0
    ? monthWorkingDays.length * 8
    : (statistics.this_month.target_hours || 128);

  const monthWorkedSec = records.reduce((acc, r) => {
    if (r.is_today || r.date === todayDateStr) {
      return acc + Math.max(r.production_seconds || 0, todayWorkedSeconds);
    }
    return acc + (r.production_seconds || 0);
  }, 0);
  const monthProgress = monthTargetHours > 0
    ? Math.min(100, Math.round((monthWorkedSec / (monthTargetHours * 3600)) * 100))
    : 0;
  const monthFormatted = formatDurationH_M(monthWorkedSec);

  // 4. Average Daily Working Hours (Excludes holidays, weekly off, leaves & absents; counts avg of ONLY present days)
  const isOffOrHoliday = (r: DayRecord) =>
    r.status === 'weekly_off' || r.status === 'holiday' || Boolean(r.holiday_name);
  const isAbsentOrLeave = (r: DayRecord) =>
    r.status === 'absent' || r.status === 'leave' || Boolean(r.leave_type);

  const presentDays = records.filter((r) => {
    if (isOffOrHoliday(r) || isAbsentOrLeave(r)) return false;
    if (r.is_today || r.date === todayDateStr) {
      return todayWorkedSeconds > 0 || Boolean(r.punch_in);
    }
    return (r.production_seconds || 0) > 0 || r.status === 'present' || Boolean(r.punch_in);
  });

  const totalPresentWorkedSec = presentDays.reduce((acc, r) => {
    if (r.is_today || r.date === todayDateStr) {
      return acc + Math.max(r.production_seconds || 0, todayWorkedSeconds);
    }
    return acc + (r.production_seconds || 0);
  }, 0);

  const avgWorkedSec = presentDays.length > 0
    ? Math.round(totalPresentWorkedSec / presentDays.length)
    : todayWorkedSeconds;
  const avgWorkedFormatted = formatDurationH_M(avgWorkedSec);

  // 5. Average Daily Break Hours (Excludes non-present days)
  const presentBreakDays = presentDays.filter((r) => {
    if (r.is_today || r.date === todayDateStr) {
      return todayBreakSeconds > 0;
    }
    return (r.break_seconds || 0) > 0;
  });
  const totalPresentBreakSec = presentBreakDays.reduce((acc, r) => {
    if (r.is_today || r.date === todayDateStr) {
      return acc + Math.max(r.break_seconds || 0, todayBreakSeconds);
    }
    return acc + (r.break_seconds || 0);
  }, 0);
  const avgBreakSec = presentBreakDays.length > 0
    ? Math.round(totalPresentBreakSec / presentBreakDays.length)
    : todayBreakSeconds;
  const avgBreakFormatted = formatDurationH_M(avgBreakSec);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-5">
      {/* 1. Today Working Hours */}
      <div className="bg-white p-4 sm:p-[17px] rounded-xl border border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.05)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] hover:border-slate-400 transition-all flex flex-col justify-between min-h-[124px]">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Timer className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-mono">
              {todayProgress}%
            </span>
          </div>
          <span className="text-[13px] font-medium text-slate-500 block leading-tight">
            Today Working Hours
          </span>
          <h3 className="text-[28px] font-bold text-slate-900 leading-none my-1 tracking-tight font-mono">
            {todayFormatted}
          </h3>
        </div>
        <div className="mt-1.5">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(todayProgress > 0 ? 6 : 0, todayProgress)}%` }}
            />
          </div>
          <div className="flex items-center text-xs text-slate-500 mt-1.5 font-medium">
            <span>Goal: 8 hrs</span>
          </div>
        </div>
      </div>

      {/* 2. This Week Working Hours */}
      <div className="bg-white p-4 sm:p-[17px] rounded-xl border border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.05)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] hover:border-slate-400 transition-all flex flex-col justify-between min-h-[124px]">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono">
              {weekProgress}%
            </span>
          </div>
          <span className="text-[13px] font-medium text-slate-500 block leading-tight">
            This Week (Hours)
          </span>
          <h3 className="text-[28px] font-bold text-slate-900 leading-none my-1 tracking-tight font-mono">
            {weekFormatted}
          </h3>
        </div>
        <div className="mt-1.5">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(weekProgress > 0 ? 6 : 0, weekProgress)}%` }}
            />
          </div>
          <div className="flex items-center text-xs text-slate-500 mt-1.5 font-medium">
            <span>Goal: {weekTargetHours} hrs</span>
          </div>
        </div>
      </div>

      {/* 3. This Month Working Hours */}
      <div className="bg-white p-4 sm:p-[17px] rounded-xl border border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.05)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] hover:border-slate-400 transition-all flex flex-col justify-between min-h-[124px]">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono">
              {monthProgress}%
            </span>
          </div>
          <span className="text-[13px] font-medium text-slate-500 block leading-tight">
            This Month (Hours)
          </span>
          <h3 className="text-[28px] font-bold text-slate-900 leading-none my-1 tracking-tight font-mono">
            {monthFormatted}
          </h3>
        </div>
        <div className="mt-1.5">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(monthProgress > 0 ? 6 : 0, monthProgress)}%` }}
            />
          </div>
          <div className="flex items-center text-xs text-slate-500 mt-1.5 font-medium">
            <span>Goal: {monthTargetHours} hrs</span>
          </div>
        </div>
      </div>

      {/* 4. Avg. Daily Working Hours */}
      <div className="bg-white p-4 sm:p-[17px] rounded-xl border border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.05)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] hover:border-slate-400 transition-all flex flex-col justify-between min-h-[124px]">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-mono">
              {Math.min(100, Math.round((avgWorkedSec / (8 * 3600)) * 100))}%
            </span>
          </div>
          <span className="text-[13px] font-medium text-slate-500 block leading-tight">
            Avg. Daily Working
          </span>
          <h3 className="text-[28px] font-bold text-slate-900 leading-none my-1 tracking-tight font-mono">
            {avgWorkedFormatted}
          </h3>
        </div>
        <div className="mt-1.5">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(
                  avgWorkedSec > 0 ? 6 : 0,
                  Math.min(100, Math.round((avgWorkedSec / (8 * 3600)) * 100))
                )}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5 font-medium">
            <span>{presentDays.length} present {presentDays.length === 1 ? 'day' : 'days'}</span>
            <span>Target: 8 hrs</span>
          </div>
        </div>
      </div>

      {/* 5. Avg. Daily Break Hours */}
      <div className="bg-white p-4 sm:p-[17px] rounded-xl border border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.05)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] hover:border-slate-400 transition-all flex flex-col justify-between min-h-[124px]">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Coffee className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-mono">
              {Math.min(100, Math.round((avgBreakSec / 3600) * 100))}%
            </span>
          </div>
          <span className="text-[13px] font-medium text-slate-500 block leading-tight">
            Avg. Daily Break
          </span>
          <h3 className="text-[28px] font-bold text-slate-900 leading-none my-1 tracking-tight font-mono">
            {avgBreakFormatted}
          </h3>
        </div>
        <div className="mt-1.5">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(
                  avgBreakSec > 0 ? 6 : 0,
                  Math.min(100, Math.round((avgBreakSec / 3600) * 100))
                )}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5 font-medium">
            <span>Last 30 days</span>
            <span>Normal: &lt; 1 hr</span>
          </div>
        </div>
      </div>
    </div>
  );
};
