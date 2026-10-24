import React, { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { formatHoursMinutes } from './TickingWorkedTimer';
import type { TimelineEvent } from '../types/attendance.types';

export interface CurrentTimeTimingsCardProps {
  todayWorkedSeconds: number;
  todayBreakSeconds: number;
  todayTargetSeconds?: number;
  punchInTime?: string | null;
  shiftStart?: string; // fallback e.g. "09:00 AM"
  shiftEnd?: string; // fallback e.g. "05:30 PM"
  timeline?: TimelineEvent[];
  todayState?: string;
}

export function computeShiftTimings(
  punchInTime: string | null | undefined,
  breakSeconds: number,
  targetSeconds: number = 28800, // 8h default
  fallbackStart: string = '09:00 AM',
  fallbackEnd: string = '05:30 PM'
): { shiftStart: string; shiftEnd: string } {
  if (!punchInTime) {
    return { shiftStart: fallbackStart, shiftEnd: fallbackEnd };
  }

  let startDate: Date;
  if (punchInTime.includes('T') || punchInTime.includes('Z')) {
    startDate = new Date(punchInTime);
    if (isNaN(startDate.getTime())) {
      startDate = new Date();
    }
  } else {
    // Format like "09:23 AM" or "10:00 AM"
    const match = punchInTime.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[4]?.toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
    } else {
      return { shiftStart: fallbackStart, shiftEnd: fallbackEnd };
    }
  }

  // End Date = punchIn + 8 hours + accumulated break seconds
  const totalShiftSpanSeconds = targetSeconds + Math.max(0, breakSeconds);
  const endDate = new Date(startDate.getTime() + totalShiftSpanSeconds * 1000);

  const formatAMPM = (d: Date) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const displayH = String(h).padStart(2, '0');
    return `${displayH}:${m} ${ampm}`;
  };

  return {
    shiftStart: formatAMPM(startDate),
    shiftEnd: formatAMPM(endDate),
  };
}

interface TimelineSegment {
  id: string;
  type: 'work' | 'break';
  seconds: number;
  pct: number;
  label: string;
}

