import React, { useState, useRef, useEffect } from 'react';
import { ClipboardList, Clock, Coffee } from 'lucide-react';
import type { DayRecord } from '../types/attendance.types';
import { formatHoursMinutes } from './TickingWorkedTimer';
import { RequestCorrectionDialog } from './RequestCorrectionDialog';
import { AttendanceTableRow } from './AttendanceTableRow';
import { AttendanceMobileCard } from './AttendanceMobileCard';

export interface AttendanceListCardProps {
  records: DayRecord[];
  onSuccessCorrection?: (msg: string) => void;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
}

export const AttendanceListCard: React.FC<AttendanceListCardProps> = ({
  records,
  onSuccessCorrection,
  selectedDate,
  onSelectDate,
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
      const rowHeight = 60; // height of each table row
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
    <div id="attendance-list-card" className="bg-white rounded-2xl border border-slate-300 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Attendance Records</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                {records.length} days
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Scroll up/down to view all days
          </span>
        </div>

        {/* Desktop Table View (>= 768px) with sticky header */}
        <div
          id="attendance-desktop-table"
          ref={tableContainerRef}
          className="hidden md:block overflow-x-auto overflow-y-auto h-[380px] max-h-[380px] rounded-xl border border-slate-300 shadow-xs relative scroll-smooth bg-white"
        >
          <table className="w-full min-w-[620px] text-left text-xs relative border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase tracking-wider shadow-2xs">
              <tr>
                <th className="py-2.5 px-1.5 w-10 text-center border-r border-slate-300">S.No</th>
                <th className="py-2.5 px-2.5 min-w-[130px] border-r border-slate-300">Date</th>
                <th className="py-2.5 px-2 text-center border-r border-slate-300">Punch In</th>
                <th className="py-2.5 px-2 text-center border-r border-slate-300">Punch Out</th>
                <th className="py-2.5 px-2 text-center border-r border-slate-300">Production</th>
                <th className="py-2.5 px-2 text-center border-r border-slate-300">Break</th>
                <th className="py-2.5 px-2 text-center border-r border-slate-300">Status</th>
                <th className="py-2.5 px-3 text-center min-w-[95px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {records.map((row, idx) => (
                <AttendanceTableRow
                  key={row.date}
                  row={row}
                  idx={idx}
                  isSelected={row.date === selectedDate}
                  onSelectRow={onSelectDate}
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
      <div className="pt-4 mt-5 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <span className="font-bold text-slate-600 tracking-tight">
          Month Totals ({records.length} days logged)
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-900 font-bold">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">Production:</span>
            <span className="font-mono">{totalProductionFormatted} hrs</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-900 font-bold">
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs text-amber-600 font-medium">Break:</span>
            <span className="font-mono">{totalBreakFormatted} hrs</span>
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

