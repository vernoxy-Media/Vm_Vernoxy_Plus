import React from 'react';
import type { DayRecord } from '../types/attendance.types';
import { DayStatusBadge } from './DayStatusBadge';
import { formatHoursMinutes } from './TickingWorkedTimer';

export interface AttendanceMobileCardProps {
  row: DayRecord;
  idx: number;
  onSelectCorrectionDate: (date: string) => void;
}

export const AttendanceMobileCard: React.FC<AttendanceMobileCardProps> = ({
  row,
  idx,
  onSelectCorrectionDate,
}) => {
  const isToday = Boolean(row.is_today);
  const prodFormatted =
    row.production_seconds > 0 ? `${formatHoursMinutes(row.production_seconds)} hrs` : '—';
  const brkFormatted =
    row.break_seconds > 0 ? `${formatHoursMinutes(row.break_seconds)} hrs` : '—';

  const dateParts = row.date.split('-');
  const dObj = new Date(
    parseInt(dateParts[0] || '2026', 10),
    parseInt(dateParts[1] || '1', 10) - 1,
    parseInt(dateParts[2] || '1', 10)
  );
  const displayDate = dObj.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      id={`attendance-mobile-card-${row.date}`}
      className={`p-4 rounded-xl border transition-all ${
        isToday
          ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
          : 'bg-white border-slate-200/90 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-400">
            #{String(idx + 1).padStart(2, '0')}
          </span>
          <span className="text-sm font-bold text-slate-900">
            {displayDate} <span className="text-slate-400 font-normal">({row.day_of_week})</span>
          </span>
          {isToday && (
            <span className="text-[10px] font-extrabold uppercase bg-blue-600 text-white px-2 py-0.5 rounded-full">
              Today
            </span>
          )}
        </div>
        <DayStatusBadge status={row.status} label={row.status_label} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs py-3">
        <div>
          <span className="text-slate-400 block text-[11px] font-medium">Punch In</span>
          <span className="font-bold text-slate-800 font-mono mt-0.5 block">{row.punch_in || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px] font-medium">Punch Out</span>
          <span className="font-bold text-slate-800 font-mono mt-0.5 block">
            {row.punch_out || (isToday ? 'Working...' : '—')}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px] font-medium">Production</span>
          <span className="font-extrabold text-slate-900 font-mono mt-0.5 block">{prodFormatted}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px] font-medium">Break</span>
          <span className="font-semibold text-slate-600 font-mono mt-0.5 block">{brkFormatted}</span>
        </div>
      </div>

      {row.can_request_correction && (
        <div className="pt-2.5 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => onSelectCorrectionDate(row.date)}
            className="px-3 py-1 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-colors"
          >
            Request Correction
          </button>
        </div>
      )}
    </div>
  );
};

