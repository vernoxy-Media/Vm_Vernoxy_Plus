import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Coffee,
  Utensils,
  User,
  MessageSquare,
  Loader2,
  LogIn,
  LogOut,
} from 'lucide-react';
import type { TodayAttendanceData, BreakOption } from '../types/attendance.types';

export interface AttendanceActionsCardProps {
  today: TodayAttendanceData;
  isPending: boolean;
  onPunchIn: () => Promise<any>;
  onPunchOut: () => Promise<any>;
  onStartBreak: (breakType?: string, reason?: string) => Promise<any>;
  onResumeBreak: () => Promise<any>;
  errorMessage?: string | null;
  infoToast?: string | null;
  onDismissToast?: () => void;
  onRegularize?: () => void;
}

const BREAK_OPTIONS: Array<{
  id: BreakOption;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'Tea Break', label: 'Tea Break', icon: Coffee },
  { id: 'Lunch Break', label: 'Lunch Break', icon: Utensils },
  { id: 'Personal Break', label: 'Personal Break', icon: User },
  { id: 'Other Break', label: 'Other Break', icon: MessageSquare },
];

export const AttendanceActionsCard: React.FC<AttendanceActionsCardProps> = ({
  today,
  isPending,
  onPunchIn,
  onPunchOut,
  onStartBreak,
  onResumeBreak,
  onRegularize,
}) => {
  const [now, setNow] = useState(new Date());
  const [isWfh, setIsWfh] = useState(false);
  const [breakDropdownOpen, setBreakDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setBreakDropdownOpen(false);
      }
    }
    if (breakDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [breakDropdownOpen]);

  // Format Clock: e.g. 13:51 :59 PM
  const h24 = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

  // Format Date: e.g. Sun, Nov 1, 2026
  const dateFormatted = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const targetSec = today.target_seconds || 28800;
  const workedSec = today.worked_seconds || 0;
  const breakSec = today.break_seconds || 0;
  const remainingSec = Math.max(0, targetSec - workedSec);
  const pct = targetSec > 0 ? Math.min(100, Math.round((workedSec / targetSec) * 100)) : 0;
  const hm = (sec: number) => {
    const t = Math.max(0, Math.round(sec / 60));
    return `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, '0')}m`;
  };

  const isWorking = today.state === 'working';
  const isOnBreak = today.state === 'on_break';

  const handleSelectBreak = (type: BreakOption) => {
    setBreakDropdownOpen(false);
    onStartBreak(type);
  };

  const primary = isOnBreak ? (
    <button
      type="button"
      disabled
      title="You cannot clock out while on break. Please resume work first."
      className="w-full rounded-xl bg-white/15 px-5 py-4 text-base font-semibold text-white/50 cursor-not-allowed whitespace-nowrap"
    >
      Web Clock-out
    </button>
  ) : (
    <button
      type="button"
      disabled={isPending}
      onClick={() => (isWorking ? onPunchOut() : onPunchIn())}
      className={`inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-4 text-base font-bold shadow-md transition active:scale-[0.98] disabled:opacity-50 whitespace-nowrap cursor-pointer ${
        isWorking ? 'bg-rose-500 text-white hover:bg-rose-600' : 'cta-pulse bg-white text-[#1D4ED8] hover:bg-sky-50'
      }`}
    >
      {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : isWorking ? <LogOut className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
      {isWorking ? 'Web Clock-out' : 'Web Clock-in'}
    </button>
  );

  const linkCls = 'inline-flex w-full items-center justify-between gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-left text-[13px] font-medium text-white transition hover:bg-white/20 cursor-pointer';

  return (
    <div
      id="attendance-actions-card"
      className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1B4A] via-[#16358F] to-[#2563EB] p-4 text-white shadow-lg shadow-blue-900/10 sm:p-5"
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div>
          <div className="flex items-baseline whitespace-nowrap font-medium leading-none text-white">
            <span className="text-4xl sm:text-[44px] tracking-tight">{h24}:{minutes}</span>
            <span className="ml-1 text-sm text-sky-200">:{seconds} {ampm}</span>
          </div>
          <div className="mt-2 text-xs text-sky-200">{dateFormatted}</div>
          <div className="mt-3">
            {isOnBreak ? (
              <span className="rounded-full bg-amber-400/90 px-3 py-1 text-[11px] font-bold text-amber-950">On Break</span>
            ) : isWorking ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/90 px-3 py-1 text-[11px] font-bold text-emerald-950">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-900" />
                Working
              </span>
            ) : (
              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white">Ready to Clock In</span>
            )}
          </div>
          {today.punched_in_at && (
            <p className="mt-3 text-xs text-sky-100/80">
              Clocked in at{' '}
              <span className="font-semibold text-white">
                {new Date(today.punched_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {today.punched_out_at && (
                <>
                  {' '}· out at{' '}
                  <span className="font-semibold text-white">
                    {new Date(today.punched_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        <div className="grid w-full min-w-[11rem] grid-cols-2 gap-2 sm:w-auto sm:min-w-[16rem]">
          <div className="col-span-2">{primary}</div>

          {isOnBreak ? (
            <button type="button" disabled={isPending} onClick={() => onResumeBreak()} className={linkCls}>
              Resume Work
            </button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                disabled={!isWorking || isPending}
                onClick={() => setBreakDropdownOpen((prev) => !prev)}
                className={`${linkCls} inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Take a Break <ChevronDown className="h-4 w-4" />
              </button>
              {breakDropdownOpen && (
                <div className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-xl border border-[#D4DCE6] bg-white py-1.5 shadow-xl animate-in fade-in">
                  <div className="px-3 py-1 text-[10px] font-extrabold uppercase text-[#94A3B8]">Select Break</div>
                  {BREAK_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectBreak(opt.id)}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-[#1E293B] hover:bg-[#F4F4FF]"
                      >
                        <Icon className="h-3.5 w-3.5 text-[#64748B]" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {onRegularize && (
            <button type="button" onClick={onRegularize} className={`${linkCls} col-span-2`}>
              Forgot to Clock-in/out
            </button>
          )}

          <label htmlFor="wfh-toggle" className="inline-flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-white/20">
            <input
              type="checkbox"
              id="wfh-toggle"
              checked={isWfh}
              onChange={(e) => setIsWfh(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-white"
            />
            Work From Home
          </label>
        </div>
      </div>

      <div className="relative mt-auto rounded-xl bg-white/10 p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-semibold tabular-nums">{hm(workedSec)}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-200/80">Worked</div>
            </div>
            <div>
              <div className="text-sm font-semibold tabular-nums">{hm(breakSec)}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-200/80">Break</div>
            </div>
            <div>
              <div className="text-sm font-semibold tabular-nums">{remainingSec > 0 ? hm(remainingSec) : 'Done'}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-200/80">Remaining</div>
            </div>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Today's progress">
            <div className="h-full rounded-full bg-sky-300 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
    </div>
  );
};
