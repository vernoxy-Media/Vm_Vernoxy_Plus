import React from 'react';
import type { DayRecord } from '../types/attendance.types';
import { DayStatusBadge } from './DayStatusBadge';
import { formatHoursMinutes } from './TickingWorkedTimer';

export interface CalendarMobileDayItemProps {
  dayNum: number;
  dateStr: string;
  record?: DayRecord;
  isToday: boolean;
  isMuted: boolean;
  weekdayShort: string;
  onSelectDate: (date: string) => void;
}

export const CalendarMobileDayItem: React.FC<CalendarMobileDayItemProps> = ({
  dayNum,
  dateStr,
  record,
  isToday,
  isMuted,
  weekdayShort,
  onSelectDate,
}) => {
  const prodFormatted =
    record && record.production_seconds > 0
      ? `${formatHoursMinutes(record.production_seconds)} hrs`
      : '—';

  return (
    <button
      type="button"
      onClick={() => onSelectDate(dateStr)}
      className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all ${
        isToday
          ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
          : isMuted
          ? 'border-slate-200 bg-slate-50/60 opacity-85'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center justify-center text-xs font-bold ${
            isToday
              ? 'w-7 h-7 rounded-full bg-blue-600 text-white'
              : 'w-7 h-7 rounded-lg bg-slate-100 text-slate-700'
          }`}
        >
          {dayNum}
        </span>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              {weekdayShort}, {dateStr}
            </span>
            {isToday && (
              <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
                Today
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Production: {prodFormatted}
          </span>
        </div>
      </div>

      <div>
        {record ? (
          <DayStatusBadge status={record.status} label={record.status_label} size="sm" />
        ) : (
          <span className="text-xs text-slate-400 italic">No record</span>
        )}
      </div>
    </button>
  );
};
