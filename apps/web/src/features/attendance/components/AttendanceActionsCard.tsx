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
  onResumeWork: () => Promise<any>;
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
  hint: string;
  icon: React.ElementType;
  /** Soft tint behind the icon so each kind of break is recognised at a glance */
  tint: string;
}> = [
  { id: 'Tea Break', label: 'Tea Break', hint: 'A quick breather', icon: Coffee, tint: 'bg-amber-50 text-amber-600' },
  { id: 'Lunch Break', label: 'Lunch Break', hint: 'Meal time', icon: Utensils, tint: 'bg-orange-50 text-orange-600' },
  { id: 'Personal Break', label: 'Personal Break', hint: 'Step away for a moment', icon: User, tint: 'bg-sky-50 text-sky-600' },
  { id: 'Other Break', label: 'Other Break', hint: 'Anything else', icon: MessageSquare, tint: 'bg-violet-50 text-violet-600' },
];

export const AttendanceActionsCard: React.FC<AttendanceActionsCardProps> = ({
  today,
  isPending,
  onPunchIn,
  onPunchOut,
  onResumeWork,
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

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setBreakDropdownOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setBreakDropdownOpen(false);
    }
    if (breakDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
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

  // One tap on the red button only asks; a second tap within a few seconds clocks out. A clock-out by mistake used to
  // end the day with no way back.
  const [confirmOut, setConfirmOut] = useState(false);
  useEffect(() => {
    if (!confirmOut) return;
    const t = window.setTimeout(() => setConfirmOut(false), 6000);
    return () => window.clearTimeout(t);
  }, [confirmOut]);

  const isWorking = today.state === 'working';
  const isOnBreak = today.state === 'on_break';
  // Clocked out: there is one clock-in per day, so offering "Web Clock-in" again could only fail with a 409
  const isDone = today.state === 'done';

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
  ) : isDone ? (
    <button
      type="button"
      disabled={isPending}
      onClick={() => void onResumeWork()}
      title="Still working? This opens today again. The time since you clocked out is counted as a break."
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-5 py-4 text-base font-bold text-[color:var(--ac-dark,#1D4ED8)] shadow-md transition hover:bg-sky-50 active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
    >
      {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
      Resume work
    </button>
  ) : isWorking && confirmOut ? (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setConfirmOut(false);
          void onPunchOut();
        }}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-4 text-base font-bold text-white shadow-md transition hover:bg-rose-600 active:scale-[0.98] disabled:opacity-60 cursor-pointer whitespace-nowrap"
      >
        <LogOut className="h-5 w-5" />
        Yes, clock out
      </button>
      <button
        type="button"
        onClick={() => setConfirmOut(false)}
        className="rounded-xl bg-white/15 px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/25 cursor-pointer"
      >
        Keep working
      </button>
    </div>
  ) : (
    <button
      type="button"
      disabled={isPending}
      onClick={() => (isWorking ? setConfirmOut(true) : onPunchIn())}
      className={`inline-flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-4 text-base font-bold shadow-md transition active:scale-[0.98] disabled:opacity-50 whitespace-nowrap cursor-pointer ${
        isWorking ? 'bg-rose-500 text-white hover:bg-rose-600' : 'cta-pulse bg-white text-[color:var(--ac-dark,#1D4ED8)] hover:bg-sky-50'
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
      className="relative flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-[color:rgb(var(--tw-indigo-950,11_27_74))] via-[color:var(--ac-dark,#16358F)] to-[color:var(--ac-main,#2563EB)] p-4 text-white shadow-lg shadow-blue-900/10 sm:p-5"
    >
      {/* The glow is clipped on its own, so the card itself does not clip the break menu */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </span>
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
            ) : isDone ? (
              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white">Clocked out</span>
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
                aria-haspopup="menu"
                aria-expanded={breakDropdownOpen}
                className={`${linkCls} inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40 ${breakDropdownOpen ? 'bg-white/25' : ''}`}
              >
                Take a Break
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${breakDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {breakDropdownOpen && (
                <div
                  role="menu"
                  aria-label="Select break"
                  className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-left rounded-2xl bg-white p-1.5 shadow-2xl shadow-slate-900/25 ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95"
                >
                  <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Select break</div>
                  {BREAK_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitem"
                        onClick={() => handleSelectBreak(opt.id)}
                        className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none cursor-pointer"
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${opt.tint}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold leading-tight text-slate-800">{opt.label}</span>
                          <span className="block text-[11px] leading-tight text-slate-400">{opt.hint}</span>
                        </span>
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
