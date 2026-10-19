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

  // Status text under timer
  let statusText = 'Working';
  if (state === 'not_started') statusText = 'Not started';
  else if (state === 'on_break') statusText = 'On break';
  else if (state === 'done') statusText = 'Done for today';

  return (
    <div id="live-session-timer" className="flex flex-col items-center justify-center my-3">
      <ProgressRing progress={progress} size={180} strokeWidth={12}>
        <div className="px-2">
          <span
            className="text-3xl font-extrabold tracking-tight text-slate-900 block"
            aria-label={`Worked ${timeFormatted} hours`}
          >
            {timeFormatted}{' '}
            <span className="text-lg font-semibold text-slate-500">hrs</span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1 block">
            {statusText}
          </span>
        </div>
      </ProgressRing>
      <div className="sr-only" aria-live="polite">
        Current worked time {timeFormatted} hours, status {statusText}
      </div>
    </div>
  );
};
