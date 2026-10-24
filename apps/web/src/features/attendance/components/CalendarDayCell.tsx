import React from 'react';
import type { DayRecord } from '../types/attendance.types';

export interface CalendarDayCellProps {
  dayNum: number;
  dateStr: string;
  record?: DayRecord;
  isToday: boolean;
  isMuted: boolean;
  isFocused: boolean;
  onSelectDate: (date: string) => void;
  onKeyDown: (e: React.KeyboardEvent, dayNum: number, dateStr: string) => void;
  year: number;
  month: number;
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  dayNum,
  dateStr,
  record,
  isToday,
  isMuted,
  isFocused,
  onSelectDate,
  onKeyDown,
  year,
  month,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isFuture = dateStr > todayStr;

  const isCheckedIn = Boolean(isToday && record?.punch_in && !record?.punch_out);

  const isLate = Boolean(
    (record as any)?.is_late ||
    (record?.punch_in && (() => {
      const m = record.punch_in.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!m) return false;
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const ampm = m[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + min > 580; // After 09:40 AM
    })())
  );

  const isMissingPunch = !isToday && Boolean(
    record?.status === 'incomplete' ||
    (record?.punch_in && !record?.punch_out)
  );

  // Future dates are blank and cannot be opened
  if (isFuture) {
    return (
      <div
        className="min-h-[100px] p-2 rounded-xl border border-slate-200/60 bg-slate-50/20 text-left flex flex-col justify-between cursor-default select-none opacity-60"
        aria-hidden="true"
      >
        <span className="text-xs font-semibold text-slate-400">{dayNum}</span>
      </div>
    );
  }

  const cellDateObj = new Date(year, month - 1, dayNum);
  const dateReadable = cellDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const statusReadable = record?.status_label || (isMuted ? 'Weekly Off' : 'No record');
  const ariaLabel = `${dateReadable}: ${statusReadable}`;

  return (
    <div
      role="button"
      tabIndex={isFocused || dayNum === 1 ? 0 : -1}
      data-day-index={dayNum}
      aria-label={ariaLabel}
      onClick={() => onSelectDate(dateStr)}
      onKeyDown={(e) => onKeyDown(e, dayNum, dateStr)}
      className={`min-h-[100px] p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer outline-none focus:ring-2 focus:ring-blue-600 focus:z-10 ${
        isCheckedIn
          ? 'border-2 border-slate-800 bg-white ring-2 ring-slate-800/20 shadow-xs'
          : isToday
          ? 'border-blue-500 ring-2 ring-blue-500/25 bg-blue-50/20 shadow-2xs'
          : isMuted
          ? 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
          : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${isToday ? 'text-blue-600 font-extrabold' : 'text-slate-800'}`}>
          {dayNum}
        </span>
      </div>

      <div className="mt-1 flex flex-col justify-end min-h-[36px]">
        {isCheckedIn ? (
          <div className="py-1 px-1.5 border border-slate-700 rounded-md text-center text-[11px] font-semibold text-slate-800 bg-slate-50 shadow-2xs">
            Checked in
          </div>
        ) : isMissingPunch ? (
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-orange-700 text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs">
              MP
            </span>
          </div>
        ) : record?.status === 'holiday' ? (
          <div className="flex flex-col items-start gap-0.5">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
              H
            </span>
            {record.holiday_name && (
              <span className="text-[10px] text-purple-700 font-medium leading-tight truncate max-w-full">
                {record.holiday_name}
              </span>
            )}
          </div>
        ) : record?.status === 'weekly_off' ? (
          <div>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] shadow-2xs">
              WO
            </span>
          </div>
        ) : record?.status === 'absent' ? (
          <div>
            <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
              A
            </span>
          </div>
        ) : record?.status === 'half_day' ? (
          <div>
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs">
              HD
            </span>
          </div>
        ) : record?.status === 'leave' ? (
          <div>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
              L
            </span>
          </div>
        ) : record?.status === 'present' || record?.punch_in ? (
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
              P
            </span>
            {isLate && (
              <span className="text-amber-600 font-extrabold text-[11px] tracking-tight">
                LM
              </span>
            )}
          </div>
        ) : (
          <div>
            <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
              A
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