export const CurrentTimeTimingsCard: React.FC<CurrentTimeTimingsCardProps> = ({
  todayWorkedSeconds,
  todayBreakSeconds,
  todayTargetSeconds = 28800, // 8h
  punchInTime,
  shiftStart: propShiftStart,
  shiftEnd: propShiftEnd,
  timeline = [],
  todayState = 'working',
}) => {
  const [now, setNow] = useState(new Date());

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute dynamic shift start/end from punch in + 8h target + break extension
  const { shiftStart, shiftEnd } = computeShiftTimings(
    punchInTime,
    todayBreakSeconds,
    todayTargetSeconds,
    propShiftStart || '09:00 AM',
    propShiftEnd || '05:30 PM'
  );

  // Format Time: "10:35:00 AM"
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  // Format Date: "Fri, Oct 23, 2026"
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Weekly Day Selector (S M T W T F S)
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const currentDayIndex = now.getDay(); // 0 is Sunday, 5 is Friday, etc.

  // Shift Calculations: Dynamic shift span = 8h target + break seconds
  const shiftSpanSec = (todayTargetSeconds || 28800) + Math.max(0, todayBreakSeconds);

  // Compute alternating chronological intervals: e.g. Work -> Break -> Work -> Remaining
  const timelineSegments = useMemo(() => {
    const rawEvents = [...timeline]
      .filter((e) => ['punch_in', 'break_start', 'break_end', 'punch_out'].includes(e.type))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const result: TimelineSegment[] = [];

    if (rawEvents.length >= 2) {
      let currentType: 'work' | 'break' = 'work';
      let cursorTime = new Date(rawEvents[0].timestamp).getTime();

      for (let i = 1; i < rawEvents.length; i++) {
        const evt = rawEvents[i];
        const evtTime = new Date(evt.timestamp).getTime();
        const duration = Math.max(0, Math.round((evtTime - cursorTime) / 1000));

        if (duration > 0) {
          result.push({
            id: `seg-${i}`,
            type: currentType,
            seconds: duration,
            pct: shiftSpanSec > 0 ? (duration / shiftSpanSec) * 100 : 0,
            label: `${currentType === 'work' ? 'Working' : 'Break'}: ${formatHoursMinutes(duration).replace(':', 'h ')}m`,
          });
        }

        cursorTime = evtTime;
        if (evt.type === 'break_start') {
          currentType = 'break';
        } else if (evt.type === 'break_end') {
          currentType = 'work';
        } else if (evt.type === 'punch_out') {
          break;
        }
      }

      // Add tail segment from last event to current ticking time
      const hasPunchedOut = rawEvents.some((e) => e.type === 'punch_out');
      if (!hasPunchedOut && cursorTime > 0) {
        const nowMs = Date.now();
        const duration = Math.max(0, Math.round((nowMs - cursorTime) / 1000));
        const tailType: 'work' | 'break' = todayState === 'on_break' ? 'break' : 'work';
        if (duration > 0) {
          result.push({
            id: `seg-tail`,
            type: tailType,
            seconds: duration,
            pct: shiftSpanSec > 0 ? (duration / shiftSpanSec) * 100 : 0,
            label: `${tailType === 'work' ? 'Working' : 'Break'}: ${formatHoursMinutes(duration).replace(':', 'h ')}m`,
          });
        }
      }
    }

    // Fallback if timeline events are not segmented yet but we have worked / break time:
    if (result.length === 0) {
      if (todayBreakSeconds > 0 && todayWorkedSeconds > 0) {
        // Synthesize green -> red -> green
        const part1 = Math.round(todayWorkedSeconds * 0.6);
        const part2 = todayWorkedSeconds - part1;
        result.push({
          id: 'seg-fb-1',
          type: 'work',
          seconds: part1,
          pct: shiftSpanSec > 0 ? (part1 / shiftSpanSec) * 100 : 0,
          label: `Working: ${formatHoursMinutes(part1).replace(':', 'h ')}m`,
        });
        result.push({
          id: 'seg-fb-2',
          type: 'break',
          seconds: todayBreakSeconds,
          pct: shiftSpanSec > 0 ? (todayBreakSeconds / shiftSpanSec) * 100 : 0,
          label: `Break: ${formatHoursMinutes(todayBreakSeconds).replace(':', 'h ')}m`,
        });
        if (part2 > 0) {
          result.push({
            id: 'seg-fb-3',
            type: 'work',
            seconds: part2,
            pct: shiftSpanSec > 0 ? (part2 / shiftSpanSec) * 100 : 0,
            label: `Working: ${formatHoursMinutes(part2).replace(':', 'h ')}m`,
          });
        }
      } else if (todayWorkedSeconds > 0) {
        result.push({
          id: 'seg-fb-work',
          type: 'work',
          seconds: todayWorkedSeconds,
          pct: shiftSpanSec > 0 ? (todayWorkedSeconds / shiftSpanSec) * 100 : 0,
          label: `Working: ${formatHoursMinutes(todayWorkedSeconds).replace(':', 'h ')}m`,
        });
      }
    }

    return result;
  }, [timeline, shiftSpanSec, todayWorkedSeconds, todayBreakSeconds, todayState]);

  const totalUsedPct = timelineSegments.reduce((sum, s) => sum + s.pct, 0);
  const remainingPct = Math.max(0, 100 - totalUsedPct);

  const workingFormatted = formatHoursMinutes(todayWorkedSeconds).replace(':', 'h ') + 'm';
  const breakFormatted = formatHoursMinutes(todayBreakSeconds).replace(':', 'h ') + 'm';
  const goalFormatted = formatHoursMinutes(todayTargetSeconds).replace(':', 'h ') + 'm';

  return (
    <div
      id="current-time-timings-card"
      className="bg-white rounded-xl border border-slate-300 shadow-[0_2px_12px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] transition-all p-5 flex flex-col justify-between h-full"
    >
      <div>
        {/* Header with 16px icon in 32px box */}
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 mb-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Current Time & Shift</h3>
        </div>

        {/* Live Digital Clock with dimmed seconds */}
        <div className="text-center pt-2.5 pb-1">
          <div className="text-[34px] font-extrabold text-slate-900 tracking-tight font-mono leading-tight">
            <span>{displayHours}:{minutes}</span>
            <span className="text-2xl font-semibold text-slate-400">:{seconds}</span>
            <span className="text-base font-bold text-slate-700 ml-1.5">{ampm}</span>
          </div>
          <div className="text-[13px] font-medium text-slate-500 mt-1">
            {formattedDate}
          </div>
        </div>

        {/* Weekly Day Selector (S M T W T F S) with 28px circles */}
        <div className="flex items-center justify-center gap-2 py-3">
          {daysOfWeek.map((day, idx) => {
            const isToday = idx === currentDayIndex;
            return (
              <div
                key={idx}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isToday
                    ? 'bg-blue-600 text-white shadow-2xs scale-105'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title={isToday ? 'Today' : undefined}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Timeline Section placed at bottom with mt-auto */}
      <div className="mt-auto pt-3.5 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[13px] font-bold text-slate-900 tracking-tight">Today&apos;s Shift</h4>
          <span className="text-xs font-semibold text-slate-500 font-mono">{goalFormatted} Goal</span>
        </div>

        {/* 1. Chronological Segmented Shift Timeline Bar: Green (Work) -> Red (Break) -> Green (Work) -> Gray (Remaining) */}
        <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden p-0.5 gap-0.5">
          {timelineSegments.map((seg) => (
            <div
              key={seg.id}
              className={`h-full rounded-full transition-all duration-500 ${
                seg.type === 'work' ? 'bg-emerald-500' : 'bg-rose-500 shrink-0'
              }`}
              style={{
                width: `${seg.pct}%`,
                minWidth: seg.type === 'break' ? '4px' : undefined,
              }}
              title={seg.label}
            />
          ))}
          {remainingPct > 0 && (
            <div
              className="h-full bg-slate-200/80 rounded-full transition-all duration-500 flex-1"
              style={{ width: `${remainingPct}%` }}
              title={`Remaining: ${formatHoursMinutes(Math.max(0, todayTargetSeconds - todayWorkedSeconds)).replace(':', 'h ')}m`}
            />
          )}
        </div>

        {/* 2. Legend with values left-aligned directly beneath */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-slate-600 mt-2.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-500">Working</span>
            <span className="font-bold text-slate-800 font-mono">{workingFormatted}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span className="text-slate-500">Break</span>
            <span className="font-bold text-slate-800 font-mono">{breakFormatted}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <span className="text-slate-500">Remaining</span>
            <span className="font-bold text-slate-800 font-mono">
              {formatHoursMinutes(Math.max(0, todayTargetSeconds - todayWorkedSeconds)).replace(':', 'h ') + 'm'}
            </span>
          </span>
        </div>

        {/* 3. Small row for shift range and goal */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100">
          <span>
            Shift Window: <span className="font-mono text-slate-800 font-semibold">{shiftStart} - {shiftEnd}</span>
          </span>
          <span>
            Daily Target: <span className="font-mono text-slate-800 font-semibold">{goalFormatted}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
