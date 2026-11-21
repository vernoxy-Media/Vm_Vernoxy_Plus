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

  const h12 = String(now.getHours() % 12 || 12).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

  // Format Date: e.g. Sat, Nov 21, 2026
  const dateFormatted = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

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

  const btnBase =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide transition active:scale-[0.97] disabled:opacity-50 whitespace-nowrap cursor-pointer';
  const accentBtn = `${btnBase} bg-[color:var(--ac-main,#5B4CF8)] text-white shadow-lg shadow-[rgb(var(--ac-main-rgb,91_76_248)/0.3)] hover:bg-[color:var(--ac-dark,#4338CA)]`;
  const redBtn = `${btnBase} bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600`;
  const softBtn = `${btnBase} bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed`;

  const primary = isOnBreak ? (
    <button
      type="button"
      disabled
      title="You cannot clock out while on break. Please resume work first."
      className={`${btnBase} bg-slate-100 text-slate-400 cursor-not-allowed`}
    >
      Clock-out
    </button>
  ) : isDone ? (
    <button
      type="button"
      disabled={isPending}
      onClick={() => void onResumeWork()}
      title="Still working? This opens today again. The time since you clocked out is counted as a break."
      className={accentBtn}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
      Resume work
    </button>
  ) : isWorking && confirmOut ? (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setConfirmOut(false);
          void onPunchOut();
        }}
        className={redBtn}
      >
        <LogOut className="h-4 w-4" />
        Yes, clock out
      </button>
      <button type="button" onClick={() => setConfirmOut(false)} className={softBtn}>
        Keep working
      </button>
    </div>
  ) : (
    <button
      type="button"
      disabled={isPending}
      onClick={() => (isWorking ? setConfirmOut(true) : onPunchIn())}
      className={isWorking ? redBtn : `cta-pulse ${accentBtn}`}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isWorking ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
      {isWorking ? 'Clock-out' : 'Clock-in'}
    </button>
  );

  const statusText = isOnBreak ? 'On break' : isWorking ? (isWfh ? 'Remote clock-in' : 'Working') : isDone ? 'Clocked out' : 'Ready to clock in';

  return (
    <section
      id="attendance-actions-card"
      className="flex flex-col rounded-2xl border border-[#E8EBF2] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6"
    >
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Actions</h3>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <div className="flex items-baseline whitespace-nowrap leading-none text-slate-900">
            <span className="text-3xl font-extrabold tracking-tight sm:text-[36px]">{h12}:{minutes}</span>
            <span className="ml-1 text-sm font-medium text-slate-500">:{seconds} {ampm}</span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500">{dateFormatted}</div>

          <div className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[color:var(--ac-main,#5B4CF8)]">
            {statusText}
          </div>
          <label htmlFor="wfh-toggle" className="mt-1.5 inline-flex cursor-pointer select-none items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <input
              type="checkbox"
              id="wfh-toggle"
              checked={isWfh}
              onChange={(e) => setIsWfh(e.target.checked)}
              className="peer sr-only"
            />
            <span aria-hidden className="relative h-4 w-7 rounded-full bg-slate-200 transition peer-checked:bg-[color:var(--ac-main,#5B4CF8)] after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-3" />
            Work from home
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isOnBreak ? (
            <button type="button" disabled={isPending} onClick={() => onResumeBreak()} className={softBtn}>
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
                className={`${softBtn} ${breakDropdownOpen ? 'bg-slate-200' : ''} disabled:opacity-40`}
              >
                Break
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${breakDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {breakDropdownOpen && (
                <div
                  role="menu"
                  aria-label="Select break"
                  className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl bg-white p-1.5 shadow-2xl shadow-slate-900/25 ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95"
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
          {primary}
        </div>
      </div>

      {(today.punched_in_at || onRegularize) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
          {today.punched_in_at ? (
            <span>
              Clocked in at{' '}
              <b className="font-semibold text-slate-800">
                {new Date(today.punched_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </b>
              {today.punched_out_at && (
                <>
                  {' '}· out at{' '}
                  <b className="font-semibold text-slate-800">
                    {new Date(today.punched_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </b>
                </>
              )}
            </span>
          ) : (
            <span />
          )}
          {onRegularize && (
            <button type="button" onClick={onRegularize} className="font-semibold text-[color:var(--ac-main,#5B4CF8)] hover:underline cursor-pointer">
              Forgot to Clock-in/out
            </button>
          )}
        </div>
      )}
    </section>
  );
};
