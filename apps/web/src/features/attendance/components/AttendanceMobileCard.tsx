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

  return (
    <div
      id={`attendance-mobile-card-${row.date}`}
      className={`p-4 rounded-xl border transition-all ${
        isToday
          ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
          <span className="text-sm font-bold text-slate-900">
            {row.date} ({row.day_of_week})
          </span>
          {isToday && (
            <span className="text-[11px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
              Today
            </span>
          )}
        </div>
        <DayStatusBadge status={row.status} label={row.status_label} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs py-2">
        <div>
          <span className="text-slate-400 block">Punch In</span>
          <span className="font-semibold text-slate-800">{row.punch_in || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400 block">Punch Out</span>
          <span className="font-semibold text-slate-800">
            {row.punch_out || (isToday ? 'Working...' : '—')}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Production</span>
          <span className="font-bold text-slate-900">{prodFormatted}</span>
        </div>
        <div>
          <span className="text-slate-400 block">Break</span>
          <span className="font-medium text-slate-600">{brkFormatted}</span>
        </div>
      </div>

      {row.can_request_correction && (
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => onSelectCorrectionDate(row.date)}
            className="px-3 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100"
          >
            Request correction
          </button>
        </div>
      )}
    </div>
  );
};
