import React, { useState, useRef, useEffect } from 'react';
import type { DayRecord } from '../types/attendance.types';
import { formatHoursMinutes } from './TickingWorkedTimer';
import { RequestCorrectionDialog } from './RequestCorrectionDialog';
import { AttendanceTableRow } from './AttendanceTableRow';
import { AttendanceMobileCard } from './AttendanceMobileCard';

export interface AttendanceListCardProps {
  records: DayRecord[];
  onSuccessCorrection?: (msg: string) => void;
}

export const AttendanceListCard: React.FC<AttendanceListCardProps> = ({
  records,
  onSuccessCorrection,
}) => {
  const [selectedCorrectionDate, setSelectedCorrectionDate] = useState<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);

  const totalProductionSec = records.reduce((acc, r) => acc + (r.production_seconds || 0), 0);
  const totalBreakSec = records.reduce((acc, r) => acc + (r.break_seconds || 0), 0);

  const totalProductionFormatted = formatHoursMinutes(totalProductionSec);
  const totalBreakFormatted = formatHoursMinutes(totalBreakSec);

  // Auto-scroll so 5 days status are visible centered on today (today - 2 to today + 2)
  useEffect(() => {
    const todayIndex = records.findIndex((r) => r.is_today);
    if (todayIndex >= 0) {
      const targetScrollIndex = Math.max(0, todayIndex - 2);
      const rowHeight = 64; // height of each table row
      const doScroll = () => {
        if (tableContainerRef.current) {
          const targetRow = document.getElementById(`attendance-row-${records[targetScrollIndex]?.date}`);
          if (targetRow) {
            const headerHeight = tableContainerRef.current.querySelector('thead')?.clientHeight || 44;
            tableContainerRef.current.scrollTop = Math.max(0, targetRow.offsetTop - headerHeight);
          } else {
            tableContainerRef.current.scrollTop = targetScrollIndex * rowHeight;
          }
        }
        if (mobileContainerRef.current) {
          const targetCard = document.getElementById(`attendance-mobile-card-${records[targetScrollIndex]?.date}`);
          if (targetCard) {
            mobileContainerRef.current.scrollTop = targetCard.offsetTop;
          } else {
            const mobileCardHeight = 115;
            mobileContainerRef.current.scrollTop = targetScrollIndex * mobileCardHeight;
          }
        }
      };

      doScroll();
      const timer = setTimeout(doScroll, 80);
      return () => clearTimeout(timer);
    }
  }, [records]);

  return (
    <div id="attendance-list-card" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-blue-600 tracking-tight">Attendance List</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {records.length} days
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Showing 5 days at a time · Scroll up/down to view all {records.length} days
          </span>
        </div>

        {/* Desktop Table View (>= 768px) with sticky header & 5-day visible scroll window */}
        <div
          id="attendance-desktop-table"
          ref={tableContainerRef}
          className="hidden md:block overflow-x-auto overflow-y-auto h-[364px] max-h-[364px] rounded-xl border border-slate-200/90 shadow-2xs relative scroll-smooth"
        >
          <table className="w-full text-left text-sm relative">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider shadow-2xs">
              <tr>
                <th className="py-3 px-4 w-14">S. No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Punch In</th>
                <th className="py-3 px-4">Punch Out</th>
                <th className="py-3 px-4">Production</th>
                <th className="py-3 px-4">Break</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((row, idx) => (
                <AttendanceTableRow
                  key={row.date}
                  row={row}
                  idx={idx}
                  onSelectCorrectionDate={setSelectedCorrectionDate}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (< 768px) with scrollable window */}
        <div
          id="attendance-mobile-list"
          ref={mobileContainerRef}
          className="md:hidden space-y-3 overflow-y-auto max-h-[550px] pr-1 scroll-smooth"
        >
          {records.map((row, idx) => (
            <AttendanceMobileCard
              key={row.date}
              row={row}
              idx={idx}
              onSelectCorrectionDate={setSelectedCorrectionDate}
            />
          ))}
        </div>
      </div>

      {/* Totals Row */}
      <div className="pt-4 mt-6 border-t-2 border-slate-200 bg-slate-50/50 -mx-6 -mb-6 p-4 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <span className="font-bold uppercase tracking-wider text-slate-600 text-xs">
          Month Totals ({records.length} days listed)
        </span>
        <div className="flex items-center gap-6 font-extrabold text-slate-900">
          <div>
            <span className="text-xs font-semibold text-slate-500 mr-2">Total Production:</span>
            <span className="text-blue-700">{totalProductionFormatted} hrs</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 mr-2">Total Break:</span>
            <span className="text-amber-700">{totalBreakFormatted} hrs</span>
          </div>
        </div>
      </div>

      {selectedCorrectionDate && (
        <RequestCorrectionDialog
          isOpen={Boolean(selectedCorrectionDate)}
          date={selectedCorrectionDate}
          onClose={() => setSelectedCorrectionDate(null)}
          onSuccess={onSuccessCorrection}
        />
      )}
    </div>
  );
};
