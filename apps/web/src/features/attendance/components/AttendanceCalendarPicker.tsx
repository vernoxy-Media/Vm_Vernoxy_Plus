import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import type { DayRecord } from '../types/attendance.types';

export interface AttendanceCalendarPickerProps {
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (date: string) => void;
  records?: DayRecord[];
  maxDate?: string; // Optional maximum date (defaults to today)
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const AttendanceCalendarPicker: React.FC<AttendanceCalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  records = [],
  maxDate = new Date().toISOString().slice(0, 10),
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isSelectedToday = selectedDate === todayStr;

  // View state for the calendar popover (year and month 1..12)
  const [selectedY, selectedM, selectedD] = selectedDate.split('-').map(Number);
  const [viewYear, setViewYear] = useState<number>(selectedY || 2026);
  const [viewMonth, setViewMonth] = useState<number>(selectedM || 10); // 1-indexed

  // Keep popover view in sync with selectedDate
  useEffect(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m);
    }
  }, [selectedDate]);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format current selected date for display
  const selectedDateObj = new Date(selectedY, selectedM - 1, selectedD);
  const formattedDisplay = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Navigation handlers for next/prev day
  const handlePrevDay = () => {
    const d = new Date(selectedY, selectedM - 1, selectedD - 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    const newD = String(d.getDate()).padStart(2, '0');
    onSelectDate(`${newY}-${newM}-${newD}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedY, selectedM - 1, selectedD + 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    const newD = String(d.getDate()).padStart(2, '0');
    const nextDateStr = `${newY}-${newM}-${newD}`;
    if (maxDate && nextDateStr > maxDate) return;
    onSelectDate(nextDateStr);
  };

  const handleJumpToToday = () => {
    onSelectDate(todayStr);
    setIsOpen(false);
  };

  // Calendar popover month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const maxYear = parseInt(maxDate.slice(0, 4), 10);
    const maxMonth = parseInt(maxDate.slice(5, 7), 10);
    if (viewYear > maxYear || (viewYear === maxYear && viewMonth >= maxMonth)) {
      return;
    }
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Days in month calculation
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayDow = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 is Sun, 1 is Mon
  const startingOffset = (firstDayDow + 6) % 7; // Monday = 0, Sunday = 6

  // Years for dropdown (from 2024 to maxYear)
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  // Records lookup for dots
  const recordMap = new Map<string, DayRecord>();
  records.forEach((r) => recordMap.set(r.date, r));

  const handleDayClick = (day: number) => {
    const mStr = String(viewMonth).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const fullDate = `${viewYear}-${mStr}-${dStr}`;
    if (maxDate && fullDate > maxDate) return;
    onSelectDate(fullDate);
    setIsOpen(false);
  };

  const handleNativeDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onSelectDate(e.target.value);
      setIsOpen(false);
    }
  };

  const canGoNextDay = !maxDate || selectedDate < maxDate;

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1.5 sm:gap-2">
      {/* Container Bar */}
      <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs hover:border-slate-400 transition-colors">
        {/* Prev Day Button */}
        <button
          type="button"
          id="calendar-prev-day-btn"
          onClick={handlePrevDay}
          title="Previous day"
          aria-label="Previous day"
          className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none"
        >
          <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Center Date Display & Dropdown Trigger */}
        <button
          type="button"
          id="calendar-open-popover-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isOpen
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-800 hover:bg-slate-50'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-bold tracking-tight select-none text-xs">
            {formattedDisplay}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-slate-400 transition-transform ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>

        {/* Next Day Button */}
        <button
          type="button"
          id="calendar-next-day-btn"
          onClick={handleNextDay}
          disabled={!canGoNextDay}
          title={canGoNextDay ? 'Next day' : 'Cannot view future dates'}
          aria-label="Next day"
          className={`p-2 sm:p-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            canGoNextDay
              ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-300 cursor-not-allowed opacity-50'
          }`}
        >
          <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
      </div>

      {/* Return to Today Pill if another date is selected */}
      {!isSelectedToday && (
        <button
          type="button"
          id="calendar-jump-today-btn"
          onClick={handleJumpToToday}
          title="Return to today"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all shadow-2xs hover:shadow-xs active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Today</span>
        </button>
      )}

      {/* Calendar Interactive Popover */}
      {isOpen && (
        <div
          id="calendar-dropdown-popover"
          className="absolute right-0 top-full mt-2 z-50 w-[320px] sm:w-[340px] bg-white rounded-2xl border border-slate-300 shadow-xl p-4 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Popover Header: Month & Year Selectors + Nav */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous month"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Select */}
              <select
                id="calendar-select-month"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Select */}
              <select
                id="calendar-select-year"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next month"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEK_DAYS.map((day) => (
              <span key={day} className="text-[11px] font-bold text-slate-400 uppercase py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Blank leading days */}
            {Array.from({ length: startingOffset }).map((_, i) => (
              <div key={`blank-${i}`} className="h-9 w-full" />
            ))}

            {/* Days in month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayStr;
              const isFuture = maxDate ? dateKey > maxDate : false;
              const record = recordMap.get(dateKey);

              // Status dot indicator
              let dotColor = '';
              if (record) {
                if (record.punch_in) {
                  dotColor = 'bg-emerald-500';
                } else if (record.status === 'holiday') {
                  dotColor = 'bg-rose-500';
                } else if (record.status === 'weekly_off') {
                  dotColor = 'bg-slate-300';
                } else if (record.leave_type) {
                  dotColor = 'bg-amber-500';
                } else if (dateKey <= todayStr) {
                  dotColor = 'bg-rose-400'; // absent
                }
              }

              return (
                <button
                  key={dateKey}
                  type="button"
                  disabled={isFuture}
                  onClick={() => handleDayClick(day)}
                  className={`h-9 w-full rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition-all ${
                    isFuture
                      ? 'text-slate-300 cursor-not-allowed'
                      : isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs scale-105 z-10'
                      : isToday
                      ? 'border border-blue-500 text-blue-600 font-bold hover:bg-blue-50'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{day}</span>
                  {dotColor && (
                    <span
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : dotColor
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Popover Footer: Jump to Today + Native Input */}
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleJumpToToday}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              <span>Jump to Today</span>
            </button>

            <div className="relative">
              <span className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
                Pick Exact Date ▾
              </span>
              <input
                type="date"
                value={selectedDate}
                max={maxDate}
                onChange={handleNativeDateInput}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Select date"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
