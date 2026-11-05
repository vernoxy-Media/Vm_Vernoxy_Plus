import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  Plus,
  History,
  Calendar,
  X,
  ArrowRight,
  List,
} from 'lucide-react';
import type { DayRecord } from '../types/attendance.types';
import { AttendanceInsightDrawer } from './AttendanceInsightDrawer';
import { MyRegularizationsDrawer } from './MyRegularizationsDrawer';
import { fetchRegularizations } from '../api/attendance.api';

export interface RecentAttendanceRecordsCardProps {
  records: DayRecord[];
  shift?: {
    shift_name?: string;
    start_time?: string;
    end_time?: string;
    late_arrival_grace_minutes?: number;
    early_exit_grace_minutes?: number;
  };
  selectedDate?: string;
  onViewAll?: () => void;
  onRequestCorrection?: (date: string) => void;
  onSelectDate?: (date: string) => void;
  onSuccessCorrection?: (msg: string) => void;
  onOpenMyRequests?: () => void;
  hideActionButtons?: boolean;
}

export const RecentAttendanceRecordsCard: React.FC<RecentAttendanceRecordsCardProps> = ({
  records,
  shift,
  selectedDate,
  onSelectDate: _onSelectDate,
  onSuccessCorrection,
  onOpenMyRequests,
  hideActionButtons = false,
}) => {
  // Drawer states: date, record, and mode
  const [insightDrawerDate, setInsightDrawerDate] = useState<string | null>(null);
  const [insightDrawerMode, setInsightDrawerMode] = useState<'insight' | 'regularize'>('insight');
  const [selectedRecordForDrawer, setSelectedRecordForDrawer] = useState<DayRecord | null>(null);

  // My Regularizations Drawer state & count
  const [isMyRequestsDrawerOpen, setIsMyRequestsDrawerOpen] = useState<boolean>(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  // Missing Day Selection Modal state
  const [isSelectDateModalOpen, setIsSelectDateModalOpen] = useState<boolean>(false);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [missingDayDateInput, setMissingDayDateInput] = useState<string>(todayStr);

  const loadPendingCount = () => {
    fetchRegularizations({ scope: 'me', status: 'pending' })
      .then((res) => {
        setPendingRequestsCount(res?.length || 0);
      })
      .catch(() => { });
  };

  useEffect(() => {
    if (!hideActionButtons) {
      loadPendingCount();
    }
  }, [hideActionButtons]);

  // Date Range filter states defaulting to full month (matching reference image)
  const baseDateStr = selectedDate || todayStr;

  const currentMonthRange = useMemo(() => {
    const refDate = new Date(`${baseDateStr}T00:00:00Z`);
    const y = refDate.getUTCFullYear();
    const m = refDate.getUTCMonth();
    const startDate = new Date(Date.UTC(y, m, 1));
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const endDate = new Date(Date.UTC(y, m, lastDay));
    const endStr = endDate.toISOString().slice(0, 10);
    return {
      start: startDate.toISOString().slice(0, 10),
      end: endStr > todayStr ? todayStr : endStr,
    };
  }, [baseDateStr, todayStr]);

  const [fromDate, setFromDate] = useState<string>(currentMonthRange.start);
  const [toDate, setToDate] = useState<string>(currentMonthRange.end);

  useEffect(() => {
    setFromDate(currentMonthRange.start);
    setToDate(currentMonthRange.end);
  }, [currentMonthRange.start, currentMonthRange.end]);

  const handleResetFilters = () => {
    setFromDate(currentMonthRange.start);
    setToDate(currentMonthRange.end);
  };

  // Filter and sort records (newest on top matching Image 1: Oct 24, Oct 23, Oct 22...)
  // Activity logs strictly show only today and past days (never future calendar days)
  const filteredRecords = useMemo(() => {
    return [...records]
      .filter((r) => {
        if (r.date > todayStr) return false;
        if (fromDate && r.date < fromDate) return false;
        if (toDate && r.date > toDate) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, fromDate, toDate, todayStr]);

  // Open Insight Drawer (Image 2) on clicking View or ⋮
  const handleOpenInsight = (rec: DayRecord) => {
    setSelectedRecordForDrawer(rec);
    setInsightDrawerDate(rec.date);
    setInsightDrawerMode('insight');
  };

  // Open Date Selection modal first on clicking Request for Missing Day
  const handleOpenMissingDayRequest = () => {
    setMissingDayDateInput(selectedDate || todayStr);
    setIsSelectDateModalOpen(true);
  };

  // After date is confirmed in modal, proceed to Regularization Drawer
  const handleConfirmMissingDayDate = () => {
    setIsSelectDateModalOpen(false);
    const rec = records.find((r) => r.date === missingDayDateInput) || null;
    setSelectedRecordForDrawer(rec);
    setInsightDrawerDate(missingDayDateInput);
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
    const match = record.punch_in.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    let lateMins = 0;
    if (match) {
      let h = parseInt(match[1], 10);
      const min = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      const dispH = h % 12 || 12;
      formatted = `${String(dispH).padStart(2, '0')}:${match[2]} ${h >= 12 ? 'PM' : 'AM'}`;

      // Resolve shift start and grace period
      // Default: 09:30 AM (570 mins), grace: 15 mins -> Cutoff is 09:45 AM (585 mins)
      let shiftStartMins = 570; // 09:30 AM
      let lateGrace = 15;
      if (shift?.start_time) {
        const timePart = shift.start_time.match(/(\d{1,2}):(\d{2})/);
        if (timePart) {
          shiftStartMins = parseInt(timePart[1], 10) * 60 + parseInt(timePart[2], 10);
        }
      }
      if (shift?.late_arrival_grace_minutes !== undefined) {
        lateGrace = Number(shift.late_arrival_grace_minutes);
      }

      const totalMins = h * 60 + min;
      const cutoffMins = shiftStartMins + lateGrace;
      if (totalMins > cutoffMins) {
        lateMins = totalMins - shiftStartMins;
      }
    }
    return { text: formatted, lateMinutes: lateMins };
  };

  const formatLateMinutes = (mins: number) => {
    if (mins < 60) return `LATE ${mins}M`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `LATE ${h}H ${m}M` : `LATE ${h}H`;
  };

  // Compute Live State matching Reference Image
  const getLiveState = (record: DayRecord) => {
    const isToday = record.date === todayStr;
    if (isToday) {
      if (record.punch_in && !record.punch_out) {
        return { label: 'WORKING', className: 'bg-[#DCFCE7] text-[#166534] px-3 py-0.5 rounded-full font-bold' };
      }
      if (record.punch_out) {
        return { label: 'CLOCKED OUT', className: 'bg-[#E0E7FF] text-[#3730A3] px-3 py-0.5 rounded-full font-bold' };
      }
      return { label: '—', className: 'text-slate-400' };
    }
    if (record.punch_in && !record.punch_out) {
      return { label: 'MISSING PUNCH', className: 'bg-[#FEE2E2] text-[#991B1B] px-3 py-0.5 rounded-full font-bold' };
    }
    if (record.punch_out) {
      return { label: 'CLOCKED OUT', className: 'bg-[#E0E7FF] text-[#3730A3] px-3 py-0.5 rounded-full font-bold' };
    }
    return { label: '—', className: 'text-slate-400' };
  };

  // Compute Status matching Reference Image & Attendance Status Rules (BFD Section 2)
  const getStatusBadge = (record: DayRecord) => {
    const isToday = record.date === todayStr;
    if (record.status === 'holiday') {
      return { label: 'HOLIDAY', className: 'bg-sky-50 text-sky-700 px-3 py-0.5 rounded-full font-bold' };
    }
    if (record.status === 'weekly_off') {
      return { label: 'WEEKLY OFF', className: 'bg-[#F8FAFC] text-slate-500 border border-[#EDF2F7] px-3 py-0.5 rounded-full font-bold' };
    }
    if ((record as any)?.is_regularized || (record as any)?.regularization_status === 'pending') {
      return { label: 'PENDING REGULARIZATION', className: 'bg-[#FEF3C7] text-[#92400E] px-3 py-0.5 rounded-full font-bold' };
    }
    if (record.status === 'leave') {
      return { label: 'ON LEAVE', className: 'bg-[#FEF3C7] text-[#92400E] px-3 py-0.5 rounded-full font-bold' };
    }
    if (record.leave_part === 'half') {
      const base = getBaseStatusBadge(record, isToday);
      return { ...base, label: `${base.label} · HALF DAY LEAVE` };
    }
    return getBaseStatusBadge(record, isToday);
  };

  const getBaseStatusBadge = (record: DayRecord, isToday: boolean) => {
    if (!isToday && (record.status === 'incomplete' || (record.punch_in && !record.punch_out))) {
      return { label: 'MISSING CLOCK OUT', className: 'bg-[#FEE2E2] text-[#991B1B] px-3 py-0.5 rounded-full font-bold' };
    }
    if (record.status === 'half_day') {
      return { label: 'HALF DAY', className: 'bg-[#FEF3C7] text-[#92400E] px-3 py-0.5 rounded-full font-bold' };
    }
    if (record.status === 'absent' || record.status === 'short_hours') {
      return { label: 'ABSENT', className: 'bg-[#FEE2E2] text-[#991B1B] px-3 py-0.5 rounded-full font-bold' };
    }
    if (record.status === 'present') {
      return { label: 'PRESENT', className: 'bg-[#DCFCE7] text-[#166534] px-3 py-0.5 rounded-full font-bold' };
    }
    if (isToday && record.punch_in && !record.punch_out) {
      return { label: 'WORKING', className: 'bg-[#DCFCE7] text-[#166534] px-3 py-0.5 rounded-full font-bold' };
    }
    return { label: 'ABSENT', className: 'bg-[#FEE2E2] text-[#991B1B] px-3 py-0.5 rounded-full font-bold' };
  };

  return (
    <div
      id="activity-logs-card"
      className="bg-white rounded-[22px] border border-[#D4DCE6] shadow-floating-card card-hover-lift p-6 space-y-4"
    >
      {/* Header & Controls matching reference image */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-1">
        {/* Title and Date Range pickers */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 mr-2">
            <List className="w-4 h-4 text-[#5B4CF8] stroke-[1.75]" />
            <h2 className="text-base font-semibold tracking-tight text-[#1E293B]">
              Activity Logs
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
            <span className="uppercase text-[11px] font-bold text-slate-400 tracking-wider">FROM</span>
            <input
              type="date"
              value={fromDate}
              max={todayStr}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 rounded-[14px] border border-[#D4DCE6] bg-white text-xs font-semibold text-[#1E293B] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#5B4CF8]/20 focus:border-[#5B4CF8] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
            <span className="uppercase text-[11px] font-bold text-slate-400 tracking-wider">TO</span>
            <input
              type="date"
              value={toDate}
              max={todayStr}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 rounded-[14px] border border-[#D4DCE6] bg-white text-xs font-semibold text-[#1E293B] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#5B4CF8]/20 focus:border-[#5B4CF8] cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 rounded-[14px] border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-semibold text-[#1E293B] transition shadow-2xs btn-hover-lift cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Top-Right Action Buttons matching reference image */}
        {!hideActionButtons && (
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsMyRequestsDrawerOpen(true);
                onOpenMyRequests?.();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#1E293B] font-semibold text-xs shadow-2xs btn-hover-lift transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-slate-500 stroke-[1.75]" />
              <span>My Requests</span>
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingRequestsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={handleOpenMissingDayRequest}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] border border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-50 text-[#1E293B] font-semibold text-xs shadow-2xs btn-hover-lift transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2] text-[#1E293B]" />
              <span>Request for Missing Day</span>
            </button>
          </div>
        )}
      </div>

      {/* Table with sticky header, rounded corners, soft hover, increased row height h-[68px] */}
      <div className="overflow-x-auto overflow-y-auto max-h-[420px] rounded-[14px] border border-[#D4DCE6] scrollbar-thin">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#F8FAFC] z-10 shadow-2xs border-b border-[#D4DCE6]">
            <tr className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              <th className="py-3 px-4">DATE</th>
              <th className="py-3 px-4">EFFECTIVE HOURS</th>
              <th className="py-3 px-4">GROSS HOURS</th>
              <th className="py-3 px-4">TIMELINE</th>
              <th className="py-3 px-4">ARRIVAL</th>
              <th className="py-3 px-4">LIVE STATE</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4 text-center w-12">LOG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] font-medium bg-white">
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
                    className={`h-[68px] transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-[#F8FAFC]'
                      }`}
                  >
                    {/* 1. DATE */}
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-[#1E293B] text-xs">
                      {dateLabel}
                    </td>

                    {/* 2. EFFECTIVE HOURS (Circle Gauge + Text) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                            <circle
                              cx="12"
                              cy="12"
                              r={radius}
                              stroke="#e2e8f0"
                              strokeWidth="2"
                              fill="none"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r={radius}
                              stroke="#5B4CF8"
                              strokeWidth="2"
                              strokeDasharray={circumference}
                              strokeDashoffset={dashOffset}
                              strokeLinecap="round"
                              fill="none"
                            />
                          </svg>
                          <span className="absolute text-[7px] font-bold text-slate-700">
                            {effectivePct}%
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#1E293B]">
                          {effectiveText}
                        </span>
                      </div>
                    </td>

                    {/* 3. GROSS HOURS */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs font-medium text-[#64748B]">
                      {grossText}
                    </td>

                    {/* 4. TIMELINE (Visual Progress Track) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                        {record.production_seconds && record.production_seconds > 0 ? (
                          <div
                            className="h-full bg-gradient-to-r from-[#5B4CF8] to-[#6C63FF] rounded-full transition-all"
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
                              <span>{formatLateMinutes(arrival.lateMinutes)}</span>
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
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${liveState.className}`}>
                          {liveState.label}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* 7. STATUS */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${status.className}`}>
                        {status.label}
                      </span>
                    </td>

                    {/* 8. LOG (View / Three dots button) */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInsight(record);
                        }}
                        className="w-7 h-7 mx-auto rounded-full bg-slate-100/70 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                        title="View Attendance Log"
                        aria-label="View Attendance Log"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
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
          shift={shift}
          initialMode={insightDrawerMode}
          onClose={() => {
            setInsightDrawerDate(null);
            setSelectedRecordForDrawer(null);
          }}
          onSuccessRegularization={(msg) => {
            loadPendingCount();
            onSuccessCorrection?.(msg);
          }}
        />
      )}

      {/* Date Selection Modal before Request for Missing Day */}
      {isSelectDateModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Request for Missing Day</h3>
                    <p className="text-xs text-slate-500">Select the date you want to regularize</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSelectDateModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Date selection field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Date *
                </label>
                <input
                  type="date"
                  value={missingDayDateInput}
                  max={todayStr}
                  onChange={(e) => setMissingDayDateInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs cursor-pointer"
                />
              </div>

              {/* Preview of the selected date record if available */}
              {(() => {
                const rec = records.find((r) => r.date === missingDayDateInput);
                if (!rec) return null;
                const badge = getStatusBadge(rec);
                return (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Logged Status</span>
                      <span className={badge.className}>{badge.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Effective Hours</span>
                      <span className="font-bold font-mono text-slate-800">
                        {formatHoursShort(rec.production_seconds)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSelectDateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!missingDayDateInput}
                  onClick={handleConfirmMissingDayDate}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>Proceed to Request</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* My Regularizations Slide-Over Side Panel (Image 2) */}
      <MyRegularizationsDrawer
        isOpen={isMyRequestsDrawerOpen}
        onClose={() => setIsMyRequestsDrawerOpen(false)}
        onSuccessCorrection={(msg) => {
          loadPendingCount();
          onSuccessCorrection?.(msg);
        }}
      />
    </div>
  );
};
