import React from 'react';
import { PanelCard } from './AttendanceMetricsOverview';

export interface AttendanceTimingsCardProps {
  todayWorkedSeconds: number;
  todayTargetSeconds?: number;
  shiftStart?: string;
  shiftEnd?: string;
  isOnBreak?: boolean;
  /** ISO time of today's clock-in */
  clockInAt?: string | null;
}

const hm = (sec: number) => {
  const t = Math.max(0, Math.floor(sec / 60));
  const h = Math.floor(t / 60);
  return h ? `${h}h ${String(t % 60).padStart(2, '0')}m` : `${t % 60}m`;
};

const goal = (sec: number) => {
  const t = Math.round(sec / 60);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} hrs`;
};

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const AttendanceTimingsCard: React.FC<AttendanceTimingsCardProps> = ({
  todayWorkedSeconds,
  todayTargetSeconds = 28800, // 8h standard
  shiftStart = '09:00 AM',
  shiftEnd = '05:30 PM',
  isOnBreak = false,
}) => {
  const todayIdx = new Date().getDay();
  const pct = todayTargetSeconds > 0 ? Math.min(100, Math.round((todayWorkedSeconds / todayTargetSeconds) * 100)) : 0;
  const done = todayTargetSeconds > 0 && todayWorkedSeconds >= todayTargetSeconds;
  const bar = isOnBreak ? 'bg-amber-400' : done ? 'bg-emerald-500' : 'bg-[color:var(--ac-main,#5B4CF8)]';

  return (
    <PanelCard id="attendance-timings-card" label="Timings">
      <div className="flex items-center justify-between gap-1" role="list" aria-label="Days of the week">
        {DAYS.map((d, i) => (
          <span
            key={i}
            role="listitem"
            aria-label={DAY_NAMES[i]}
            aria-current={i === todayIdx ? 'date' : undefined}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold transition ${
              i === todayIdx
                ? 'bg-[color:var(--ac-main,#5B4CF8)] text-white shadow-md shadow-[rgb(var(--ac-main-rgb,91_76_248)/0.35)]'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {d}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-slate-800">
            Today ({shiftStart} – {shiftEnd})
          </span>
          {isOnBreak ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">On break</span>
          ) : done ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Goal reached</span>
          ) : null}
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Today's progress"
        >
          <div className={`${bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span>Duration: {hm(todayWorkedSeconds)}</span>
          <span>Goal: {goal(todayTargetSeconds)}</span>
        </div>
      </div>
    </PanelCard>
  );
};
