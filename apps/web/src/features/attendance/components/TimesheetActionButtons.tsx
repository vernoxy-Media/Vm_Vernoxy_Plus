import React from 'react';
import {
  LogIn,
  LogOut,
  Coffee,
  Play,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { TodayAttendanceData } from '../types/attendance.types';

export interface TimesheetActionButtonsProps {
  today: TodayAttendanceData;
  isPending: boolean;
  onPunchIn: () => Promise<any>;
  onPunchOutClick: () => void;
  onStartBreak: () => Promise<any>;
  onResumeBreak: () => Promise<any>;
}

export const TimesheetActionButtons: React.FC<TimesheetActionButtonsProps> = ({
  today,
  isPending,
  onPunchIn,
  onPunchOutClick,
  onStartBreak,
  onResumeBreak,
}) => {
  const isFullDayLeave = today.special_status === 'on_leave';

  let primaryBtnLabel = 'Punch In';
  let PrimaryBtnIcon = LogIn;
  let primaryBtnClass =
    'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-500/25 active:scale-[0.98] border border-emerald-400/30';
  let primaryDisabled = isPending || (isFullDayLeave && today.state === 'not_started');

  if (today.state === 'working' || today.state === 'on_break') {
    primaryBtnLabel = 'Punch Out';
    PrimaryBtnIcon = LogOut;
    primaryBtnClass =
      'bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-sm shadow-rose-500/25 active:scale-[0.98] border border-rose-400/30';
  } else if (today.state === 'done') {
    primaryBtnLabel = 'Done for today';
    PrimaryBtnIcon = CheckCircle2;
    primaryBtnClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed';
    primaryDisabled = true;
  }

  let secondaryBtnLabel = 'Take Break';
  let SecondaryBtnIcon = Coffee;
  let secondaryBtnClass =
    'bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-sm shadow-amber-500/25 active:scale-[0.98] border border-amber-400/30';
  let secondaryDisabled = isPending;
  let secondaryTooltip = '';

  if (today.state === 'not_started') {
    secondaryBtnLabel = 'Break';
    SecondaryBtnIcon = Coffee;
    secondaryBtnClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed';
    secondaryDisabled = true;
    secondaryTooltip = 'Punch in first';
  } else if (today.state === 'on_break') {
    secondaryBtnLabel = 'Resume Work';
    SecondaryBtnIcon = Play;
    secondaryBtnClass =
      'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm shadow-blue-500/25 active:scale-[0.98] border border-blue-400/30';
  } else if (today.state === 'done') {
    secondaryBtnLabel = 'Break';
    SecondaryBtnIcon = Coffee;
    secondaryBtnClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed';
    secondaryDisabled = true;
  }

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      <button
        type="button"
        id={today.state === 'not_started' ? 'punch-in-button' : 'punch-out-button'}
        onClick={today.state === 'not_started' ? onPunchIn : onPunchOutClick}
        disabled={primaryDisabled}
        className={`min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed cursor-pointer ${primaryBtnClass}`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <PrimaryBtnIcon className="w-4 h-4 shrink-0" />
        )}
        <span>{primaryBtnLabel}</span>
      </button>

      <div className="relative group">
        <button
          type="button"
          id={today.state === 'on_break' ? 'end-break-button' : 'start-break-button'}
          onClick={today.state === 'working' ? onStartBreak : onResumeBreak}
          disabled={secondaryDisabled}
          title={secondaryTooltip || undefined}
          className={`w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed cursor-pointer ${secondaryBtnClass}`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <SecondaryBtnIcon className="w-4 h-4 shrink-0" />
          )}
          <span>{secondaryBtnLabel}</span>
        </button>
        {secondaryTooltip && (
          <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-medium shadow-md whitespace-nowrap z-10">
            {secondaryTooltip}
          </div>
        )}
      </div>
    </div>
  );
};

