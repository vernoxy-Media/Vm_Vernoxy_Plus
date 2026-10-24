import React from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  LogOut,
} from 'lucide-react';
import type { MonthSummary, DayRecord } from '../types/attendance.types';
import { ProgressRing } from './ProgressRing';

export interface MonthlyAttendancePanelProps {
  summary: MonthSummary;
  records: DayRecord[];
  selectedMonth: string; // "YYYY-MM"
  onSelectMonth?: (month: string) => void;
}

export const MonthlyAttendancePanel: React.FC<MonthlyAttendancePanelProps> = ({
  summary,
  records,
  selectedMonth,
  onSelectMonth,
}) => {
  // Format month name (e.g., "October 2026")
  const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
  const monthDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
  const monthLabel = monthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const handlePrevMonth = () => {
    if (!onSelectMonth) return;
    const prev = new Date(Date.UTC(yearNum, monthNum - 2, 1));
    onSelectMonth(prev.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    if (!onSelectMonth) return;
    const next = new Date(Date.UTC(yearNum, monthNum, 1));
    onSelectMonth(next.toISOString().slice(0, 7));
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // Helper to check if a day is off or a declared holiday
  const isOffOrHoliday = (r: DayRecord) =>
    r.status === 'weekly_off' ||
    r.status === 'holiday' ||
    Boolean(r.holiday_name);

  // 1. Working days strictly in the future (strictly after today in this month):
  const remainingWorkingDays = records.filter(
    (r) => r.date > todayStr && !isOffOrHoliday(r)
  ).length;

  // 2. Working days that have occurred up to and including today:
  const elapsedWorkingDays = records.filter(
    (r) => r.date <= todayStr && !isOffOrHoliday(r)
  ).length;

  // 3. Pure absent days (past working days with no punch at all):
  const absentDays = records.filter(
    (r) => r.date < todayStr && !r.punch_in && !isOffOrHoliday(r) && !r.leave_type
  ).length;

  // 4. Attended days with completed check-out:
  const completedPresentDays = records.filter(
    (r) => r.date < todayStr && (r.status === 'short_hours' || (r.punch_in && r.punch_out))
  ).length;

  // 5. Incomplete days with missing check-out:
  const missingPunchDays = records.filter(
    (r) => r.date < todayStr && r.punch_in && !r.punch_out
  ).length;

  // 6. Today status:
  const todayRecord = records.find((r) => r.is_today || r.date === todayStr);
  const isTodayPunched = Boolean(todayRecord?.punch_in);

  // Total attended days so far:
  const totalAttendedDays = completedPresentDays + missingPunchDays + (isTodayPunched ? 1 : 0);

  // Leave days:
  const leaveDays = summary.leave_days || records.filter((r) => r.leave_type).length || 0;

  // Attendance rate based on elapsed working days so far:
  const attendanceRate = elapsedWorkingDays > 0
    ? Math.round((totalAttendedDays / elapsedWorkingDays) * 100)
    : 0;

  // Calculate Exceptions (Late Arrivals & Early Exits) from records
  let lateArrivalsCount = 0;
  let earlyExitsCount = 0;

  records.forEach((r) => {
    if (r.punch_in) {
      const [timePart, modifier] = r.punch_in.split(' ');
      if (timePart) {
        const [hStr, mStr] = timePart.split(':');
        let hours = parseInt(hStr, 10);
        const minutes = parseInt(mStr, 10);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        if (hours > 9 || (hours === 9 && minutes > 30)) {
          lateArrivalsCount++;
        }
      }
    }

    if (r.punch_out) {
      const [timePart, modifier] = r.punch_out.split(' ');
      if (timePart) {
        const [hStr, mStr] = timePart.split(':');
        let hours = parseInt(hStr, 10);
        const minutes = parseInt(mStr, 10);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        if (hours < 17 || (hours === 17 && minutes < 30)) {
          earlyExitsCount++;
        }
      }
    }
  });

  return (
    <div
      id="monthly-attendance-panel"
      className="bg-white rounded-xl border border-slate-300 shadow-[0_2px_12px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] transition-all p-5 flex flex-col justify-between h-full"
    >
      <div>
        {/* Header with Month Navigator */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Monthly Attendance</h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-1.5 py-0.5">
            <button
              onClick={handlePrevMonth}
              type="button"
              className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-slate-700 px-1">{monthLabel}</span>
            <button
              onClick={handleNextMonth}
              type="button"
              className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Upper Section: Attendance Donut (116px) + Metric List (32px rows) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center my-1.5">
          {/* Donut progress ring with clean inner text & days count placed below */}
          <div className="flex flex-col items-center justify-center">
            <ProgressRing
              progress={Math.max(0.06, attendanceRate / 100)}
              size={120}
              strokeWidth={8}
              ringColor="#10b981"
              trackColor="#f1f5f9"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-[24px] font-extrabold text-slate-900 tracking-tight font-mono leading-none">
                  {attendanceRate}%
                </span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1 text-center">
                  Attendance
                </span>
              </div>
            </ProgressRing>
            <span className="text-xs font-medium text-slate-500 mt-2 font-mono">
              {totalAttendedDays} of {elapsedWorkingDays} days
            </span>
          </div>

          {/* Metric List with 32px row heights */}
          <div className="text-xs">
            <div className="h-8 flex items-center justify-between border-b border-slate-100">
              <span className="inline-flex items-center gap-2 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Present
              </span>
              <span className="font-bold text-emerald-600 font-mono">{totalAttendedDays} days</span>
            </div>

            <div className="h-8 flex items-center justify-between border-b border-slate-100">
              <span className="inline-flex items-center gap-2 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Absent
              </span>
              <span className="font-bold text-rose-600 font-mono">{absentDays} days</span>
            </div>

            <div className="h-8 flex items-center justify-between border-b border-slate-100">
              <span className="inline-flex items-center gap-2 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Leave
              </span>
              <span className="font-bold text-amber-600 font-mono">{leaveDays} days</span>
            </div>

            <div className="h-8 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Remaining
              </span>
              <span className="font-bold text-blue-600 font-mono">{remainingWorkingDays} days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Policy Exceptions matching CurrentSessionCard stat tiles */}
      <div className="pt-3.5 border-t border-slate-100 mt-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-slate-400 stroke-[2.2]" />
            <h4 className="text-[13px] font-bold text-slate-900 tracking-tight">
              Policy Exceptions
            </h4>
          </div>
          <span className="text-xs font-medium text-slate-400">Month to Date</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-left">
          {/* 1. Late Arrivals */}
          <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 min-w-0">
              <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-medium leading-tight truncate">Late Arrivals</span>
            </div>
            <span
              className={`text-base font-bold font-mono tracking-tight shrink-0 pl-1 ${
                lateArrivalsCount > 0 ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              {lateArrivalsCount}
            </span>
          </div>

          {/* 2. Early Exits */}
          <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 min-w-0">
              <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-medium leading-tight truncate">Early Exits</span>
            </div>
            <span
              className={`text-base font-bold font-mono tracking-tight shrink-0 pl-1 ${
                earlyExitsCount > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              {earlyExitsCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
