import React, { useState, useEffect } from 'react';
import type {
  TodayAttendanceData,
  AttendanceStatistics,
  MonthSummary,
  DayRecord,
} from '../types/attendance.types';
import { AttendanceStatsSummaryCard, AttendanceBreakdownRow } from './AttendanceMetricsOverview';
import { AttendanceTimingsCard } from './AttendanceTimingsCard';
import { AttendanceActionsCard } from './AttendanceActionsCard';
import { RecentAttendanceRecordsCard } from './RecentAttendanceRecordsCard';
import { UpcomingHolidays } from './UpcomingHolidays';
import { BirthdayCelebrations } from './BirthdayCelebrations';

export interface AttendanceDashboardCardsProps {
  today: TodayAttendanceData;
  statistics: AttendanceStatistics;
  monthSummary: MonthSummary;
  records: DayRecord[];
  isPending: boolean;
  onPunchIn: () => Promise<void>;
  onPunchOut: () => Promise<void>;
  onStartBreak: (breakType?: string, reason?: string) => Promise<any>;
  onResumeBreak: () => Promise<void>;
  actionError: string | null;
  infoToast: string | null;
  onDismissToast: () => void;
  onSuccessCorrection: (msg: string) => void;
  selectedDate?: string;
  isSelectedToday?: boolean;
  onRequestCorrection?: (date: string) => void;
  onReturnToToday?: () => void;
  onSelectDate?: (date: string) => void;
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
  dayLabel?: string;
  weekLabel?: string;
  monthLabel?: string;
  statusLabel?: string;
  onOpenMyRequests?: () => void;
  /** An administrator looking at somebody else: no clock-in / clock-out, requests are filed for them */
  viewing?: { emp_id: number; name: string; onExit: () => void } | null;
}

export const AttendanceDashboardCards: React.FC<AttendanceDashboardCardsProps> = ({
  today,
  statistics,
  monthSummary,
  records,
  isPending,
  onPunchIn,
  onPunchOut,
  onStartBreak,
  onResumeBreak,
  actionError,
  infoToast,
  onDismissToast,
  onSuccessCorrection,
  selectedDate,
  isSelectedToday = true,
  onRequestCorrection,
  onSelectDate,
  onOpenMyRequests,
  viewing,
}) => {
  // Live ticking offset so worked time & break time update smoothly in real time
  const [secondsOffset, setSecondsOffset] = useState(0);

  useEffect(() => {
    setSecondsOffset(0);
  }, [today.state, today.worked_seconds, today.break_seconds, today.server_now, isSelectedToday]);

  useEffect(() => {
    if (!isSelectedToday || (today.state !== 'working' && today.state !== 'on_break')) {
      return;
    }

    const interval = setInterval(() => {
      setSecondsOffset((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [today.state, isSelectedToday, today.worked_seconds, today.break_seconds, today.server_now]);

  const liveWorkedSeconds = (isSelectedToday && today.state === 'working')
    ? (today.worked_seconds || 0) + secondsOffset
    : (today.worked_seconds || 0);

  const liveBreakSeconds = (isSelectedToday && today.state === 'on_break')
    ? (today.break_seconds || 0) + secondsOffset
    : (today.break_seconds || 0);

  const liveToday: TodayAttendanceData = {
    ...today,
    worked_seconds: liveWorkedSeconds,
    break_seconds: liveBreakSeconds,
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full">
      {/* Keka-style summary panel: Attendance Stats | Timings | Actions */}
      <section className="rounded-2xl border border-[#E4E8EF] bg-[#F6F7FB] p-3 sm:p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-4 items-stretch">
        {/* Card 1 (Left): ATTENDANCE STATS */}
        <div className="flex flex-col gap-2 [&>*:last-child]:flex-1">
        <h3 className="text-[15px] font-medium text-slate-800">Attendance Stats</h3>
        <AttendanceStatsSummaryCard
          todayWorkedSeconds={liveWorkedSeconds}
          todayBreakSeconds={liveBreakSeconds}
          records={records}
          monthSummary={monthSummary}
          statistics={statistics}
        />
        </div>

        {/* Card 2 (Middle): TIMINGS */}
        <div className="flex flex-col gap-2 [&>*:last-child]:flex-1">
        <h3 className="text-[15px] font-medium text-slate-800">Timings</h3>
        <AttendanceTimingsCard
          todayWorkedSeconds={liveWorkedSeconds}
          todayTargetSeconds={today.target_seconds || 28800}
          shiftStart="09:00 AM"
          shiftEnd="05:30 PM"
          isOnBreak={liveToday.state === 'on_break'}
          clockInAt={today.punched_in_at}
        />
        </div>

        {/* Card 3 (Right): ACTIONS */}
        <div className="md:col-span-2 xl:col-span-1 flex flex-col gap-2 [&>*:last-child]:flex-1">
        <h3 className="text-[15px] font-medium text-slate-800">Actions</h3>
        {viewing ? (
          <div className="flex flex-1 flex-col justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
            <div>
              <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">Viewing as admin</span>
              <p className="mt-3 text-xl font-semibold tracking-tight text-slate-900">{viewing.name}</p>
              <p className="mt-1 text-sm text-slate-500">Their punches, leave and holidays for the month. Clock-in and clock-out are only for the employee themselves.</p>
            </div>
            <button
              type="button"
              onClick={viewing.onExit}
              className="self-start rounded-lg border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 cursor-pointer"
            >
              Back to my attendance
            </button>
          </div>
        ) : (
        <AttendanceActionsCard
          today={liveToday}
          isPending={isPending}
          onPunchIn={onPunchIn}
          onPunchOut={onPunchOut}
          onStartBreak={onStartBreak}
          onResumeBreak={onResumeBreak}
          errorMessage={actionError}
          infoToast={infoToast}
          onDismissToast={onDismissToast}
          onRegularize={onRequestCorrection ? () => onRequestCorrection(today.date) : undefined}
        />
        )}
        </div>
      </div>
      </section>

      {/* Row 2: Monthly Attendance + Exceptions + Hours Summary */}
      <AttendanceBreakdownRow
        monthSummary={monthSummary}
        records={records}
        statistics={statistics}
      />

      {/* Office holidays set by the administrator */}
      {!viewing && <BirthdayCelebrations />}
      <UpcomingHolidays />

      {/* Section 3: Activity Logs */}
      <h3 className="pt-1 text-[15px] font-medium text-slate-800">Logs</h3>
      <RecentAttendanceRecordsCard
        records={records}
        selectedDate={selectedDate}
        onRequestCorrection={onRequestCorrection}
        onSelectDate={onSelectDate}
        onSuccessCorrection={onSuccessCorrection}
        onOpenMyRequests={onOpenMyRequests}
        viewingEmpId={viewing?.emp_id}
      />
    </div>
  );
};
