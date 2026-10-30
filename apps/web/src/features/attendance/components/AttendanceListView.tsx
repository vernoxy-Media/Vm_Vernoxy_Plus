import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import type { DayRecord } from '../types/attendance.types';
import { AttendanceInsightDrawer } from './AttendanceInsightDrawer';

export interface AttendanceListViewProps {
  records: DayRecord[];
  onSelectDate: (date: string) => void;
  shiftName?: string;
}

export const AttendanceListView: React.FC<AttendanceListViewProps> = ({
  records,
  onSelectDate,
  shiftName = 'General Shift (09:30 - 18:30)',
}) => {
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<DayRecord | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter only past dates and today (exclude blank future dates as per spec)
  const pastAndTodayRecords = records
    .filter((r) => r.date <= todayStr)
    .sort((a, b) => b.date.localeCompare(a.date)); // Newest first

  const formatHoursMinutes = (sec?: number) => {
    if (!sec || sec <= 0) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${String(m).padStart(2, '0')}m`;
  };

  const isLateMark = (record: DayRecord) => {
    if ((record as any)?.is_late !== undefined) return Boolean((record as any).is_late);
    if (!record.punch_in) return false;
    const m = record.punch_in.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return false;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3]?.toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min > 580; // After 09:40 AM
  };

  return (
    <div id="attendance-list-view" className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
            <th className="py-3 px-4">Date</th>
            <th className="py-3 px-4">Shift</th>
            <th className="py-3 px-4">Check In</th>
            <th className="py-3 px-4">Check Out</th>
            <th className="py-3 px-4 text-center">Break</th>
            <th className="py-3 px-4 text-center">Working Hours</th>
            <th className="py-3 px-4 text-center">Status</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white font-medium">
          {pastAndTodayRecords.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-12 text-center text-slate-400">
                No attendance records found for this period.
              </td>
            </tr>
          ) : (
            pastAndTodayRecords.map((record) => {
              const dateObj = new Date(`${record.date}T00:00:00Z`);
              const dateFormatted = dateObj.toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                weekday: 'short',
                timeZone: 'UTC',
              });

              const isToday = record.date === todayStr;
              const isCheckedIn = Boolean(isToday && record.punch_in && !record.punch_out);
              const isLate = isLateMark(record);
              const isMissingPunch = !isToday && Boolean(
                record.status === 'incomplete' ||
                (record.punch_in && !record.punch_out)
              );

              return (
                <tr
                  key={record.date}
                  onClick={() => {
                    setSelectedDetailRecord(record);
                    onSelectDate(record.date);
                  }}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                    isToday ? 'bg-blue-50/30 font-semibold' : ''
                  }`}
                >
                  <td className="py-3 px-4 whitespace-nowrap text-slate-900 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span>{dateFormatted}</span>
                      {isToday && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Today
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {shiftName}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-mono">
                    {record.punch_in || '—'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-mono">
                    {record.punch_out || '—'}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap text-slate-600">
                    {formatHoursMinutes(record.break_seconds)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap text-slate-900 font-bold">
                    {formatHoursMinutes(record.production_seconds)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {isCheckedIn ? (
                        <span className="px-2 py-0.5 border border-slate-700 rounded-md text-[11px] font-semibold text-slate-800 bg-slate-50">
                          Checked in
                        </span>
                      ) : isMissingPunch ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[11px]">
                          <span className="w-4 h-4 rounded-full bg-orange-700 text-white font-bold text-[9px] flex items-center justify-center">MP</span>
                          Missing Punch
                        </span>
                      ) : record.status === 'holiday' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px]">
                          <span className="w-4 h-4 rounded-full bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center">H</span>
                          {record.holiday_name || 'Holiday'}
                        </span>
                      ) : record.status === 'weekly_off' ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px]">
                          WO (Weekly Off)
                        </span>
                      ) : record.status === 'absent' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center">A</span>
                          Absent
                        </span>
                      ) : record.status === 'half_day' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[8px] flex items-center justify-center">HD</span>
                          Half Day
                        </span>
                      ) : record.status === 'leave' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center">L</span>
                          On Leave
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center">P</span>
                            Present
                          </span>
                          {isLate && (
                            <span className="text-[11px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              LM
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDetailRecord(record);
                        onSelectDate(record.date);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Attendance Insight Drawer (Image 2 & 3) showing only update data */}
      {selectedDetailRecord && (
        <AttendanceInsightDrawer
          isOpen={Boolean(selectedDetailRecord)}
          date={selectedDetailRecord.date}
          record={selectedDetailRecord}
          onClose={() => setSelectedDetailRecord(null)}
        />
      )}
    </div>
  );
};
