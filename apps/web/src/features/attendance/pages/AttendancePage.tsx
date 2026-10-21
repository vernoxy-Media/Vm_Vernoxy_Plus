import React, { useState, useMemo } from 'react';
import { useAttendanceDashboard, usePunchActions, useDayDetail } from '../hooks/use-attendance';
import { AttendanceCalendarPicker } from '../components/AttendanceCalendarPicker';
import { AttendanceSkeleton } from '../components/AttendanceSkeleton';
import { AttendanceDashboardCards } from '../components/AttendanceDashboardCards';
import { AttendanceNavTabs } from '../components/AttendanceNavTabs';
import { RequestCorrectionDialog } from '../components/RequestCorrectionDialog';
import type { TodayAttendanceData, AttendanceStatistics, SpecialStatus } from '../types/attendance.types';

export const AttendancePage: React.FC = () => {
  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthStr = useMemo(() => todayDateStr.slice(0, 7), [todayDateStr]);

  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [announcement, setAnnouncement] = useState<string>('');
  const [infoToast, setInfoToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [correctionModalDate, setCorrectionModalDate] = useState<string | null>(null);

  const { data, isLoading, error } = useAttendanceDashboard(selectedMonth);

  const isSelectedToday = selectedDate === todayDateStr;
  const { data: dayDetail } = useDayDetail(!isSelectedToday ? selectedDate : null);

  const {
    punchInMutation,
    punchOutMutation,
    startBreakMutation,
    resumeBreakMutation,
    isPending,
  } = usePunchActions({
    month: selectedMonth,
    onConflict: (msg) => {
      setInfoToast(msg);
      setAnnouncement(msg);
    },
    onAnnounce: (msg) => {
      setAnnouncement(msg);
    },
  });

  const handleSelectDate = (newDate: string) => {
    setSelectedDate(newDate);
    const newMonth = newDate.slice(0, 7);
    if (newMonth !== selectedMonth) {
      setSelectedMonth(newMonth);
    }
  };

  const runAction = async (action: () => Promise<any>, fallbackError: string) => {
    setActionError(null);
    setInfoToast(null);
    try {
      await action();
    } catch (err: any) {
      if (err?.status !== 409) setActionError(err.message || fallbackError);
    }
  };

  const handlePunchIn = () => runAction(() => punchInMutation.mutateAsync(), 'Failed to punch in');
  const handlePunchOut = () => runAction(() => punchOutMutation.mutateAsync(), 'Failed to punch out');
  const handleStartBreak = () => runAction(() => startBreakMutation.mutateAsync(), 'Failed to start break');
  const handleResumeBreak = () => runAction(() => resumeBreakMutation.mutateAsync(), 'Failed to resume break');

  if (isLoading && !data) return <AttendanceSkeleton />;

  if (error && !data) {
    return (
      <div className="py-24 text-center">
        <div className="max-w-md mx-auto p-8 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900">Unable to load attendance dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Network error'}</p>
        </div>
      </div>
    );
  }

  const { today, statistics, month_summary, records } = data!;
  const selectedRecord = records.find((r) => r.date === selectedDate);

  // Compute daily timesheet & activity model for selected date
  let displayToday: TodayAttendanceData = today;
  let statusLabel = 'Live Shift';

  if (!isSelectedToday) {
    statusLabel = selectedRecord?.status_label || (selectedRecord?.punch_in ? 'PRESENT' : 'ABSENT');
    displayToday = {
      date: selectedDate,
      company_timezone: today.company_timezone || 'Asia/Kolkata',
      state: selectedRecord?.punch_in
        ? (selectedRecord.punch_out ? 'done' : 'working')
        : 'not_started',
      special_status: (selectedRecord?.status === 'holiday'
        ? 'holiday'
        : selectedRecord?.status === 'weekly_off'
        ? 'weekly_off'
        : selectedRecord?.leave_type
        ? 'on_leave'
        : null) as SpecialStatus,
      special_status_reason: selectedRecord?.holiday_name || selectedRecord?.leave_type || null,
      punched_in_at: dayDetail?.punched_in_at || (selectedRecord?.punch_in ? `${selectedDate}T${selectedRecord.punch_in}` : null),
      punched_out_at: dayDetail?.punched_out_at || (selectedRecord?.punch_out ? `${selectedDate}T${selectedRecord.punch_out}` : null),
      worked_seconds: selectedRecord?.production_seconds ?? 0,
      break_seconds: selectedRecord?.break_seconds ?? 0,
      target_seconds: (selectedRecord?.status === 'weekly_off' || selectedRecord?.status === 'holiday') ? 0 : 28800,
      active_break_start: null,
      server_now: today.server_now,
      timeline: dayDetail?.timeline && dayDetail.timeline.length > 0
        ? dayDetail.timeline
        : (selectedRecord?.punch_in ? [
            {
              id: 'punch-in-rec',
              type: 'punch_in' as const,
              timestamp: selectedRecord.punch_in,
              display_time: selectedRecord.punch_in,
              label: `Punched in at ${selectedRecord.punch_in}`,
            },
            ...(selectedRecord.punch_out ? [{
              id: 'punch-out-rec',
              type: 'punch_out' as const,
              timestamp: selectedRecord.punch_out,
              display_time: selectedRecord.punch_out,
              label: `Punched out at ${selectedRecord.punch_out}`,
            }] : []),
          ] : []),
    };
  }

  // Work statistics calculations according to the chosen date
  // 1. Day Metric
  const dayWorkedHours = isSelectedToday
    ? statistics.today.worked_hours
    : selectedRecord
    ? Math.round(((selectedRecord.production_seconds || 0) / 3600) * 10) / 10
    : 0;
  const dayTargetHours = (selectedRecord?.status === 'weekly_off' || selectedRecord?.status === 'holiday')
    ? 0
    : isSelectedToday
    ? statistics.today.target_hours
    : 8.0;

  const dayDateObj = new Date(`${selectedDate}T00:00:00Z`);
  const dayFormatted = dayDateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const dayLabel = isSelectedToday ? 'Today' : `Selected Day (${dayFormatted})`;

  // 2. Week Metric (Week containing selectedDate: Monday - Sunday)
  const refDate = new Date(`${selectedDate}T00:00:00Z`);
  const dayOfWeek = refDate.getUTCDay(); // 0 is Sun, 1 is Mon
  const diffToMon = (dayOfWeek < 1 ? 7 : 0) + dayOfWeek - 1;
  const weekStartObj = new Date(refDate);
  weekStartObj.setUTCDate(refDate.getUTCDate() - diffToMon);
  const weekEndObj = new Date(weekStartObj);
  weekEndObj.setUTCDate(weekStartObj.getUTCDate() + 6);

  const weekStartStr = weekStartObj.toISOString().slice(0, 10);
  const weekEndStr = weekEndObj.toISOString().slice(0, 10);

  const todayObj = new Date(`${todayDateStr}T00:00:00Z`);
  const todayDow = todayObj.getUTCDay();
  const todayDiffToMon = (todayDow < 1 ? 7 : 0) + todayDow - 1;
  const currentWeekStart = new Date(todayObj);
  currentWeekStart.setUTCDate(todayObj.getUTCDate() - todayDiffToMon);
  const isCurrentWeek = weekStartStr === currentWeekStart.toISOString().slice(0, 10);

  const weekRecords = records.filter((r) => r.date >= weekStartStr && r.date <= weekEndStr);
  const weekWorkedSec = weekRecords.reduce((acc, r) => acc + (r.production_seconds || 0), 0);
  const weekTargetSec = weekRecords.reduce(
    (acc, r) => acc + ((r.status === 'weekly_off' || r.status === 'holiday') ? 0 : 8 * 3600),
    0
  ) || (40 * 3600);

  const weekWorkedHours = isCurrentWeek && isSelectedToday
    ? statistics.this_week.worked_hours
    : Math.round((weekWorkedSec / 3600) * 10) / 10;
  const weekTargetHours = isCurrentWeek && isSelectedToday
    ? statistics.this_week.target_hours
    : Math.round((weekTargetSec / 3600) * 10) / 10;

  const weekStartFormatted = weekStartObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const weekEndFormatted = weekEndObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const weekLabel = isCurrentWeek ? 'This Week' : `Week (${weekStartFormatted} - ${weekEndFormatted})`;

  // 3. Month Metric (Month containing selectedDate)
  const isCurrentMonth = selectedMonth === currentMonthStr;
  const [yNum, mNum] = selectedMonth.split('-').map(Number);
  const monthName = new Date(Date.UTC(yNum, mNum - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const monthLabel = isCurrentMonth ? 'This Month' : monthName;
  const monthWorkedHours = statistics.this_month.worked_hours;
  const monthTargetHours = statistics.this_month.target_hours;

  const remainingHours = Math.max(0, Math.round((monthTargetHours - monthWorkedHours) * 10) / 10);
  const overtimeHours = Math.max(0, Math.round((monthWorkedHours - monthTargetHours) * 10) / 10);

  const computedStatistics: AttendanceStatistics = {
    today: {
      worked_hours: dayWorkedHours,
      target_hours: dayTargetHours,
    },
    this_week: {
      worked_hours: weekWorkedHours,
      target_hours: weekTargetHours,
    },
    this_month: {
      worked_hours: monthWorkedHours,
      target_hours: monthTargetHours,
    },
    remaining: {
      worked_hours: remainingHours,
      target_hours: monthTargetHours,
    },
    overtime_hours: overtimeHours,
  };

  const correctionRow = correctionModalDate
    ? records.find((r) => r.date === correctionModalDate)
    : null;

  return (
    <div id="attendance-page" className="space-y-6">
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-400 mb-1">
            <span>Dashboard</span>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="text-slate-600 font-bold">Attendance</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance</h1>
        </div>

        {/* Date, Month, Year Calendar Picker */}
        <AttendanceCalendarPicker
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          records={records}
          maxDate={todayDateStr}
        />
      </div>

      <AttendanceNavTabs activeTab="timesheet" />

      <AttendanceDashboardCards
        today={displayToday}
        statistics={computedStatistics}
        monthSummary={month_summary}
        records={records}
        isPending={isPending}
        onPunchIn={handlePunchIn}
        onPunchOut={handlePunchOut}
        onStartBreak={handleStartBreak}
        onResumeBreak={handleResumeBreak}
        actionError={actionError}
        infoToast={infoToast}
        onDismissToast={() => setInfoToast(null)}
        onSuccessCorrection={(msg) => setInfoToast(msg)}
        selectedDate={selectedDate}
        isSelectedToday={isSelectedToday}
        onRequestCorrection={(date) => setCorrectionModalDate(date)}
        onReturnToToday={() => handleSelectDate(todayDateStr)}
        onSelectDate={handleSelectDate}
        dayLabel={dayLabel}
        weekLabel={weekLabel}
        monthLabel={monthLabel}
        statusLabel={statusLabel}
      />

      {/* Correction Dialog when triggered from Timesheet card or table */}
      {correctionModalDate && (
        <RequestCorrectionDialog
          isOpen={true}
          date={correctionModalDate}
          defaultPunchIn={correctionRow?.punch_in}
          defaultPunchOut={correctionRow?.punch_out}
          onClose={() => setCorrectionModalDate(null)}
          onSuccess={(msg) => {
            setInfoToast(msg);
            setCorrectionModalDate(null);
          }}
        />
      )}
    </div>
  );
};

export default AttendancePage;
