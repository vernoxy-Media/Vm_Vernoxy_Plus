import React, { useEffect, useState } from 'react';
import { Video, Check, Send } from 'lucide-react';
import type { CalendarEvent } from '../types';
import { formatLocalDate, classifyCalendarDay, AttendanceDayRecordInfo } from '../date-utils';

interface WeeklyTimeGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  attendanceRecords?: Record<string, AttendanceDayRecordInfo>;
  holidays?: Array<{ date: string; name: string }>;
  workingDays?: number[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSlotClick: (dateStr: string, timeStr: string) => void;
  onDayClick?: (date: Date) => void;
}

const START_HOUR = 8; // 8:00 AM
const END_HOUR = 22; // 10:00 PM
const ROW_HEIGHT = 64; // px per hour

export const WeeklyTimeGrid: React.FC<WeeklyTimeGridProps> = ({
  currentDate,
  events,
  attendanceRecords = {},
  holidays = [],
  workingDays = [1, 2, 3, 4, 5],
  onSelectEvent,
  onSlotClick,
  onDayClick,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000); // update current time line every min
    return () => clearInterval(interval);
  }, []);

  // Compute the 7 days of the current week (Monday start)
  const getWeekDates = (baseDate: Date): Date[] => {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const weekDay = new Date(monday);
      weekDay.setDate(monday.getDate() + i);
      return weekDay;
    });
  };

  const weekDays = getWeekDates(currentDate);
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  // Format hour for display (e.g. 8 AM, 12 PM, 5 PM)
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${period}`;
  };

  // Calculate current time line offset
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const showCurrentTimeLine = currentHour >= START_HOUR && currentHour <= END_HOUR;
  const currentTimeTop =
    showCurrentTimeLine
      ? (currentHour - START_HOUR + currentMinutes / 60) * ROW_HEIGHT
      : null;

  return (
    <div className="flex flex-col flex-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden select-none">
      {/* Week Header Row */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/60 sticky top-0 z-20">
        <div className="p-3 text-[11px] font-bold text-slate-400 flex items-center justify-center border-r border-slate-200">
          GMT+5:30
        </div>
        {weekDays.map((day, idx) => {
          const dateStr = formatLocalDate(day);
          const record = attendanceRecords[dateStr];
          const classification = classifyCalendarDay(day, record, holidays, workingDays);
          const dayName = day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
          const dayNumber = day.getDate();

          return (
            <div
              key={idx}
              onClick={() => onDayClick?.(day)}
              className={`py-2 px-1 text-center border-r border-slate-200 last:border-r-0 transition-colors ${
                onDayClick ? 'cursor-pointer hover:bg-slate-100/70' : ''
              } ${classification.headerBorder} ${classification.columnBg}`}
              title={onDayClick ? `Switch to ${dayName} ${dayNumber} Day view` : undefined}
            >
              <p className={`text-[10px] font-bold uppercase tracking-wider ${classification.badgeText}`}>
                {dayName}
              </p>
              <div className="mt-1 flex justify-center">
                <span
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold transition-all ${classification.badgeBg}`}
                >
                  {dayNumber}
                </span>
              </div>
              {/* Status pill badge */}
              <div className="mt-1 flex justify-center">
                {classification.type === 'holiday' && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 max-w-[85px] truncate shadow-2xs"
                    title={classification.holidayName || 'Holiday'}
                  >
                    {classification.holidayName || 'Holiday'}
                  </span>
                )}
                {classification.type === 'complete' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-0.5 shadow-2xs">
                    <Check className="w-2.5 h-2.5" /> Done
                  </span>
                )}
                {classification.type === 'leave' && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 max-w-[85px] truncate shadow-2xs"
                    title={classification.label}
                  >
                    {classification.label}
                  </span>
                )}
                {classification.type === 'absent' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 shadow-2xs">
                    Absent
                  </span>
                )}
                {classification.type === 'today' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 shadow-2xs">
                    Today
                  </span>
                )}
                {classification.type === 'upcoming' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shadow-2xs">
                    Upcoming
                  </span>
                )}
                {classification.type === 'weekoff' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
                    Week Off
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Content with Sticky Time Axis */}
      <div className="flex-1 overflow-y-auto max-h-[720px] relative">
        <div className="grid grid-cols-[64px_repeat(7,1fr)] relative" style={{ height: `${hours.length * ROW_HEIGHT}px` }}>
          {/* Time Column */}
          <div className="border-r border-slate-200 bg-slate-50/30 text-right pr-2 select-none relative">
            {hours.map((hour, idx) => (
              <div
                key={hour}
                style={{ top: `${idx * ROW_HEIGHT - 9}px` }}
                className="absolute right-2 text-[10px] font-bold text-slate-400 tracking-tight"
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* 7 Day Columns */}
          {weekDays.map((dayDate, dayIdx) => {
            const dateStr = formatLocalDate(dayDate);
            const record = attendanceRecords[dateStr];
            const classification = classifyCalendarDay(dayDate, record, holidays, workingDays);

            // Filter events for this specific day: meetings or submitted/approved tasks
            const dayEvents = events.filter((ev) => {
              const evDate = formatLocalDate(new Date(ev.start_time));
              if (evDate !== dateStr) return false;
              if (ev.event_type === 'task_block') {
                return ev.task_stage === 'requested' || ev.task_stage === 'completed';
              }
              return true;
            });


            return (
              <div
                key={dayIdx}
                className={`relative border-r border-slate-200 last:border-r-0 hover:bg-slate-50/30 transition-colors ${classification.columnBg}`}
              >
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
                    className="absolute inset-x-0 border-b border-slate-100/80 hover:bg-blue-50/20 cursor-pointer transition-colors group"
                    title={`Click to schedule at ${formatHour(hour)}`}
                  >
                    {/* Subtle half-hour dashed line */}
                    <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-100 pointer-events-none" />
                  </div>
                ))}

                {/* Live Current Time Blue Line on Today's Column */}
                {classification.type === 'today' && currentTimeTop !== null && (
                  <div
                    style={{ top: `${currentTimeTop}px` }}
                    className="absolute inset-x-0 z-30 flex items-center pointer-events-none"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs -ml-1.5 animate-pulse" />
                    <div className="flex-1 h-[2px] bg-blue-600 shadow-xs" />
                  </div>
                )}

                {/* Day Events with Google Calendar-style side-by-side layout */}
                {(() => {
                  if (dayEvents.length === 0) return null;

                  const parsed = dayEvents.map((ev) => {
                    const evStart = new Date(ev.start_time);
                    const evEnd = new Date(ev.end_time);
                    const startDecimal = evStart.getHours() + evStart.getMinutes() / 60;
                    const endDecimal = evEnd.getHours() + evEnd.getMinutes() / 60;
                    const clampedStart = Math.max(START_HOUR, startDecimal);
                    const clampedEnd = Math.min(END_HOUR + 1, Math.max(clampedStart + 0.5, endDecimal));
                    const top = (clampedStart - START_HOUR) * ROW_HEIGHT;
                    const height = Math.max(28, (clampedEnd - clampedStart) * ROW_HEIGHT - 3);

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
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={`absolute z-10 p-2 rounded-xl border text-xs shadow-xs cursor-pointer transition-all duration-150 overflow-hidden flex flex-col justify-between ${cardStyle}`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {isTask ? (
                              isSubmitted ? (
                                <Send className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                              ) : (
                                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                              )
                            ) : (
                              <Video className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                            )}
                            <span className="font-bold truncate text-[11px] leading-tight">
                              {ev.title}
                            </span>
                          </div>
                          <p className="text-[10px] opacity-75 font-medium truncate">
                            {timeLabel}
                          </p>
                        </div>


                        {ev.meeting_link && height >= 48 && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-700">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Meet ready</span>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
