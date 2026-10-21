import React, { useState, useEffect, useRef } from 'react';
import type { AttendanceState } from '../types/attendance.types';
import { ProgressRing } from './ProgressRing';

export interface TickingWorkedTimerProps {
  state: AttendanceState;
  workedSeconds: number;
  serverNow: string;
  targetSeconds: number;
}

export function formatHoursMinutes(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0:00';
  }
  const safeSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const minutesStr = String(minutes).padStart(2, '0');
  return `${hours}:${minutesStr}`;
}

export const TickingWorkedTimer: React.FC<TickingWorkedTimerProps> = ({
  state,
  workedSeconds,
  serverNow,
  targetSeconds,
}) => {
  // Store the server-client clock offset computed when serverNow was received
  const clockOffsetRef = useRef<number>(0);
  const serverBaseTimeRef = useRef<number>(0);

  useEffect(() => {
    const serverMs = new Date(serverNow).getTime();
    serverBaseTimeRef.current = serverMs;
    clockOffsetRef.current = serverMs - Date.now();
  }, [serverNow]);

  const computeCurrentSeconds = () => {
    if (state !== 'working') {
      return workedSeconds;
    }
    // Calculate current adjusted server time
    const adjustedNow = Date.now() + clockOffsetRef.current;
    const elapsedSinceServerTime = Math.max(0, Math.floor((adjustedNow - serverBaseTimeRef.current) / 1000));
    return workedSeconds + elapsedSinceServerTime;
  };

  const [currentSeconds, setCurrentSeconds] = useState<number>(computeCurrentSeconds);

  // Re-sync immediately when props change
  useEffect(() => {
    setCurrentSeconds(computeCurrentSeconds());
  }, [state, workedSeconds, serverNow]);

  // Tick every second ONLY while working
  useEffect(() => {
    if (state !== 'working') return;

    const interval = setInterval(() => {
      setCurrentSeconds(computeCurrentSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [state, workedSeconds, serverNow]);

  const progress = targetSeconds > 0 ? currentSeconds / targetSeconds : 0;
  const timeFormatted = formatHoursMinutes(currentSeconds);

  // Status badge styling & gradient mapping
  let statusBadge = (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      Working
    </span>
  );
  let gradFrom = '#2563eb';
  let gradTo = '#4f46e5';

  if (state === 'not_started') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        Ready
      </span>
    );
    gradFrom = '#94a3b8';
    gradTo = '#64748b';
  } else if (state === 'on_break') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        On Break
      </span>
    );
    gradFrom = '#f59e0b';
    gradTo = '#ea580c';
  } else if (state === 'done') {
    statusBadge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        Completed
      </span>
    );
    gradFrom = '#10b981';
    gradTo = '#059669';
  }

  return (
    <div id="live-session-timer" className="flex flex-col items-center justify-center my-4">
      <div className="relative p-2 rounded-full bg-radial from-slate-50/60 to-white">
        <ProgressRing
          progress={progress}
          size={190}
          strokeWidth={12}
          gradientFrom={gradFrom}
          gradientTo={gradTo}
        >
          <div className="px-2 flex flex-col items-center">
            <span
              className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-slate-900 block select-none"
              aria-label={`Worked ${timeFormatted} hours`}
            >
              {timeFormatted}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 block">
              HOURS LOGGED
            </span>
            <div className="mt-2">
              {statusBadge}
            </div>
          </div>
        </ProgressRing>
      </div>
      <div className="sr-only" aria-live="polite">
        Current worked time {timeFormatted} hours, status {state}
      </div>
    </div>
  );
};

