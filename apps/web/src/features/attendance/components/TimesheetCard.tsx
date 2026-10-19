import React, { useState } from 'react';
import type { TodayAttendanceData } from '../types/attendance.types';
import { TickingWorkedTimer, formatHoursMinutes } from './TickingWorkedTimer';
import { TimesheetActionButtons } from './TimesheetActionButtons';
import { TimesheetStatusBanners } from './TimesheetStatusBanners';
import { ConfirmDialog } from './ConfirmDialog';

export interface TimesheetCardProps {
  today: TodayAttendanceData;
  isPending: boolean;
  onPunchIn: () => Promise<any>;
  onPunchOut: () => Promise<any>;
  onStartBreak: () => Promise<any>;
  onResumeBreak: () => Promise<any>;
  errorMessage?: string | null;
  infoToast?: string | null;
  onDismissToast?: () => void;
}

export const TimesheetCard: React.FC<TimesheetCardProps> = ({
  today,
  isPending,
  onPunchIn,
  onPunchOut,
  onStartBreak,
  onResumeBreak,
  errorMessage,
  infoToast,
  onDismissToast,
}) => {
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);

  const todayDateObj = new Date(today.date || new Date().toISOString().slice(0, 10));
  const formattedTodayDate = todayDateObj.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const punchedInText = today.punched_in_at
    ? `Punched in at ${new Date(today.punched_in_at).toLocaleTimeString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : 'Not punched in';

  const breakFormatted = formatHoursMinutes(today.break_seconds);
  const targetFormatted = formatHoursMinutes(today.target_seconds);

  const handlePunchOutClick = () => {
    if (today.state === 'on_break') {
      setShowBreakConfirm(true);
    } else {
      onPunchOut();
    }
  };

  const confirmPunchOut = async () => {
    setShowBreakConfirm(false);
    await onPunchOut();
  };

  return (
    <div id="timesheet-card" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold text-blue-600 tracking-tight">Timesheet</h2>
          <span className="text-xs font-semibold text-slate-500">{formattedTodayDate}</span>
        </div>

        <TimesheetStatusBanners
          today={today}
          errorMessage={errorMessage}
          infoToast={infoToast}
          onDismissToast={onDismissToast}
        />

        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Punch In Status</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">{punchedInText}</p>
        </div>

        <TickingWorkedTimer
          state={today.state}
          workedSeconds={today.worked_seconds}
          serverNow={today.server_now}
          targetSeconds={today.target_seconds}
        />

        <TimesheetActionButtons
          today={today}
          isPending={isPending}
          onPunchIn={onPunchIn}
          onPunchOutClick={handlePunchOutClick}
          onStartBreak={onStartBreak}
          onResumeBreak={onResumeBreak}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-5 mt-5 border-t border-slate-100 text-center">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Break so far
          </span>
          <span className="text-sm font-bold text-slate-800 mt-0.5 block">
            {breakFormatted} hrs
          </span>
        </div>
        <div className="border-l border-slate-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Target
          </span>
          <span className="text-sm font-bold text-slate-800 mt-0.5 block">
            {targetFormatted} hrs
          </span>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showBreakConfirm}
        title="Active Break in Progress"
        message="You are currently on a break. Punching out will automatically end your break and finish your workday. Continue?"
        confirmLabel="Punch Out & End Day"
        cancelLabel="Stay on Break"
        isDestructive={true}
        isLoading={isPending}
        onConfirm={confirmPunchOut}
        onCancel={() => setShowBreakConfirm(false)}
      />
    </div>
  );
};
