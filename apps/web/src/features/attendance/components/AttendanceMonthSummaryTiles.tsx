import React from 'react';
import type { DayRecord } from '../types/attendance.types';

export interface AttendanceMonthSummaryTilesProps {
  records: DayRecord[];
}

export const AttendanceMonthSummaryTiles: React.FC<AttendanceMonthSummaryTilesProps> = ({ records }) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter only past dates and today (future dates do not contribute to stats)
  const activeRecords = records.filter((r) => r.date <= todayStr);

  const presentCount = activeRecords.filter((r) => r.status === 'present').length;
  const absentCount = activeRecords.filter((r) => r.status === 'absent').length;
  const halfDayCount = activeRecords.filter((r) => r.status === 'half_day').length;
  const leaveCount = activeRecords.filter((r) => r.status === 'leave').length;

  const lateMarksCount = activeRecords.filter((r) => {
    if ((r as any)?.is_late !== undefined) return Boolean((r as any).is_late);
    if (!r.punch_in) return false;
    const m = r.punch_in.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return false;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3]?.toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min > 580; // After 09:40 AM
  }).length;

  const totalWorkingSeconds = activeRecords.reduce((acc, r) => acc + (r.production_seconds || 0), 0);
  const totalHrs = Math.floor(totalWorkingSeconds / 3600);
  const totalMins = Math.floor((totalWorkingSeconds % 3600) / 60);
  const totalHoursFormatted = `${totalHrs}:${String(totalMins).padStart(2, '0')}`;

  const tiles = [
    {
      label: 'Present',
      value: presentCount,
      borderColor: 'border-emerald-500',
    },
    {
      label: 'Absent',
      value: absentCount,
      borderColor: 'border-rose-500',
    },
    {
      label: 'Half Day',
      value: halfDayCount,
      borderColor: 'border-amber-500',
    },
    {
      label: 'On Leave',
      value: leaveCount,
      borderColor: 'border-blue-500',
    },
    {
      label: 'Late Marks',
      value: lateMarksCount,
      borderColor: 'border-orange-500',
    },
    {
      label: 'Total Hours',
      value: totalHoursFormatted,
      borderColor: 'border-teal-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className={`bg-white rounded-xl border border-slate-200 border-t-4 ${tile.borderColor} p-4 shadow-2xs hover:shadow-xs transition`}
        >
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {tile.value}
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1">
            {tile.label}
          </div>
        </div>
      ))}
    </div>
  );
};
