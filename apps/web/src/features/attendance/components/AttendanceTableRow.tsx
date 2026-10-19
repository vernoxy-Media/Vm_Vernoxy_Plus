import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { DayRecord } from '../types/attendance.types';
import { DayStatusBadge } from './DayStatusBadge';
import { formatHoursMinutes } from './TickingWorkedTimer';

export interface AttendanceTableRowProps {
  row: DayRecord;
  idx: number;
  onSelectCorrectionDate: (date: string) => void;
}

export const AttendanceTableRow: React.FC<AttendanceTableRowProps> = ({
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
    year: 'numeric',
  });

  return (
    <tr
      id={`attendance-row-${row.date}`}
      className={`transition-colors h-[64px] ${
        isToday
          ? 'bg-blue-50/70 font-semibold border-l-4 border-l-blue-600'
          : 'hover:bg-slate-50/70'
      }`}
    >
      <td className="py-3.5 px-4 text-slate-500 text-xs">{idx + 1}</td>
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <span>{displayDate}</span>
          <span className="text-xs font-semibold text-slate-400">({row.day_of_week})</span>
          {isToday && (
            <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.2 rounded-md">
              Today
            </span>
          )}
        </div>
        {row.holiday_name && (
          <span className="text-xs text-emerald-700 block font-normal">{row.holiday_name}</span>
        )}
        {row.leave_type && (
          <span className="text-xs text-violet-700 block font-normal">{row.leave_type}</span>
        )}
      </td>
      <td className="py-3.5 px-4 font-medium text-slate-700">{row.punch_in || '—'}</td>
      <td className="py-3.5 px-4 font-medium text-slate-700">
        {row.punch_out || (isToday ? 'Working...' : '—')}
      </td>
      <td className="py-3.5 px-4 font-semibold text-slate-900">{prodFormatted}</td>
      <td className="py-3.5 px-4 text-slate-600">{brkFormatted}</td>
      <td className="py-3.5 px-4">
        <DayStatusBadge status={row.status} label={row.status_label} />
      </td>
      <td className="py-3.5 px-4 text-right">
        {row.can_request_correction && (
          <button
            type="button"
            onClick={() => onSelectCorrectionDate(row.date)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Correct</span>
          </button>
        )}
      </td>
    </tr>
  );
};
