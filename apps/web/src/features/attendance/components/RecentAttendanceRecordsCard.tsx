import React, { useState, useMemo } from 'react';
import {
  MoreVertical,
  Plus,
  History,
} from 'lucide-react';
import type { DayRecord } from '../types/attendance.types';
import { AttendanceInsightDrawer } from './AttendanceInsightDrawer';

export interface RecentAttendanceRecordsCardProps {
  records: DayRecord[];
  selectedDate?: string;
  onViewAll?: () => void;
  onRequestCorrection?: (date: string) => void;
  onSelectDate?: (date: string) => void;
  onSuccessCorrection?: (msg: string) => void;
  onOpenMyRequests?: () => void;
}

export const RecentAttendanceRecordsCard: React.FC<RecentAttendanceRecordsCardProps> = ({
  records,
  selectedDate,
  onSelectDate,
  onSuccessCorrection,
  onOpenMyRequests,
}) => {
  // Drawer states: date, record, and mode
  const [insightDrawerDate, setInsightDrawerDate] = useState<string | null>(null);
  const [insightDrawerMode, setInsightDrawerMode] = useState<'insight' | 'regularize'>('insight');
  const [selectedRecordForDrawer, setSelectedRecordForDrawer] = useState<DayRecord | null>(null);

  // Date Range filter states defaulting to current week (Monday - Sunday)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const baseDateStr = selectedDate || todayStr;

  const currentWeekRange = useMemo(() => {
    const refDate = new Date(`${baseDateStr}T00:00:00Z`);
    const dayOfWeek = refDate.getUTCDay(); // 0 is Sun, 1 is Mon
    const diffToMon = (dayOfWeek < 1 ? 7 : 0) + dayOfWeek - 1;
    const monDate = new Date(refDate);
    monDate.setUTCDate(refDate.getUTCDate() - diffToMon);
    const sunDate = new Date(monDate);
    sunDate.setUTCDate(monDate.getUTCDate() + 6);
    return {
      start: monDate.toISOString().slice(0, 10),
      end: sunDate.toISOString().slice(0, 10),
    };
  }, [baseDateStr]);

  const [fromDate, setFromDate] = useState<string>(currentWeekRange.start);
  const [toDate, setToDate] = useState<string>(currentWeekRange.end);

  const handleResetFilters = () => {
    setFromDate(currentWeekRange.start);
    setToDate(currentWeekRange.end);
  };

  // Filter and sort records (newest on top matching Image 1: Oct 24, Oct 23, Oct 22...)
  const filteredRecords = useMemo(() => {
    return [...records]
      .filter((r) => {
        if (fromDate && r.date < fromDate) return false;
        if (toDate && r.date > toDate) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, fromDate, toDate]);

  // Open Insight Drawer (Image 2) on clicking View or ⋮
  const handleOpenInsight = (rec: DayRecord) => {
    setSelectedRecordForDrawer(rec);
    setInsightDrawerDate(rec.date);
    setInsightDrawerMode('insight');
    if (onSelectDate) onSelectDate(rec.date);
  };

  // Open Regularize Drawer (Image 3) on clicking Request for Missing Day
  const handleOpenMissingDayRequest = () => {
    const targetDate = selectedDate || todayStr;
    const rec = records.find((r) => r.date === targetDate) || null;
    setSelectedRecordForDrawer(rec);
    setInsightDrawerDate(targetDate);
    setInsightDrawerMode('regularize');
  };

  // Format Date for table row: e.g. "Sat, Oct 24"
  const formatDateColumn = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const month = dateObj.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = dateObj.getUTCDate();
    return `${weekday}, ${month} ${day}`;
  };

  // Format hours and minutes: e.g. "8h 22m" or "0m"
  const formatHoursShort = (sec?: number) => {
    if (!sec || sec <= 0) return '0m';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  // Calculate percentage of 8h standard target
  const getEffectivePercentage = (sec?: number) => {
    if (!sec || sec <= 0) return 0;
    return Math.min(100, Math.round((sec / 28800) * 100));
  };

  // Calculate arrival time and late badge
  const getArrivalInfo = (record: DayRecord) => {
    if (!record.punch_in) return { text: '—', lateMinutes: 0 };
    // Format punch in: e.g. 09:14 AM
    let formatted = record.punch_in;
    const match = record.punch_in.match(/^(\d{1,2}):(\d{2})/);
    let lateMins = 0;
    if (match) {
      let h = parseInt(match[1], 10);
      const min = parseInt(match[2], 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const dispH = h % 12 || 12;
      formatted = `${String(dispH).padStart(2, '0')}:${match[2]} ${ampm}`;

      // Check if after 09:00 AM (shift start in reference image)
      const totalMins = h * 60 + min;
      if (totalMins > 540) {
        lateMins = totalMins - 540;
      }
    }
    return { text: formatted, lateMinutes: lateMins };
  };

  // Compute Live State matching Image 1
  const getLiveState = (record: DayRecord) => {
    const isToday = record.date === todayStr;
    if (record.punch_out) {
      return { label: 'CLOCKED OUT', className: 'bg-slate-100 text-slate-700' };
    }
    if (isToday) {
      if (record.punch_in) {
        return { label: 'IN PROGRESS', className: 'bg-blue-50 text-blue-700' };
      }
      return { label: 'NOT CLOCKED IN', className: 'bg-slate-100 text-slate-500' };
    }
    if (record.punch_in && !record.punch_out) {
      return { label: 'MISSING PUNCH', className: 'bg-rose-50 text-rose-600' };
    }
    return { label: '—', className: 'text-slate-400' };
  };

  // Compute Status matching Image 1
  const getStatusBadge = (record: DayRecord) => {
    const isToday = record.date === todayStr;
    if (record.status === 'holiday') {
      return { label: 'HOLIDAY', className: 'bg-sky-50 text-sky-600 font-bold' };
    }
    if (record.status === 'weekly_off') {
      return { label: 'WEEKLY OFF', className: 'bg-slate-100 text-slate-600 font-bold' };
    }
    if (record.punch_in && !record.punch_out && !isToday) {
      return { label: 'MISSING CLOCK OUT', className: 'bg-rose-50 text-rose-600 font-bold' };
    }
    if (record.punch_in) {
      return { label: record.punch_out ? 'CLOCKED OUT' : 'PRESENT', className: 'bg-emerald-50 text-emerald-600 font-bold' };
    }
    if (record.status === 'leave') {
      return { label: 'ON LEAVE', className: 'bg-amber-50 text-amber-700 font-bold' };
    }
    return { label: 'ABSENT', className: 'bg-rose-50 text-rose-600 font-bold' };
  };

  return (
    <div
      id="activity-logs-card"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5"
    >
      {/* Header & Controls matching Image 1 */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-1">
        {/* Title and Date Range pickers */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 mr-2">
            Activity Logs
          </h2>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="uppercase text-[11px] font-bold text-slate-400 tracking-wider">FROM</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="uppercase text-[11px] font-bold text-slate-400 tracking-wider">TO</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition shadow-2xs cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Top-Right Action Buttons matching Image 1 */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenMyRequests?.()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>My Requests</span>
          </button>

          <button
            type="button"
            onClick={handleOpenMissingDayRequest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 font-extrabold text-xs shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] text-slate-700" />
            <span>Request for Missing Day</span>
          </button>
        </div>
      </div>

      {/* Table matching Image 1 with internal scrolling and sticky header */}
      <div className="overflow-x-auto overflow-y-auto max-h-[380px] rounded-xl border border-slate-200/90 scrollbar-thin">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 shadow-2xs border-b border-slate-200">
            <tr className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 font-bold">DATE</th>
              <th className="py-3 px-4 font-bold">EFFECTIVE HOURS</th>
              <th className="py-3 px-4 font-bold">GROSS HOURS</th>
              <th className="py-3 px-4 font-bold">TIMELINE</th>
              <th className="py-3 px-4 font-bold">ARRIVAL</th>
              <th className="py-3 px-4 font-bold">LIVE STATE</th>
              <th className="py-3 px-4 font-bold">STATUS</th>
              <th className="py-3 px-4 font-bold text-right w-12"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium bg-white">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No activity records found in this range.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const dateLabel = formatDateColumn(record.date);
                const effectivePct = getEffectivePercentage(record.production_seconds);
                const effectiveText = formatHoursShort(record.production_seconds);
                const grossSec = (record.production_seconds || 0) + (record.break_seconds || 0);
                const grossText = formatHoursShort(grossSec);
                const arrival = getArrivalInfo(record);
                const liveState = getLiveState(record);
                const status = getStatusBadge(record);
                const isSelected = selectedDate === record.date;

                // Circular Progress calculation for 26px circle
                const radius = 10;
                const circumference = 2 * Math.PI * radius;
                const dashOffset = circumference - (effectivePct / 100) * circumference;

                return (
                  <tr
                    key={record.date}
                    onClick={() => handleOpenInsight(record)}
                    className={`h-14 transition-colors cursor-pointer group ${
                      isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* 1. DATE */}
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900 text-xs">
                      {dateLabel}
                    </td>

                    {/* 2. EFFECTIVE HOURS (Circle Gauge + Text) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                          <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
                            <circle
                              cx="14"
                              cy="14"
                              r={radius}
                              stroke="#e2e8f0"
                              strokeWidth="2.5"
                              fill="none"
                            />
                            <circle
                              cx="14"
                              cy="14"
                              r={radius}
                              stroke="#3b82f6"
                              strokeWidth="2.5"
                              strokeDasharray={circumference}
                              strokeDashoffset={dashOffset}
                              strokeLinecap="round"
                              fill="none"
                            />
                          </svg>
                          <span className="absolute text-[8px] font-bold text-slate-700">
                            {effectivePct}%
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {effectiveText}
                        </span>
                      </div>
                    </td>

                    {/* 3. GROSS HOURS */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs font-semibold text-slate-700">
                      {grossText}
                    </td>

                    {/* 4. TIMELINE (Visual Progress Track) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                        {record.production_seconds && record.production_seconds > 0 ? (
                          <div
                            className="h-full bg-slate-600 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(10, Math.round((record.production_seconds / 28800) * 100)))}%`,
                            }}
                          />
                        ) : (
                          <div className="h-full w-0" />
                        )}
                      </div>
                    </td>

                    {/* 5. ARRIVAL (Time + Late Pill) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {arrival.text !== '—' ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {arrival.text}
                          </span>
                          {arrival.lateMinutes > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                              <span>LATE {arrival.lateMinutes}M</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* 6. LIVE STATE */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {liveState.label !== '—' ? (
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${liveState.className}`}>
                          {liveState.label}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* 7. STATUS */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
                        {status.label}
                      </span>
                    </td>

                    {/* 8. LOG (View / Three dots button) */}
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInsight(record);
                        }}
                        className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer group-hover:bg-slate-100"
                        title="View Attendance Insight"
                        aria-label="View Attendance Insight"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Attendance Insight & Regularization Drawer (Image 2 & Image 3) */}
      {insightDrawerDate && (
        <AttendanceInsightDrawer
          isOpen={Boolean(insightDrawerDate)}
          date={insightDrawerDate}
          record={selectedRecordForDrawer}
          initialMode={insightDrawerMode}
          onClose={() => {
            setInsightDrawerDate(null);
            setSelectedRecordForDrawer(null);
          }}
          onSuccessRegularization={(msg) => {
            onSuccessCorrection?.(msg);
          }}
        />
      )}
    </div>
  );
};
