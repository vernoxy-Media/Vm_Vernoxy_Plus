import React, { useState } from 'react';
import { Calendar, Eye } from 'lucide-react';
import type { DayRecord } from '../types/attendance.types';
import { formatHoursMinutes } from './TickingWorkedTimer';
import { RequestCorrectionDialog } from './RequestCorrectionDialog';

export interface RecentAttendanceRecordsCardProps {
  records: DayRecord[];
  selectedDate?: string;
  onViewAll?: () => void;
  onRequestCorrection?: (date: string) => void;
  onSelectDate?: (date: string) => void;
  onSuccessCorrection?: (msg: string) => void;
}

export const RecentAttendanceRecordsCard: React.FC<RecentAttendanceRecordsCardProps> = ({
  records,
  selectedDate,
  onViewAll,
  onRequestCorrection,
  onSelectDate,
  onSuccessCorrection,
}) => {
  const [selectedCorrectionDate, setSelectedCorrectionDate] = useState<string | null>(null);
  const [showAllMonth, setShowAllMonth] = useState<boolean>(false);

  // 1. Calculate current week range (Monday - Sunday) based on selectedDate or today
  const todayStr = new Date().toISOString().slice(0, 10);
  const baseDateStr = selectedDate || todayStr;
  const refDate = new Date(`${baseDateStr}T00:00:00Z`);
  const dayOfWeek = refDate.getUTCDay(); // 0 is Sun, 1 is Mon
  const diffToMon = (dayOfWeek < 1 ? 7 : 0) + dayOfWeek - 1;
  const monDate = new Date(refDate);
  monDate.setUTCDate(refDate.getUTCDate() - diffToMon);
  const sunDate = new Date(monDate);
  sunDate.setUTCDate(monDate.getUTCDate() + 6);

  const weekStartStr = monDate.toISOString().slice(0, 10);
  const weekEndStr = sunDate.toISOString().slice(0, 10);

  // Sort ascending so earliest day appears first (e.g. Mon -> Fri)
  const sortedAllRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // Current week records
  const currentWeekRecords = sortedAllRecords.filter(
    (r) => r.date >= weekStartStr && r.date <= weekEndStr
  );

  // Display either the entire month (with scroll) or just the current week
  const displayRecords = showAllMonth
    ? sortedAllRecords
    : (currentWeekRecords.length > 0 ? currentWeekRecords : sortedAllRecords.slice(0, 7));

  const selectedCorrectionRow = selectedCorrectionDate
    ? records.find((r) => r.date === selectedCorrectionDate)
    : null;

  const handleToggleView = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      setShowAllMonth((prev) => !prev);
    }
  };

  return (
    <div
      id="recent-attendance-records-card"
      className="bg-white rounded-xl border border-slate-300 shadow-[0_2px_12px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] transition-all p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Attendance Records</h3>
            <p className="text-xs text-slate-500 font-medium">
              {showAllMonth ? 'Entire Month' : 'Current Week'} ({displayRecords.length} days)
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleView}
          type="button"
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer select-none"
        >
          {showAllMonth ? 'Show Current Week' : 'View All'}
        </button>
      </div>

      {/* Table with comfortable 44px rows, 36px header row, and smooth scrolling when viewing entire month */}
      <div className={`overflow-x-auto ${showAllMonth ? 'max-h-[460px] overflow-y-auto scrollbar-thin' : ''}`}>
        <table className="w-full text-left text-xs">
          <thead className={showAllMonth ? 'sticky top-0 bg-white z-10 shadow-2xs' : ''}>
            <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider bg-white">
              <th className="py-2 px-3.5 bg-white">Date</th>
              <th className="py-2 px-3.5 bg-white">Punch In</th>
              <th className="py-2 px-3.5 bg-white">Punch Out</th>
              <th className="py-2 px-3.5 text-center bg-white">Working Hours</th>
              <th className="py-2 px-3.5 text-center bg-white">Break Hours</th>
              <th className="py-2 px-3.5 text-center bg-white">Status</th>
              <th className="py-2 px-3.5 text-right bg-white">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90 font-medium">
            {displayRecords.map((record) => {
              const dateObj = new Date(`${record.date}T00:00:00Z`);
              const monthName = dateObj.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
              const dayNum = dateObj.getUTCDate();
              const yearNum = dateObj.getUTCFullYear();
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

              const isToday = record.is_today;
              const workingFormatted = (record.production_seconds || 0) > 0
                ? formatHoursMinutes(record.production_seconds).replace(':', 'h ') + 'm'
                : '0h 00m';

              const breakFormatted = (record.break_seconds || 0) > 0
                ? formatHoursMinutes(record.break_seconds).replace(':', 'h ') + 'm'
                : record.status === 'holiday' || record.status === 'weekly_off' ? '—' : '0h 00m';

              // Status badge pill styling (borderless tinted pills)
              let statusText = record.status_label || record.status.toUpperCase();
              let statusBadgeClass = 'bg-slate-100 text-slate-600';

              if (isToday) {
                statusText = record.punch_out ? 'PRESENT' : 'IN PROGRESS';
                statusBadgeClass = 'bg-emerald-50 text-emerald-700 font-bold';
              } else if (record.status === 'present') {
                statusBadgeClass = 'bg-emerald-50 text-emerald-700 font-bold';
              } else if (record.status === 'holiday') {
                statusBadgeClass = 'bg-blue-50 text-blue-700 font-bold';
              } else if (record.status === 'weekly_off') {
                statusBadgeClass = 'bg-purple-50 text-purple-700 font-bold';
              } else if (record.status === 'absent') {
                statusBadgeClass = 'bg-rose-50 text-rose-700 font-bold';
              } else if (record.status === 'leave') {
                statusBadgeClass = 'bg-amber-50 text-amber-700 font-bold';
              }

              const isSelected = selectedDate === record.date;

              return (
                <tr
                  key={record.date}
                  className={`h-11 transition-colors ${
                    isSelected ? 'bg-blue-50/60 font-semibold' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Date (13px text) */}
                  <td className="py-2 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13px] text-slate-800">
                        {monthName} {dayNum}, {yearNum}
                      </span>
                      <span className="text-slate-500 text-xs font-normal">{dayName}</span>
                    </div>
                  </td>

                  {/* Punch In */}
                  <td className="py-2 px-3.5 font-mono font-medium text-xs text-slate-700 whitespace-nowrap">
                    {record.punch_in || '—'}
                  </td>

                  {/* Punch Out */}
                  <td className="py-2 px-3.5 font-mono font-medium text-xs text-slate-700 whitespace-nowrap">
                    {record.punch_out || '—'}
                  </td>

                  {/* Working Hours */}
                  <td className="py-2 px-3.5 text-center whitespace-nowrap">
                    <span className="font-bold text-emerald-600 font-mono text-xs">
                      {workingFormatted}
                    </span>
                  </td>

                  {/* Break Hours */}
                  <td className="py-2 px-3.5 text-center font-mono font-medium text-xs text-slate-700 whitespace-nowrap">
                    {breakFormatted}
                  </td>

                  {/* Status */}
                  <td className="py-2 px-3.5 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs tracking-wide ${statusBadgeClass}`}>
                      {statusText}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-2 px-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        if (onSelectDate) onSelectDate(record.date);
                        if (onRequestCorrection) {
                          onRequestCorrection(record.date);
                        } else {
                          setSelectedCorrectionDate(record.date);
                        }
                      }}
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Correction modal fallback if opened locally */}
      {selectedCorrectionDate && selectedCorrectionRow && (
        <RequestCorrectionDialog
          isOpen={true}
          date={selectedCorrectionDate}
          defaultPunchIn={selectedCorrectionRow.punch_in}
          defaultPunchOut={selectedCorrectionRow.punch_out}
          onClose={() => setSelectedCorrectionDate(null)}
          onSuccess={(msg) => {
            onSuccessCorrection?.(msg);
            setSelectedCorrectionDate(null);
          }}
        />
      )}
    </div>
  );
};
