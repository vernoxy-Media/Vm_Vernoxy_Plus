import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { DayRecord } from '../types/attendance.types';
import { DayStatusBadge } from './DayStatusBadge';
import { formatHoursMinutes } from './TickingWorkedTimer';

export interface AttendanceTableRowProps {
  row: DayRecord;
  idx: number;
  onSelectCorrectionDate: (date: string) => void;
  isSelected?: boolean;
  onSelectRow?: (date: string) => void;
}

export const AttendanceTableRow: React.FC<AttendanceTableRowProps> = ({
  row,
  idx,
  onSelectCorrectionDate,
  isSelected = false,
  onSelectRow,
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
      onClick={() => onSelectRow?.(row.date)}
      className={`transition-colors h-[54px] border-b border-slate-200 cursor-pointer ${
        isSelected
          ? 'bg-blue-100/70 font-semibold border-l-4 border-l-blue-600'
          : isToday
          ? 'bg-blue-50/70 font-semibold border-l-4 border-l-blue-600'
          : idx % 2 === 1
          ? 'bg-slate-50/40 hover:bg-blue-50/40'
          : 'bg-white hover:bg-blue-50/40'
      }`}
    >
      <td className="py-2 px-1 text-center border-r border-slate-200">
        <span className="font-mono text-xs font-semibold text-slate-500">
          {String(idx + 1).padStart(2, '0')}
        </span>
      </td>

      <td className="py-2 px-2.5 whitespace-nowrap border-r border-slate-200">
        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
          <span>{displayDate}</span>
          <span className="text-[11px] font-normal text-slate-400">({row.day_of_week})</span>
          {isToday ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase bg-blue-600 text-white px-1.5 py-0.2 rounded-full">
              Today
            </span>
          ) : isSelected ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase bg-indigo-600 text-white px-1.5 py-0.2 rounded-full">
              Selected
            </span>
          ) : null}
        </div>
        {row.holiday_name && (
          <span className="text-[10px] text-rose-600 block font-medium mt-0.5">
            ✦ {row.holiday_name}
          </span>
        )}
        {row.leave_type && (
          <span className="text-[10px] text-amber-700 block font-medium mt-0.5">
            ✦ {row.leave_type}
          </span>
        )}
      </td>

      <td className="py-2 px-2 text-center whitespace-nowrap border-r border-slate-200 font-mono text-xs font-semibold text-slate-800">
        {row.punch_in || <span className="text-slate-400 font-normal">—</span>}
      </td>

      <td className="py-2 px-2 text-center whitespace-nowrap border-r border-slate-200 font-mono text-xs font-semibold text-slate-800">
        {row.punch_out ? (
          row.punch_out
        ) : isToday ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Working
          </span>
        ) : (
          <span className="text-slate-400 font-normal">—</span>
        )}
      </td>

      <td className="py-2 px-2 text-center whitespace-nowrap font-mono text-xs font-bold text-slate-900 border-r border-slate-200">
        {prodFormatted}
      </td>

      <td className="py-2 px-2 text-center whitespace-nowrap font-mono text-xs font-semibold text-slate-600 border-r border-slate-200">
        {brkFormatted}
      </td>

      <td className="py-2 px-2 text-center whitespace-nowrap border-r border-slate-200">
        <DayStatusBadge status={row.status} label={row.status_label} size="sm" />
      </td>

      <td className="py-2 px-3 text-center whitespace-nowrap min-w-[95px]">
        {row.can_request_correction ? (
          <button
            type="button"
            onClick={() => onSelectCorrectionDate(row.date)}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-600 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
          >
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>Correct</span>
          </button>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>
    </tr>
  );
};

