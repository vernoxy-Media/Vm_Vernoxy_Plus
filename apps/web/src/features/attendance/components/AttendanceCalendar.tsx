import React, { useState, useRef, useEffect } from 'react';
import type { DayRecord } from '../types/attendance.types';
import { useWeekStart } from '../hooks/use-week-start';
import { CalendarLegend } from './CalendarLegend';
import { CalendarGridDesktop } from './CalendarGridDesktop';
import { CalendarMobileList } from './CalendarMobileList';

export interface AttendanceCalendarProps {
  currentMonth: string; // "YYYY-MM"
  records: DayRecord[];
  onSelectDate: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  currentMonth,
  records,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
}) => {
  const [weekStart] = useWeekStart();
  const [focusedDayIndex, setFocusedDayIndex] = useState<number>(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const [yearStr, monthStr] = currentMonth.split('-');
  const year = parseInt(yearStr || '2026', 10);
  const month = parseInt(monthStr || '10', 10);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonthDate = new Date(year, month - 1, 1);
  const firstDayWeekday = firstDayOfMonthDate.getDay();

  const weekdayOffset =
    weekStart === 'monday' ? (firstDayWeekday === 0 ? 6 : firstDayWeekday - 1) : firstDayWeekday;

  const weekdayHeaders =
    weekStart === 'monday'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const recordsMap = new Map<string, DayRecord>();
  records.forEach((r) => recordsMap.set(r.date, r));

  useEffect(() => {
    const activeEl = gridRef.current?.querySelector<HTMLElement>(
      `[data-day-index="${focusedDayIndex}"]`
    );
    activeEl?.focus();
  }, [focusedDayIndex]);

  const handleKeyDown = (e: React.KeyboardEvent, dayIndex: number, dateStr: string) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedDayIndex(Math.max(1, dayIndex - 1));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setFocusedDayIndex(Math.min(daysInMonth, dayIndex + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedDayIndex(Math.max(1, dayIndex - 7));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedDayIndex(Math.min(daysInMonth, dayIndex + 7));
        break;
      case 'Home':
        e.preventDefault();
        setFocusedDayIndex(1);
        break;
      case 'End':
        e.preventDefault();
        setFocusedDayIndex(daysInMonth);
        break;
      case 'PageUp':
        e.preventDefault();
        onPreviousMonth();
        break;
      case 'PageDown':
        e.preventDefault();
        onNextMonth();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelectDate(dateStr);
        break;
    }
  };

  return (
    <div id="attendance-calendar-card" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-blue-600 tracking-tight">Attendance Calendar</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview grid with day statuses, work duration, and roving keyboard navigation.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Week starts on: <span className="font-semibold text-slate-700 capitalize">{weekStart}</span>
        </div>
      </div>

      <CalendarLegend />

      <CalendarGridDesktop
        weekdayHeaders={weekdayHeaders}
        weekdayOffset={weekdayOffset}
        daysInMonth={daysInMonth}
        recordsMap={recordsMap}
        focusedDayIndex={focusedDayIndex}
        onSelectDate={onSelectDate}
        handleKeyDown={handleKeyDown}
        year={year}
        month={month}
        gridRef={gridRef}
      />

      <CalendarMobileList
        daysInMonth={daysInMonth}
        year={year}
        month={month}
        recordsMap={recordsMap}
        onSelectDate={onSelectDate}
      />
    </div>
  );
};
