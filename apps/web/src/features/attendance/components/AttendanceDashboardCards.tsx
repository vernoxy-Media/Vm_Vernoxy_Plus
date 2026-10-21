import React from 'react';
import type {
  TodayAttendanceData,
  AttendanceStatistics,
  MonthSummary,
  DayRecord,
} from '../types/attendance.types';
import { TimesheetCard } from './TimesheetCard';
import { TodayActivityCard } from './TodayActivityCard';
import { StatisticsCard } from './StatisticsCard';
import { AttendanceListCard } from './AttendanceListCard';
import { MonthDetailsCard } from './MonthDetailsCard';

export interface AttendanceDashboardCardsProps {
  today: TodayAttendanceData;
  statistics: AttendanceStatistics;
  monthSummary: MonthSummary;
  records: DayRecord[];
  isPending: boolean;
  onPunchIn: () => Promise<void>;
  onPunchOut: () => Promise<void>;
  onStartBreak: () => Promise<void>;
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
  onReturnToToday,
  onSelectDate,
  dayLabel = 'Today',
  weekLabel = 'This Week',
  monthLabel = 'This Month',
  statusLabel,
}) => {
  return (
    <>
      {/* Row 1: Timesheet, Today Activity, Statistics */}
      <div id="attendance-dashboard-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        <TimesheetCard
          today={today}
          isPending={isPending}
          onPunchIn={onPunchIn}
          onPunchOut={onPunchOut}
          onStartBreak={onStartBreak}
          onResumeBreak={onResumeBreak}
          errorMessage={actionError}
          infoToast={infoToast}
          onDismissToast={onDismissToast}
          isSelectedToday={isSelectedToday}
          onRequestCorrection={onRequestCorrection}
          onReturnToToday={onReturnToToday}
        />

        <TodayActivityCard
          timeline={today.timeline}
          state={today.state}
          activeBreakStart={today.active_break_start}
          selectedDate={selectedDate}
          isSelectedToday={isSelectedToday}
          statusLabel={statusLabel}
        />

        <div className="md:col-span-2 lg:col-span-1">
          <StatisticsCard
            statistics={statistics}
            dayLabel={dayLabel}
            weekLabel={weekLabel}
            monthLabel={monthLabel}
            selectedDate={selectedDate}
          />
        </div>
      </div>

      {/* Row 2: Attendance List & Month Details */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2">
          <AttendanceListCard
            records={records}
            onSuccessCorrection={onSuccessCorrection}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
          />
        </div>

        <div className="xl:col-span-1">
          <MonthDetailsCard summary={monthSummary} />
        </div>
      </div>
    </>
  );
};
