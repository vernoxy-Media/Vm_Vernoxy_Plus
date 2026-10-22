import React, { useState } from 'react';
import { Timer, Clock, Coffee, Target, AlertCircle, RotateCcw } from 'lucide-react';
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
  onStartBreak: (breakType?: string, reason?: string) => Promise<any>;
  onResumeBreak: () => Promise<any>;
  errorMessage?: string | null;
  infoToast?: string | null;
  onDismissToast?: () => void;
  isSelectedToday?: boolean;
  onRequestCorrection?: (date: string) => void;
  onReturnToToday?: () => void;
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
  isSelectedToday = true,
  onRequestCorrection,
  onReturnToToday,
}) => {
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);

  const todayDateObj = new Date(today.date || new Date().toISOString().slice(0, 10));
  const formattedTodayDate = todayDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const punchedInTime = today.punched_in_at
    ? new Date(today.punched_in_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

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
    <div id="timesheet-card" className="bg-white rounded-2xl border border-slate-300 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Timesheet</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
              {formattedTodayDate}
            </span>
            {!isSelectedToday && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                Selected Day
              </span>
            )}
          </div>
        </div>

        <TimesheetStatusBanners
          today={today}
          errorMessage={errorMessage}
          infoToast={infoToast}
          onDismissToast={onDismissToast}
        />

        {/* Modern Punch In Status Pill */}
        <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              today.punched_in_at ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Clock In Status
              </p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {punchedInTime
                  ? `Punched in at ${punchedInTime}`
                  : today.special_status === 'holiday'
                  ? `Holiday: ${today.special_status_reason || 'Official'}`
                  : today.special_status === 'weekly_off'
                  ? 'Weekly Off'
                  : today.special_status === 'on_leave'
                  ? `On Leave: ${today.special_status_reason || 'Approved'}`
                  : isSelectedToday
                  ? 'Not punched in yet'
                  : 'Absent • No punch logged'}
              </p>
            </div>
          </div>
          {isSelectedToday && today.punched_in_at && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Shift
            </span>
          )}
        </div>

        <TickingWorkedTimer
          state={today.state}
          workedSeconds={today.worked_seconds}
          serverNow={today.server_now}
          targetSeconds={today.target_seconds}
        />

        {!isSelectedToday ? (
          <div className="mt-4 flex items-center gap-2">
            {onRequestCorrection && (
              <button
                type="button"
                id="timesheet-request-correction-btn"
                onClick={() => onRequestCorrection(today.date)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Request Correction</span>
              </button>
            )}
            {onReturnToToday && (
              <button
                type="button"
                id="timesheet-return-today-btn"
                onClick={onReturnToToday}
                className="py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Today</span>
              </button>
            )}
          </div>
        ) : (
          <TimesheetActionButtons
            today={today}
            isPending={isPending}
            onPunchIn={onPunchIn}
            onPunchOutClick={handlePunchOutClick}
            onStartBreak={onStartBreak}
            onResumeBreak={onResumeBreak}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-5 mt-5 border-t border-slate-200">
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Coffee className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Break so far
            </span>
            <span className="text-xs font-extrabold text-slate-900 block mt-0.5">
              {breakFormatted} hrs
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Target className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Daily Target
            </span>
            <span className="text-xs font-extrabold text-slate-900 block mt-0.5">
              {targetFormatted} hrs
            </span>
          </div>
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

