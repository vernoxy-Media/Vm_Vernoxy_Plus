import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Settings } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAttendanceDashboard, usePunchActions, useDayDetail } from '../hooks/use-attendance';
import { AttendanceCalendarPicker } from '../components/AttendanceCalendarPicker';
import { AttendanceSkeleton } from '../components/AttendanceSkeleton';
import { AttendanceDashboardCards } from '../components/AttendanceDashboardCards';
import { AddRegularizationModal } from '../components/AddRegularizationModal';
import { MyRegularizationsPanel } from '../components/MyRegularizationsPanel';
import { ApprovalsPanel } from '../components/ApprovalsPanel';
import type { TodayAttendanceData, AttendanceStatistics, SpecialStatus } from '../types/attendance.types';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const canManageAttendance = Boolean(
    user?.access?.can_manage_organization ||
      user?.role?.role_name?.toLowerCase().includes('admin') ||
      user?.role?.role_name?.toLowerCase().includes('manager')
  );

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthStr = useMemo(() => todayDateStr.slice(0, 7), [todayDateStr]);

  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [announcement, setAnnouncement] = useState<string>('');
  const [infoToast, setInfoToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [attendanceTab, setAttendanceTab] = useState<'timesheet' | 'regularization' | 'approvals'>('timesheet');
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
      if (err?.status !== 409) setActionError(err?.detail || err?.message || fallbackError);
    }
  };

  const handlePunchIn = () => runAction(() => punchInMutation.mutateAsync(), 'Failed to punch in');
  const handlePunchOut = () => runAction(() => punchOutMutation.mutateAsync(), 'Failed to punch out');
  const handleStartBreak = (breakType?: string, reason?: string) =>
    runAction(() => startBreakMutation.mutateAsync({ breakType, reason }), 'Failed to start break');
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
  const weekWorkingDays = weekRecords.filter(
    (r) => r.status !== 'weekly_off' && r.status !== 'holiday' && !r.holiday_name
  );
  const weekWorkedSec = weekRecords.reduce((acc, r) => acc + (r.production_seconds || 0), 0);
  const weekTargetSec = weekWorkingDays.length > 0 ? weekWorkingDays.length * 8 * 3600 : (40 * 3600);

  const weekWorkedHours = Math.round((weekWorkedSec / 3600) * 10) / 10;
  const weekTargetHours = Math.round((weekTargetSec / 3600) * 10) / 10;

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

  // 3. Month Metric (Month containing selectedDate, removing holidays & weekly off)
  const isCurrentMonth = selectedMonth === currentMonthStr;
  const [yNum, mNum] = selectedMonth.split('-').map(Number);
  const monthName = new Date(Date.UTC(yNum, mNum - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const monthLabel = isCurrentMonth ? 'This Month' : monthName;
  const monthWorkedSec = records.reduce((acc, r) => acc + (r.production_seconds || 0), 0);
  const monthWorkedHours = Math.round((monthWorkedSec / 3600) * 10) / 10;

  const monthWorkingDays = records.filter(
    (r) => r.status !== 'weekly_off' && r.status !== 'holiday' && !r.holiday_name
  );
  const monthTargetHours = monthWorkingDays.length > 0
    ? monthWorkingDays.length * 8
    : statistics.this_month.target_hours;

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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100/70 flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-[26px] md:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">Attendance</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Date, Month, Year Calendar Picker */}
          <AttendanceCalendarPicker
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            records={records}
            maxDate={todayDateStr}
          />

          {canManageAttendance && (
            <Link
              to="/admin/attendance-settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Attendance Settings</span>
            </Link>
          )}
        </div>
      </div>

      {/* Attendance Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setAttendanceTab('timesheet')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            attendanceTab === 'timesheet'
              ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          Timesheet & Attendance
        </button>
        <Link
          to="/calendar"
          id="attendance-view-calendar-tab-link"
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <Calendar className="w-3.5 h-3.5 text-teal-600" />
          <span>Calendar</span>
        </Link>
        <button
          type="button"
          onClick={() => setAttendanceTab('regularization')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
            attendanceTab === 'regularization'
              ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          My Regularizations
        </button>
        {canManageAttendance && (
          <button
            type="button"
            onClick={() => setAttendanceTab('approvals')}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              attendanceTab === 'approvals'
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Approvals
          </button>
        )}
      </div>

      {attendanceTab === 'timesheet' && (
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
          selectedMonth={selectedMonth}
          onSelectMonth={(m) => setSelectedMonth(m)}
          dayLabel={dayLabel}
          weekLabel={weekLabel}
          monthLabel={monthLabel}
          statusLabel={statusLabel}
          onOpenMyRequests={() => setAttendanceTab('regularization')}
        />
      )}

      {attendanceTab === 'regularization' && (
        <MyRegularizationsPanel />
      )}

      {attendanceTab === 'approvals' && canManageAttendance && (
        <ApprovalsPanel />
      )}

      {/* Regularization Modal when triggered from Timesheet card or records table */}
      {correctionModalDate && (
        <AddRegularizationModal
          isOpen={true}
          initialDate={correctionModalDate}
          initialCheckIn={correctionRow?.punch_in}
          initialCheckOut={correctionRow?.punch_out}
          onClose={() => setCorrectionModalDate(null)}
          onSuccess={() => {
            setInfoToast('Regularization request submitted successfully.');
            setCorrectionModalDate(null);
          }}
        />
      )}
    </div>
  );
};

export default AttendancePage;
