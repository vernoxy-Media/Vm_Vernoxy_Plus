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
    'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-xs';
  let primaryDisabled = isPending || (isFullDayLeave && today.state === 'not_started');

  if (today.state === 'working' || today.state === 'on_break') {
    primaryBtnLabel = 'Punch Out';
    PrimaryBtnIcon = LogOut;
    primaryBtnClass =
      'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-xs';
  } else if (today.state === 'done') {
    primaryBtnLabel = 'Done for today';
    PrimaryBtnIcon = CheckCircle2;
    primaryBtnClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed';
    primaryDisabled = true;
  }

  let secondaryBtnLabel = 'Break';
  let SecondaryBtnIcon = Coffee;
  let secondaryBtnClass =
    'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500 shadow-xs';
  let secondaryDisabled = isPending;
  let secondaryTooltip = '';

  if (today.state === 'not_started') {
    secondaryBtnLabel = 'Break';
    SecondaryBtnIcon = Coffee;
    secondaryBtnClass = 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed';
    secondaryDisabled = true;
    secondaryTooltip = 'Punch in first';
  } else if (today.state === 'on_break') {
    secondaryBtnLabel = 'Resume';
    SecondaryBtnIcon = Play;
    secondaryBtnClass =
      'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-xs';
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
        className={`min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${primaryBtnClass}`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <PrimaryBtnIcon className="w-4 h-4" />
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
          className={`w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${secondaryBtnClass}`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <SecondaryBtnIcon className="w-4 h-4" />
          )}
          <span>{secondaryBtnLabel}</span>
        </button>
        {secondaryTooltip && (
          <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-slate-800 text-white text-xs whitespace-nowrap z-10">
            {secondaryTooltip}
          </div>
        )}
      </div>
    </div>
  );
};
