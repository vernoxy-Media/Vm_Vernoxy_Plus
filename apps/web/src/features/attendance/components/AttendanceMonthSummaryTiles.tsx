import React from 'react';
import { AlarmClock, CalendarOff, CheckCircle2, Hourglass, Sunrise, UserX } from 'lucide-react';
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
    return h * 60 + min > 585; // After 09:45 AM (09:30 AM + 15m grace)
  }).length;

  const totalWorkingSeconds = activeRecords.reduce((acc, r) => acc + (r.production_seconds || 0), 0);
  const totalHrs = Math.floor(totalWorkingSeconds / 3600);
  const totalMins = Math.floor((totalWorkingSeconds % 3600) / 60);
  const totalHoursFormatted = `${totalHrs}:${String(totalMins).padStart(2, '0')}`;

  const tiles = [
    { label: 'Present', value: presentCount, Icon: CheckCircle2, card: 'from-emerald-50 border-emerald-100', icon: 'bg-emerald-500 text-white shadow-emerald-500/30', num: 'text-emerald-900' },
    { label: 'Absent', value: absentCount, Icon: UserX, card: 'from-rose-50 border-rose-100', icon: 'bg-rose-500 text-white shadow-rose-500/30', num: 'text-rose-900' },
    { label: 'Half Day', value: halfDayCount, Icon: Sunrise, card: 'from-amber-50 border-amber-100', icon: 'bg-amber-500 text-white shadow-amber-500/30', num: 'text-amber-900' },
    { label: 'On Leave', value: leaveCount, Icon: CalendarOff, card: 'from-sky-50 border-sky-100', icon: 'bg-sky-500 text-white shadow-sky-500/30', num: 'text-sky-900' },
    { label: 'Late Marks', value: lateMarksCount, Icon: AlarmClock, card: 'from-orange-50 border-orange-100', icon: 'bg-orange-500 text-white shadow-orange-500/30', num: 'text-orange-900' },
    { label: 'Total Hours', value: totalHoursFormatted, Icon: Hourglass, card: 'from-violet-50 border-violet-100', icon: 'bg-violet-500 text-white shadow-violet-500/30', num: 'text-violet-900' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map(({ label, value, Icon, card, icon, num }) => (
        <div key={label} className={`flex items-center gap-3 rounded-2xl border bg-gradient-to-br ${card} to-white p-3 shadow-2xs transition hover:-translate-y-0.5 hover:shadow-md`}>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md ${icon}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className={`text-xl font-extrabold leading-none tracking-tight ${num}`}>{value}</div>
            <div className="mt-1 truncate text-[11px] font-semibold text-slate-500">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
