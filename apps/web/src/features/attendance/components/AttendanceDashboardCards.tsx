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
    <div className="space-y-6 w-full">
      {/* Row 1: Attendance Stats (Last 30 Days) + Timings + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Card 1 (Left): ATTENDANCE STATS (LAST 30 DAYS) */}
        <AttendanceStatsSummaryCard
          todayWorkedSeconds={liveWorkedSeconds}
          todayBreakSeconds={liveBreakSeconds}
          records={records}
          monthSummary={monthSummary}
          statistics={statistics}
        />

        {/* Card 2 (Middle): TIMINGS */}
        <AttendanceTimingsCard
          todayWorkedSeconds={liveWorkedSeconds}
          todayTargetSeconds={today.target_seconds || 28800}
          shiftStart="09:00 AM"
          shiftEnd="05:30 PM"
          isOnBreak={liveToday.state === 'on_break'}
        />

        {/* Card 3 (Right): ACTIONS */}
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
        />
      </div>

      {/* Row 2: Monthly Attendance + Exceptions + Hours Summary */}
      <AttendanceBreakdownRow
        monthSummary={monthSummary}
        records={records}
        statistics={statistics}
      />

      {/* Section 3: Activity Logs */}
      <RecentAttendanceRecordsCard
        records={records}
        selectedDate={selectedDate}
        onRequestCorrection={onRequestCorrection}
        onSelectDate={onSelectDate}
        onSuccessCorrection={onSuccessCorrection}
        onOpenMyRequests={onOpenMyRequests}
      />
    </div>
  );
};
