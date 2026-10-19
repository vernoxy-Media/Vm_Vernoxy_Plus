import React from 'react';
import type { DayRecord } from '../types/attendance.types';
import { DayStatusBadge } from './DayStatusBadge';

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
  const prodHours =
    record && record.production_seconds > 0
      ? `${Math.floor(record.production_seconds / 3600)}h ${Math.floor((record.production_seconds % 3600) / 60)}m`
      : '—';
  const breakMins =
    record && record.break_seconds > 0
      ? `${Math.floor(record.break_seconds / 60)} minutes`
      : '0 minutes';

  const cellDateObj = new Date(year, month - 1, dayNum);
  const dateReadable = cellDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const statusReadable = record?.status_label || (isMuted ? 'Off' : 'No record');
  const ariaLabel = `${dateReadable}: ${statusReadable}, production ${prodHours}, break ${breakMins}`;

  return (
    <div
      role="button"
      tabIndex={isFocused || dayNum === 1 ? 0 : -1}
      data-day-index={dayNum}
      aria-label={ariaLabel}
      onClick={() => onSelectDate(dateStr)}
      onKeyDown={(e) => onKeyDown(e, dayNum, dateStr)}
      className={`min-h-[110px] p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer outline-none focus:ring-2 focus:ring-blue-600 focus:z-10 ${
        isToday
          ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/30'
          : isMuted
          ? 'border-slate-200 bg-slate-50/70 opacity-80 hover:opacity-100 hover:border-slate-300'
          : 'border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-xs'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center justify-center text-xs font-black ${
            isToday
              ? 'w-6 h-6 rounded-full bg-blue-600 text-white shadow-xs'
              : 'text-slate-800'
          }`}
        >
          {dayNum}
        </span>
        {record && (
          <span className="text-[11px] font-bold text-slate-500 truncate max-w-[80px]">
            {prodHours}
          </span>
        )}
      </div>

      <div className="mt-1 space-y-1">
        {record ? (
          <DayStatusBadge
            status={record.status}
            label={record.status === 'holiday' && record.holiday_name ? record.holiday_name : record.status_label}
            size="sm"
          />
        ) : (
          <span className="text-[11px] text-slate-400 italic">No record</span>
        )}
      </div>
    </div>
  );
};
