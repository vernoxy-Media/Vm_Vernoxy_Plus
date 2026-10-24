import React, { useState, useEffect } from 'react';
import type {
  TodayAttendanceData,
  AttendanceStatistics,
  MonthSummary,
  DayRecord,
} from '../types/attendance.types';
import { AttendanceTopSummaryCards } from './AttendanceTopSummaryCards';
import { CurrentSessionCard } from './CurrentSessionCard';
import { MonthlyAttendancePanel } from './MonthlyAttendancePanel';
import { CurrentTimeTimingsCard } from './CurrentTimeTimingsCard';
import { RecentAttendanceRecordsCard } from './RecentAttendanceRecordsCard';

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
  selectedMonth,
  onSelectMonth,
}) => {
  const currentMonthStr = selectedMonth || (today.date ? today.date.slice(0, 7) : new Date().toISOString().slice(0, 7));

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

  // Find punch in time for today or selected record
  const selectedRecord = records.find((r) => r.date === (today.date || selectedDate));
  const punchInTime = today.punched_in_at || selectedRecord?.punch_in || null;

  return (
    <div className="space-y-6 w-full">
      {/* Section 1: Today's Performance */}
      <section aria-labelledby="section-todays-performance">
        <h2
          id="section-todays-performance"
          className="text-[17px] font-bold text-slate-900 tracking-tight mb-3"
        >
          Today&apos;s Performance
        </h2>
        <AttendanceTopSummaryCards
          statistics={statistics}
          records={records}
          todayWorkedSeconds={liveWorkedSeconds}
          todayBreakSeconds={liveBreakSeconds}
        />
      </section>

      {/* Section 2: Today's Attendance */}
      <section aria-labelledby="section-todays-attendance">
        <h2
          id="section-todays-attendance"
          className="text-[17px] font-bold text-slate-900 tracking-tight mb-3"
        >
          Today&apos;s Attendance
        </h2>
        {/* Middle row: Equal 3-column grid (1fr 1fr 1fr) with auto-rows-fr for identical card width & height */}
        <div className="grid grid-cols-1 lg:grid-cols-3 auto-rows-fr gap-4.5 lg:gap-5 items-stretch">
          {/* Left Panel: Current Session (Hero) */}
          <CurrentSessionCard
            today={liveToday}
            isPending={isPending}
            onPunchIn={onPunchIn}
            onPunchOut={onPunchOut}
            onStartBreak={onStartBreak}
            onResumeBreak={onResumeBreak}
            errorMessage={actionError}
            infoToast={infoToast}
            onDismissToast={onDismissToast}
            isSelectedToday={isSelectedToday}
          />

          {/* Middle Panel: Monthly Attendance */}
          <MonthlyAttendancePanel
            summary={monthSummary}
            records={records}
            selectedMonth={currentMonthStr}
            onSelectMonth={onSelectMonth}
          />

          {/* Right Panel: Current Time & Shift */}
          <CurrentTimeTimingsCard
            todayWorkedSeconds={liveWorkedSeconds}
            todayBreakSeconds={liveBreakSeconds}
            todayTargetSeconds={today.target_seconds}
            punchInTime={punchInTime}
            shiftStart="09:00 AM"
            shiftEnd="05:30 PM"
            timeline={liveToday.timeline}
            todayState={liveToday.state}
          />
        </div>
      </section>

      {/* Section 3: Attendance History */}
      <section aria-labelledby="section-attendance-history">
        <h2
          id="section-attendance-history"
          className="text-[17px] font-bold text-slate-900 tracking-tight mb-3"
        >
          Attendance History
        </h2>
        <RecentAttendanceRecordsCard
          records={records}
          selectedDate={selectedDate}
          onRequestCorrection={onRequestCorrection}
          onSelectDate={onSelectDate}
          onSuccessCorrection={onSuccessCorrection}
        />
      </section>
    </div>
  );
};
