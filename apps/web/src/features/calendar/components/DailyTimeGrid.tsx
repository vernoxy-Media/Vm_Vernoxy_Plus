import React, { useEffect, useRef, useState } from 'react';
import { Video, Check, Send, Clock, ExternalLink } from 'lucide-react';
import type { CalendarEvent } from '../types';
import { formatLocalDate, classifyCalendarDay, AttendanceDayRecordInfo } from '../date-utils';

interface DailyTimeGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  attendanceRecords?: Record<string, AttendanceDayRecordInfo>;
  holidays?: Array<{ date: string; name: string }>;
  workingDays?: number[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
}

const START_HOUR = 0; // 12:00 AM
const END_HOUR = 23; // 11:00 PM
const ROW_HEIGHT = 64; // px per hour

export const DailyTimeGrid: React.FC<DailyTimeGridProps> = ({
  currentDate,
  events,
  attendanceRecords = {},
  holidays = [],
  workingDays = [1, 2, 3, 4, 5],
  onSelectEvent,
  onSlotClick,
}) => {
  const [now, setNow] = useState(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to 8 AM or current hour on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const targetHour = Math.max(7, Math.min(now.getHours() - 1, 18));
      scrollContainerRef.current.scrollTop = targetHour * ROW_HEIGHT;
    }
  }, []);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12;
    return `${displayHour} ${period}`;
  };

  const dateStr = formatLocalDate(currentDate);
  const record = attendanceRecords[dateStr];
  const classification = classifyCalendarDay(currentDate, record, holidays, workingDays);
  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dayNumber = currentDate.getDate();

  // Current time line
  const isToday = classification.type === 'today';
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeTop = (currentHour + currentMinutes / 60) * ROW_HEIGHT;

  // Filter events for this specific day: meetings or submitted/approved tasks only
  const dayEvents = events.filter((ev) => {
    const evDate = formatLocalDate(new Date(ev.start_time));
    if (evDate !== dateStr) return false;
    if (ev.event_type === 'task_block') {
      return ev.task_stage === 'requested' || ev.task_stage === 'completed';
    }
    return true;
  });

  return (
    <div className="flex flex-col flex-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden select-none">
      {/* Day View Header */}
      <div className="grid grid-cols-[72px_1fr] border-b border-slate-200 bg-slate-50/70 sticky top-0 z-20">
        {/* Timezone label */}
        <div className="p-3 text-[11px] font-bold text-slate-400 flex items-center justify-center border-r border-slate-200">
          GMT+5:30
        </div>

        {/* Day Header Column */}
        <div className={`py-3 px-6 flex items-center gap-4 transition-colors ${classification.columnBg}`}>
          <div className="flex flex-col items-center">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${classification.badgeText}`}>
              {dayName}
            </span>
            <div className="mt-1">
              <span
                className={`w-10 h-10 flex items-center justify-center rounded-full text-base font-extrabold shadow-xs transition-all ${
                  isToday
                    ? 'bg-blue-600 text-white shadow-blue-500/20'
                    : 'bg-slate-200/80 text-slate-800'
                }`}
              >
                {dayNumber}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {classification.type === 'holiday' && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 shadow-2xs"
                title={classification.holidayName || 'Holiday'}
              >
                {classification.holidayName || 'Holiday'}
              </span>
            )}
            {classification.type === 'complete' && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 shadow-2xs">
                <Check className="w-3.5 h-3.5" /> Done
              </span>
            )}
            {classification.type === 'leave' && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 shadow-2xs">
                {classification.label}
              </span>
            )}
            {classification.type === 'absent' && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 shadow-2xs">
                Absent
              </span>
            )}
            {classification.type === 'today' && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 shadow-2xs">
                Today
              </span>
            )}
            {classification.type === 'upcoming' && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 shadow-2xs">
                Upcoming
              </span>
            )}
            {classification.type === 'weekoff' && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">
                Week Off
              </span>
            )}

            {/* Event Count pill */}
            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs">
              {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Content with Sticky Time Axis */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto max-h-[720px] relative">
        <div
          className="grid grid-cols-[72px_1fr] relative"
          style={{ height: `${hours.length * ROW_HEIGHT}px` }}
        >
          {/* Time Axis Column */}
          <div className="border-r border-slate-200 bg-slate-50/40 text-right pr-3 select-none relative">
            {hours.map((hour, idx) => (
              <div
                key={hour}
                style={{ top: `${idx * ROW_HEIGHT - 9}px` }}
                className="absolute right-3 text-[11px] font-bold text-slate-400 tracking-tight"
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Day Content Column */}
          <div className={`relative hover:bg-slate-50/20 transition-colors ${classification.columnBg}`}>
            {/* Horizontal Hour Lines & Clickable Slots */}
            {hours.map((hour, hIdx) => (
              <div
                key={hour}
                style={{
                  top: `${hIdx * ROW_HEIGHT}px`,
                  height: `${ROW_HEIGHT}px`,
                }}
                onClick={() => {
                  const hourStr = hour.toString().padStart(2, '0');
                  onSlotClick(dateStr, `${hourStr}:00`);
                }}
                className="absolute inset-x-0 border-b border-slate-100 hover:bg-blue-50/25 cursor-pointer transition-colors group"
                title={`Click to schedule at ${formatHour(hour)}`}
              >
                {/* Subtle half-hour dashed line */}
                <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-100 pointer-events-none" />
              </div>
            ))}

            {/* Google Calendar-Style Current Time Red Indicator Line */}
            {isToday && (
              <div
                style={{ top: `${currentTimeTop}px` }}
                className="absolute inset-x-0 z-30 flex items-center pointer-events-none"
              >
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm -ml-1.5 ring-2 ring-white" />
                <div className="flex-1 h-[2px] bg-red-500 shadow-xs" />
              </div>
            )}

            {/* Day Events with Google Calendar Side-by-Side Overlap Layout */}
            {(() => {
              if (dayEvents.length === 0) return null;

              const parsed = dayEvents.map((ev) => {
                const evStart = new Date(ev.start_time);
                const evEnd = new Date(ev.end_time);
                const startDecimal = evStart.getHours() + evStart.getMinutes() / 60;
                const endDecimal = evEnd.getHours() + evEnd.getMinutes() / 60;
                const clampedStart = Math.max(0, startDecimal);
                const clampedEnd = Math.min(24, Math.max(clampedStart + 0.5, endDecimal));
                const top = clampedStart * ROW_HEIGHT;
                const height = Math.max(34, (clampedEnd - clampedStart) * ROW_HEIGHT - 3);

                return {
                  ev,
                  evStart,
                  evEnd,
                  start: clampedStart,
                  end: clampedEnd,
                  top,
                  height,
                  colIndex: 0,
                  colCount: 1,
                };
              });

              parsed.sort((a, b) => {
                if (a.start !== b.start) return a.start - b.start;
                return (b.end - b.start) - (a.end - a.start);
              });

              const groups: (typeof parsed)[] = [];
              let curGroup: typeof parsed = [];
              let curGroupEnd = -1;

              for (const item of parsed) {
                if (curGroup.length === 0 || item.start < curGroupEnd) {
                  curGroup.push(item);
                  curGroupEnd = Math.max(curGroupEnd, item.end);
                } else {
                  groups.push(curGroup);
                  curGroup = [item];
                  curGroupEnd = item.end;
                }
              }
              if (curGroup.length > 0) groups.push(curGroup);

              for (const group of groups) {
                const columnEnds: number[] = [];
                for (const item of group) {
                  let placedCol = -1;
                  for (let c = 0; c < columnEnds.length; c++) {
                    if (columnEnds[c] <= item.start) {
                      placedCol = c;
                      columnEnds[c] = item.end;
                      break;
                    }
                  }
                  if (placedCol === -1) {
                    placedCol = columnEnds.length;
                    columnEnds.push(item.end);
                  }
                  item.colIndex = placedCol;
                }
                const maxCols = columnEnds.length;
                for (const item of group) {
                  item.colCount = maxCols;
                }
              }

              return parsed.map((item) => {
                const { ev, evStart, evEnd, top, height, colIndex, colCount } = item;
                const isTask = ev.event_type === 'task_block';
                const isSubmitted = isTask && ev.task_stage === 'requested';
                const isApproved = isTask && (ev.task_stage === 'completed' || ev.status === 'completed');
                const isMeeting = ev.event_type === 'meeting';
                const isPast = new Date(ev.end_time) < now;

                let cardStyle =
                  'bg-blue-50/95 border-blue-200 text-blue-900 border-l-4 border-l-blue-600 hover:bg-blue-100/90';
                if (isSubmitted) {
                  cardStyle =
                    'bg-amber-50/95 border-amber-300 text-amber-950 border-l-4 border-l-amber-500 hover:bg-amber-100/90';
                } else if (isApproved) {
                  cardStyle =
                    'bg-emerald-50/95 border-emerald-300 text-emerald-950 border-l-4 border-l-emerald-600 hover:bg-emerald-100/90';
                }

                const timeLabel = `${evStart.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })} - ${evEnd.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}`;

                const widthPercent = 100 / colCount;
                const leftPercent = colIndex * widthPercent;

                return (
                  <div
                    key={ev.event_id}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `calc(${leftPercent}% + 4px)`,
                      width: `calc(${widthPercent}% - 8px)`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    className={`absolute z-10 p-2.5 rounded-xl border text-xs shadow-xs cursor-pointer transition-all duration-150 overflow-hidden flex flex-col justify-between ${cardStyle}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5 overflow-hidden">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isTask ? (
                            isSubmitted ? (
                              <Send className="w-4 h-4 shrink-0 text-amber-600" />
                            ) : (
                              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                            )
                          ) : (
                            <Video className="w-4 h-4 shrink-0 text-blue-600" />
                          )}
                          <span className="font-bold truncate text-xs leading-snug">
                            {ev.title}
                          </span>
                        </div>
                        {isMeeting && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              isPast ? 'bg-slate-200/80 text-slate-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isPast ? 'Attended' : 'Scheduled'}
                          </span>
                        )}
                        {isTask && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              isSubmitted
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isSubmitted ? 'Submitted' : 'Approved'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-80 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{timeLabel}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      {ev.meeting_link ? (
                        <a
                          href={ev.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-white/80 hover:bg-white px-2 py-0.5 rounded-md border border-blue-200 transition-colors"
                        >
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Join Meet</span>
                          <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      ) : (
                        <div />
                      )}
                      {ev.task_code && (
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            isSubmitted
                              ? 'text-amber-800 bg-amber-100/90'
                              : 'text-emerald-800 bg-emerald-100/90'
                          }`}
                        >
                          {ev.task_code}
                        </span>
                      )}
                      {ev.attendees && ev.attendees.length > 0 && !ev.task_code && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-white/70 px-2 py-0.5 rounded-md">
                          {ev.attendees.length} attendee{ev.attendees.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
