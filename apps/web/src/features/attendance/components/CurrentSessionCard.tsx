import React, { useState } from 'react';
import {
  Video,
  Coffee,
  Target,
  History,
} from 'lucide-react';
import type { TodayAttendanceData } from '../types/attendance.types';
import { ProgressRing } from './ProgressRing';
import { formatHoursMinutes } from './TickingWorkedTimer';
import { TimesheetActionButtons } from './TimesheetActionButtons';
import { TimesheetStatusBanners } from './TimesheetStatusBanners';
import { ConfirmDialog } from './ConfirmDialog';
import { ActivityHistoryDrawer } from './ActivityHistoryDrawer';

export interface CurrentSessionCardProps {
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
}

export const CurrentSessionCard: React.FC<CurrentSessionCardProps> = ({
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
}) => {
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  const targetSec = today.target_seconds || 28800; // 8 hours default
  const workedSec = today.worked_seconds || 0;
  const breakSec = today.break_seconds || 0;

  const progress = targetSec > 0 ? Math.min(1, workedSec / targetSec) : 0;
  const timeFormatted = formatHoursMinutes(workedSec);
  const breakFormatted = formatHoursMinutes(breakSec).replace(':', 'h ') + 'm';
  const targetFormatted = formatHoursMinutes(targetSec).replace(':', 'h ') + 'm';

  // Ring colors based on state
  let ringColor = '#10b981'; // Green = Working
  let badgeLabel = 'Working';
  let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
  let dotClass = 'bg-emerald-500 animate-pulse';

  if (today.state === 'not_started') {
    ringColor = '#cbd5e1'; // Gray = Clocked Out
    badgeLabel = 'Clocked Out';
    badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
    dotClass = 'bg-slate-400';
  } else if (today.state === 'on_break') {
    ringColor = '#ef4444'; // Red = Break
    badgeLabel = today.active_break_type || 'On Break';
    badgeClass = 'bg-rose-50 text-rose-700 border-rose-200/80';
    dotClass = 'bg-rose-500 animate-pulse';
  } else if (today.state === 'done') {
    ringColor = '#94a3b8'; // Gray = Finished
    badgeLabel = 'Shift Ended';
    badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
    dotClass = 'bg-slate-400';
  }

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

  // Find last punch timestamp for subtle "Last punch: HH:MM" line
  const lastPunchEvent = [...today.timeline].reverse().find((t) => t.type === 'punch_in' || t.type === 'punch_out');
  const lastPunchTime = lastPunchEvent?.display_time || (today.punched_in_at ? formatHoursMinutes(0) : null);

  return (
    <div
      id="current-session-card"
      className="bg-white rounded-xl border border-slate-300 shadow-[0_2px_12px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] transition-all p-5 flex flex-col justify-between h-full"
    >
      <div>
        {/* Header - Single status indicator (inside ring), clean history button with tooltip */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Video className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Current Session</h3>
              {lastPunchTime && (
                <span className="text-xs text-slate-500 font-medium">
                  Last punch: <span className="font-mono text-slate-700 font-semibold">{lastPunchTime}</span>
                </span>
              )}
            </div>
          </div>

          {/* History / Timeline Drawer Trigger Icon with Tooltip & no decorative dot */}
          <button
            type="button"
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="View today's activity log"
            aria-label="View activity log"
          >
            <History className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Banners */}
        <TimesheetStatusBanners
          today={today}
          errorMessage={errorMessage}
          infoToast={infoToast}
          onDismissToast={onDismissToast}
        />

        {/* Hero Progress Ring (168px diameter, 9px stroke) with 34px timer */}
        <div className="my-2 flex flex-col items-center justify-center">
          <ProgressRing
            progress={progress}
            size={168}
            strokeWidth={9}
            ringColor={ringColor}
            trackColor="#f1f5f9"
          >
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-[34px] font-extrabold text-slate-900 tracking-tight font-mono leading-none">
                {timeFormatted}
              </span>
              <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-widest mt-1">
                HOURS LOGGED
              </span>
              <div className="mt-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                  <span>{badgeLabel}</span>
                </span>
              </div>
            </div>
          </ProgressRing>
        </div>

        {/* Action Buttons (Break & Punch Out 44px tall) */}
        <div className="mt-1">
          <TimesheetActionButtons
            today={today}
            isPending={isPending}
            onPunchIn={onPunchIn}
            onPunchOutClick={handlePunchOutClick}
            onStartBreak={onStartBreak}
            onResumeBreak={onResumeBreak}
          />
        </div>
      </div>

      {/* Mini Stats Below Buttons - Compact 10-12px padding borderless tinted tiles */}
      <div className="grid grid-cols-2 gap-2.5 pt-3.5 mt-auto border-t border-slate-100">
        {/* Break So Far */}
        <div className="p-2.5 rounded-lg bg-slate-50 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Coffee className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block leading-tight">Break So Far</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{breakFormatted}</span>
          </div>
        </div>

        {/* Daily Target */}
        <div className="p-2.5 rounded-lg bg-slate-50 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block leading-tight">Daily Target</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{targetFormatted}</span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog when punching out while on active break */}
      <ConfirmDialog
        isOpen={showBreakConfirm}
        title="Active Break in Progress"
        message="You currently have an active break. Punching out will automatically end your break and record your final departure. Proceed?"
        confirmLabel="End Break & Punch Out"
        isDestructive={true}
        onConfirm={confirmPunchOut}
        onCancel={() => setShowBreakConfirm(false)}
      />

      {/* Today's Activity Log Slide-over Drawer */}
      <ActivityHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        timeline={today.timeline}
        selectedDate={today.date}
        isSelectedToday={isSelectedToday}
      />
    </div>
  );
};
