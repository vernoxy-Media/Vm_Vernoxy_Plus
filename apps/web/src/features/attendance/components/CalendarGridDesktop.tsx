import React from 'react';
import type { DayRecord } from '../types/attendance.types';
import { CalendarDayCell } from './CalendarDayCell';

export interface CalendarGridDesktopProps {
  weekdayHeaders: string[];
  weekdayOffset: number;
  daysInMonth: number;
  recordsMap: Map<string, DayRecord>;
  focusedDayIndex: number;
  onSelectDate: (date: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, dayIndex: number, dateStr: string) => void;
  year: number;
  month: number;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export const CalendarGridDesktop: React.FC<CalendarGridDesktopProps> = ({
  weekdayHeaders,
  weekdayOffset,
  daysInMonth,
  recordsMap,
  focusedDayIndex,
  onSelectDate,
  handleKeyDown,
  year,
  month,
  gridRef,
}) => {
  return (
    <div id="desktop-calendar-grid" className="hidden md:block mt-4" ref={gridRef as React.RefObject<HTMLDivElement>}>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekdayHeaders.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50 rounded-xl"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: weekdayOffset }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="min-h-[100px] rounded-xl bg-slate-50/40 border border-dashed border-slate-200/60"
            aria-hidden="true"
          />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const record = recordsMap.get(dateStr);
          const isToday = Boolean(record?.is_today);
          const isMuted = record?.status === 'weekly_off' || record?.status === 'holiday';
          const isFocused = focusedDayIndex === dayNum;

          return (
            <CalendarDayCell
              key={dateStr}
              dayNum={dayNum}
              dateStr={dateStr}
              record={record}
              isToday={isToday}
              isMuted={isMuted}
              isFocused={isFocused}
              onSelectDate={onSelectDate}
              onKeyDown={handleKeyDown}
              year={year}
              month={month}
            />
          );
        })}
      </div>
    </div>
  );
};
