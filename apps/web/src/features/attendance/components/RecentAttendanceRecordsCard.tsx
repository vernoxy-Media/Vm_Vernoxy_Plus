import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {

  Pencil,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Snail,
  Smile,
  TrendingUp,
  Plus,
  History,
  Calendar,
  X,
  ArrowRight,
} from 'lucide-react';
import type { DayRecord } from '../types/attendance.types';
import { AttendanceInsightDrawer } from './AttendanceInsightDrawer';
import { MyRegularizationsDrawer } from './MyRegularizationsDrawer';
import { fetchRegularizations } from '../api/attendance.api';
import { arrivalOf, describeMinutes, formatClock, overtimeMinutes, resolveShift } from '../utils/attendance-metrics';
import { Pagination } from '@/shared/ui/Pagination';

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
  /** Set when an administrator is looking at another employee */
  viewingEmpId?: number | null;
  hideActionButtons?: boolean;
}

export const RecentAttendanceRecordsCard: React.FC<RecentAttendanceRecordsCardProps> = ({
  records,
  shift,
  selectedDate,
  onSelectDate: _onSelectDate,
  onSuccessCorrection,
  onOpenMyRequests,
  viewingEmpId,
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

  // Hover card (shift + in/out + Regularise), kept open while the pointer is on it
  const [hover, setHover] = useState<{ record: DayRecord; x: number; y: number } | null>(null);
  const hoverTimer = React.useRef<number | undefined>(undefined);
  const openHover = (record: DayRecord, el: HTMLElement) => {
    window.clearTimeout(hoverTimer.current);
    const r = el.getBoundingClientRect();
    const w = 272;
    const h = 120 + 46 * Math.max(1, (record.breaks || []).filter((b) => b.ended_at).length + 1);
    const x = r.left - w - 8 >= 8 ? r.left - w - 8 : Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w));
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, r.top - 24));
    setHover({ record, x, y });
  };
  const closeHover = () => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHover(null), 160);
  };
  React.useEffect(() => {
    if (!hover) return;
    const out = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-att-pop]') && !t.closest('[data-att-log]')) setHover(null);
    };
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, [hover]);
  const keepHover = () => window.clearTimeout(hoverTimer.current);
  const [mapFor, setMapFor] = useState<{ record: DayRecord; x: number; y: number } | null>(null);

  const [preset, setPreset] = useState<'7' | '30' | 'month'>('month');
  const applyPreset = (p: '7' | '30' | 'month') => {
    setPreset(p);
    if (p === 'month') {
      setFromDate(currentMonthRange.start);
      setToDate(currentMonthRange.end);
      return;
    }
    const from = new Date(`${todayStr}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - (Number(p) - 1));
    setFromDate(from.toISOString().slice(0, 10));
    setToDate(todayStr);
  };

  // Minutes since midnight from "09:30 AM" / "13:05" style strings
  const toMinutes = (t?: string | null) => {
    const m = t?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const ap = m[3]?.toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h * 60 + parseInt(m[2], 10);
  };

  const todayRecord = records.find((r) => r.date === todayStr);
  const currentStatus = todayRecord?.punch_in && !todayRecord.punch_out ? 'In Office' : todayRecord?.punch_out ? 'Clocked out' : 'Not clocked in';

  const handleResetFilters = () => {
    setPreset('month');
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

  // Pagination: the logs of a month can be long
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => setPage(1), [fromDate, toDate, pageSize, records]);
  const pagedRecords = useMemo(
    () => filteredRecords.slice((page - 1) * pageSize, page * pageSize),
    [filteredRecords, page, pageSize],
  );

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

  const formatHrs = (sec?: number) => {
    const t = Math.max(0, Math.round((sec || 0) / 60));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} hrs`;
  };

  // Calculate percentage of 8h standard target
  const getEffectivePercentage = (sec?: number) => {
    if (!sec || sec <= 0) return 0;
    return Math.min(100, Math.round((sec / 28800) * 100));
  };

  const getArrivalInfo = (record: DayRecord) => {
    const a = arrivalOf(record, shift);
    return a
      ? { text: a.text, lateMinutes: a.lateMinutes, earlyMinutes: a.earlyMinutes, expected: a.expected }
      : { text: '—', lateMinutes: 0, earlyMinutes: 0, expected: '' };
  };

  const hm = (mins: number) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;

  // Work sessions of a day: the punch-in/out split by its breaks, as "09:30 AM" strings
  const sessionsOf = (r: DayRecord): Array<{ in: string; out: string | null }> => {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const gaps = (r.breaks || []).filter((b) => b.ended_at);
    if (gaps.length === 0) return [{ in: r.punch_in ?? '—', out: r.punch_out }];
    const out: Array<{ in: string; out: string | null }> = [];
    let start = r.punch_in ?? '—';
    for (const g of gaps) {
      out.push({ in: start, out: fmt(g.started_at) });
      start = fmt(g.ended_at as string);
    }
    out.push({ in: start, out: r.punch_out });
    return out;
  };

  // Green tick when the day is fully recorded, red "!" when something needs regularising
  const logOk = (r: DayRecord) =>
    r.status === 'present' || r.status === 'holiday' || r.status === 'weekly_off' || r.status === 'leave' || (r.date === todayStr && !!r.punch_in);

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
      className="bg-white rounded-xl border border-[#E4E8EF] p-4 sm:p-5 space-y-4"
    >
      {/* Header: Keka "Logs" with current status and period pills */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-[13px] text-slate-600">
          <span className={`h-2 w-2 rounded-full ${currentStatus === 'In Office' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span>Current Status: <strong className="font-semibold text-slate-800">{currentStatus}</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div role="group" aria-label="Period" className="inline-flex overflow-hidden rounded border border-[#1471DD]">
            {([['7', '7 Days'], ['30', '30 Days'], ['month', 'This Month']] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={preset === v}
                onClick={() => applyPreset(v)}
                className={`px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${preset === v ? 'bg-[#1471DD] text-white' : 'bg-white text-[#1471DD] hover:bg-blue-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="date"
            aria-label="From date"
            value={fromDate}
            max={todayStr}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border border-[#D4DCE6] bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-[#1471DD] focus:outline-none"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            aria-label="To date"
            value={toDate}
            max={todayStr}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border border-[#D4DCE6] bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-[#1471DD] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Reset
          </button>
          {!hideActionButtons && !viewingEmpId && (
          <button
            type="button"
            onClick={() => {
              setIsMyRequestsDrawerOpen(true);
              onOpenMyRequests?.();
            }}
            className="inline-flex items-center gap-1.5 rounded border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-slate-500" />
            My Requests
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {pendingRequestsCount}
            </span>
          </button>
          )}
          {!hideActionButtons && (
          <button
            type="button"
            onClick={handleOpenMissingDayRequest}
            className="inline-flex items-center gap-1.5 rounded border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Request for Missing Day
          </button>
          )}
        </div>
      </div>

      {/* Table: DATE | ATTENDANCE VISUAL | EFFECTIVE | GROSS | ARRIVAL | LOG */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-[#E4E8EF] scrollbar-thin">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#F8FAFC] border-b border-[#E4E8EF]">
            <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-5 pr-4 w-[210px]">Date</th>
              <th className="py-3 px-4 w-[360px]">Attendance visual</th>
              <th className="py-3 px-4">Effective hours</th>
              <th className="py-3 px-4">Gross hours</th>
              <th className="py-3 px-4">Arrival</th>
              <th className="py-3 pl-4 pr-5 text-center w-16">Log</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No activity records found in this range.
                </td>
              </tr>
            ) : (
              pagedRecords.map((record) => {
                // a half-day leave only has to fill the other half (4 h)
                const effectivePct = record.leave_half
                  ? Math.min(100, Math.round(((record.production_seconds || 0) / 14400) * 100))
                  : getEffectivePercentage(record.production_seconds);
                const grossSec = (record.production_seconds || 0) + (record.break_seconds || 0);
                const arrival = getArrivalInfo(record);
                const status = getStatusBadge(record);
                const hasPunch = !!record.punch_in;
                const halfLabel = record.leave_half === 'FIRST_HALF' ? '1ST HALF LEAVE' : record.leave_half === 'SECOND_HALF' ? '2ND HALF LEAVE' : null;
                // A half-day leave with punches still shows hours like a working day
                const off = record.status === 'weekly_off' || record.status === 'holiday' || (record.status === 'leave' && !hasPunch);
                const tagLabel = record.status === 'weekly_off' ? 'W-OFF' : record.status === 'holiday' ? 'HLDY' : halfLabel ?? (record.status === 'leave' ? 'LEAVE' : null);
                const tagCls = halfLabel || record.status === 'leave' ? 'bg-violet-400' : 'bg-[#B5A58A]';
                const isSelected = selectedDate === record.date;

                // Timeline on a 6 AM – 10 PM track
                const inM = toMinutes(record.punch_in);
                let outM = toMinutes(record.punch_out);
                if (inM !== null && outM === null && record.date === todayStr) outM = new Date().getHours() * 60 + new Date().getMinutes();
                const T0 = 360;
                const SPAN = 960;
                const pct = (m: number) => Math.min(100, Math.max(0, ((m - T0) / SPAN) * 100));
                const left = inM === null ? 0 : Math.min(98, pct(inM));
                const width = inM === null || outM === null ? 0 : Math.min(100 - left, Math.max(1.5, pct(outM) - pct(inM)));
                const localMin = (iso: string) => {
                  const d = new Date(iso);
                  return d.getHours() * 60 + d.getMinutes();
                };
                const gaps = (record.breaks || [])
                  .map((b) => ({ s: localMin(b.started_at), e: b.ended_at ? localMin(b.ended_at) : outM }))
                  .filter((g): g is { s: number; e: number } => g.e !== null && g.e > g.s);
                // The half of the shift that is on leave (shift 09:00 – 17:30, split at 13:15)
                const sh = resolveShift(shift);
                const leaveWindow = record.leave_half === 'FIRST_HALF' ? [sh.start, sh.split] : record.leave_half === 'SECOND_HALF' ? [sh.split, sh.end] : null;

                if (off && !record.punch_in) {
                  const note = record.status === 'holiday' ? record.holiday_name : record.status === 'leave' ? record.leave_type : null;
                  return (
                    <tr key={record.date} onClick={() => handleOpenInsight(record)} className="h-11 cursor-pointer border-b border-[#EEF1F6] bg-[#F7F6F3] hover:bg-[#F1EFEA]">
                      <td colSpan={6} className="px-4 py-2 text-[13px] text-slate-600">
                        <span className="mr-2">{formatDateColumn(record.date)}</span>
                        {tagLabel && <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold text-white ${tagCls}`}>{tagLabel}</span>}
                        {note && <span className="ml-2 text-xs text-slate-500">{note}</span>}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={record.date}
                    onClick={() => handleOpenInsight(record)}
                    className={`h-[52px] cursor-pointer border-b border-[#EEF1F6] last:border-b-0 transition-colors ${
                      isSelected ? 'bg-sky-50' : off ? 'bg-[#F7F6F3] hover:bg-[#F1EFEA]' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <td className="py-2 pl-5 pr-4 whitespace-nowrap text-[13px] text-slate-800">
                      <span className="mr-2 font-medium">{formatDateColumn(record.date)}</span>
                      {tagLabel && (
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold text-white ${tagCls}`}>{tagLabel}</span>
                      )}
                    </td>

                    <td className="py-2 px-4">
                      {off && !record.punch_in ? null : (
                        <div className="flex items-center gap-3">
                          <div
                            className="relative h-6 w-full max-w-[280px] flex-1"
                            style={{
                              backgroundImage: 'repeating-linear-gradient(to right, #E2E8F0 0, #E2E8F0 1px, transparent 1px, transparent 10px)',
                              backgroundSize: '100% 36%',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                            }}
                          >
                            {leaveWindow && (
                              <div
                                className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-violet-400"
                                style={{ left: `${pct(leaveWindow[0])}%`, width: `${pct(leaveWindow[1]) - pct(leaveWindow[0])}%` }}
                                title={record.leave_half === 'FIRST_HALF' ? 'First half on leave' : 'Second half on leave'}
                              />
                            )}
                            {width > 0 && (
                              <div
                                className="absolute top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-sky-400"
                                style={{ left: `${left}%`, width: `${width}%` }}
                                title={`${record.punch_in ?? ''} – ${record.punch_out ?? 'now'}`}
                              >
                                {gaps.map((g, i) => (
                                  <span
                                    key={i}
                                    className="absolute inset-y-0 bg-sky-100"
                                    style={{ left: `${((g.s - (inM as number)) / Math.max(1, (outM as number) - (inM as number))) * 100}%`, width: `${((g.e - g.s) / Math.max(1, (outM as number) - (inM as number))) * 100}%` }}
                                  />
                                ))}
                              </div>
                            )}
                            {inM !== null && width === 0 && (
                              <span className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-sky-400" style={{ left: `${left}%` }} />
                            )}
                            {inM !== null && (
                              <span aria-hidden className="absolute -bottom-0.5 h-0 w-0 -translate-x-1/2 border-x-[3px] border-b-[4px] border-x-transparent border-b-slate-300" style={{ left: `${left}%` }} />
                            )}
                            {width > 0 && (
                              <span aria-hidden className="absolute -bottom-0.5 h-0 w-0 -translate-x-1/2 border-x-[3px] border-b-[4px] border-x-transparent border-b-slate-300" style={{ left: `${left + width}%` }} />
                            )}
                          </div>

                          {/* Punch location */}
                          {inM !== null &&
                            (record.latitude != null && record.longitude != null ? (
                              <button
                                type="button"
                                aria-label="Show punch location"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const r = e.currentTarget.getBoundingClientRect();
                                  setMapFor((cur) =>
                                    cur?.record.date === record.date
                                      ? null
                                      : { record, x: Math.max(8, Math.min(window.innerWidth - 328, r.left - 150)), y: r.top - 196 < 8 ? r.bottom + 6 : r.top - 196 },
                                  );
                                }}
                                onMouseEnter={(e) => {
                                  const r = e.currentTarget.getBoundingClientRect();
                                  setMapFor({ record, x: Math.max(8, Math.min(window.innerWidth - 328, r.left - 150)), y: r.top - 196 < 8 ? r.bottom + 6 : r.top - 196 });
                                }}
                                onMouseLeave={() => setMapFor(null)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[#1471DD] ring-1 ring-sky-100 transition hover:bg-sky-100 cursor-pointer"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span
                                title="Location was not captured for this punch"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                              </span>
                            ))}
                        </div>
                      )}
                    </td>

                    <td className="py-2 px-4 whitespace-nowrap">
                      {off && !record.production_seconds ? null : (
                        <div className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            className="h-5 w-5 shrink-0 rounded-full ring-1 ring-sky-200"
                            style={{ background: `conic-gradient(#38BDF8 ${effectivePct * 3.6}deg, #F1F5F9 0deg)` }}
                          />
                          <span className="text-[13px] text-slate-800">{formatHrs(record.production_seconds)}</span>
                          {overtimeMinutes(record, shift) > 0 && (
                            <span
                              title="Overtime: time worked beyond the day's target"
                              className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 ring-1 ring-orange-100"
                            >
                              <TrendingUp className="h-3 w-3" />
                              {hm(overtimeMinutes(record, shift))} OT
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-2 px-4 whitespace-nowrap text-[13px] text-slate-700">
                      {off && !grossSec ? null : formatHrs(grossSec)}
                    </td>

                    <td className="py-2 px-4 whitespace-nowrap text-[13px]">
                      {arrival.text === '—' ? (
                        off ? null : <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.className.replace(/px-3 py-0\.5 rounded-full font-bold/, '')}`}>{status.label}</span>
                      ) : arrival.lateMinutes > 0 ? (
                        <span
                          title={`Expected ${arrival.expected} · arrived ${arrival.text}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 ring-1 ring-rose-100"
                        >
                          <Snail className="h-3.5 w-3.5" aria-hidden />
                          {describeMinutes(arrival.lateMinutes)} late
                        </span>
                      ) : arrival.earlyMinutes > 0 ? (
                        <span
                          title={`Expected ${arrival.expected} · arrived ${arrival.text}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100"
                        >
                          <Smile className="h-3.5 w-3.5" aria-hidden />
                          {describeMinutes(arrival.earlyMinutes)} early
                        </span>
                      ) : (
                        <span title={`Arrived ${arrival.text}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">On time</span>
                      )}
                    </td>

                    <td className="py-2 px-4 text-center">
                      <button
                        type="button"
                        data-att-log
                        onMouseEnter={(e) => openHover(record, e.currentTarget)}
                        onMouseLeave={closeHover}
                        onClick={(e) => {
                          e.stopPropagation();
                          openHover(record, e.currentTarget);
                        }}
                        className="mx-auto flex h-6 w-6 items-center justify-center rounded-full cursor-pointer"
                        title={status.label}
                        aria-label={`Day details (${status.label})`}
                      >
                        {logOk(record) ? (
                          <CheckCircle2 className="h-5 w-5 fill-emerald-500 stroke-white" />
                        ) : (
                          <AlertCircle className="h-5 w-5 fill-rose-500 stroke-white" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {hover &&
        createPortal(
          <div
            data-att-pop
            style={{ left: hover.x, top: hover.y, width: 272 }}
            onMouseEnter={keepHover}
            onMouseLeave={closeHover}
            className="fixed z-50 rounded-lg border border-[#E4E8EF] bg-white p-3.5 text-xs shadow-xl animate-in fade-in"
          >
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">General shift</p>
            <p className="mt-0.5 text-[13px] text-slate-800">{formatClock(resolveShift(shift).start)} – {formatClock(resolveShift(shift).end)}</p>
            <button
              type="button"
              onClick={() => {
                setHover(null);
                setSelectedRecordForDrawer(hover.record);
                setInsightDrawerDate(hover.record.date);
                setInsightDrawerMode('regularize');
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] text-[#1471DD] hover:underline cursor-pointer"
            >
              <Pencil className="h-3 w-3" /> Regularise
            </button>
            {sessionsOf(hover.record).map((ss, i, all) => (
              <div key={i} className="mt-3">
                <p className="text-[13px] text-slate-700">{all.length > 1 ? `Session ${i + 1}` : hover.record.check_in_location || 'Web clock-in'}</p>
                <div className="mt-1 flex items-center justify-between gap-3 text-[13px] text-slate-800">
                  <span className="flex items-center gap-1.5"><span className="text-emerald-500">↙</span>{ss.in}</span>
                  <span className="flex items-center gap-1.5"><span className="text-rose-500">↗</span>{ss.out ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>,
          document.body,
        )}

      {mapFor?.record.latitude != null && mapFor.record.longitude != null &&
        createPortal(
          <div style={{ left: mapFor.x, top: mapFor.y, width: 320 }} className="pointer-events-none fixed z-50 overflow-hidden rounded-lg border border-[#E4E8EF] bg-white shadow-xl">
            <iframe
              title="Punch location"
              className="h-44 w-full"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapFor.record.longitude - 0.004}%2C${mapFor.record.latitude - 0.003}%2C${mapFor.record.longitude + 0.004}%2C${mapFor.record.latitude + 0.003}&layer=mapnik&marker=${mapFor.record.latitude}%2C${mapFor.record.longitude}`}
            />
          </div>,
          document.body,
        )}

      {/* Phones: one card per day instead of a wide table */}
      <ul className="md:hidden space-y-2.5">
        {filteredRecords.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-[#D4DCE6] py-10 text-center text-sm text-slate-400">
            No activity records found in this range.
          </li>
        ) : (
          pagedRecords.map((record) => {
            const arrival = getArrivalInfo(record);
            const status = getStatusBadge(record);
            const pct = getEffectivePercentage(record.production_seconds);
            const grossSec = (record.production_seconds || 0) + (record.break_seconds || 0);
            return (
              <li key={record.date}>
                <button
                  type="button"
                  onClick={() => handleOpenInsight(record)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition active:scale-[0.99] ${
                    selectedDate === record.date ? 'border-[#5B4CF8]/40 bg-indigo-50/50' : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#1E293B]">{formatDateColumn(record.date)}</span>
                    <span className={`text-[10px] uppercase tracking-wider ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#5B4CF8] to-[#6C63FF]" style={{ width: `${pct}%` }} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effective</dt>
                      <dd className="mt-0.5 font-mono font-semibold text-[#1E293B]">{formatHoursShort(record.production_seconds)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross</dt>
                      <dd className="mt-0.5 font-mono font-medium text-[#64748B]">{formatHoursShort(grossSec)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Arrival</dt>
                      <dd className="mt-0.5 font-mono font-semibold text-[#1E293B]">
                        {arrival.text}
                        {arrival.lateMinutes > 0 && (
                          <span className="block text-[10px] font-bold uppercase text-rose-500">{describeMinutes(arrival.lateMinutes)} late</span>
                        )}
                        {arrival.lateMinutes === 0 && arrival.earlyMinutes > 0 && (
                          <span className="block text-[10px] font-bold uppercase text-emerald-600">{describeMinutes(arrival.earlyMinutes)} early</span>
                        )}
                        {overtimeMinutes(record, shift) > 0 && (
                          <span className="block text-[10px] font-bold uppercase text-orange-600">{hm(overtimeMinutes(record, shift))} OT</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {filteredRecords.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#E4E8EF]">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredRecords.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizes={[10, 15, 31]}
          />
        </div>
      )}

      {/* Attendance Insight & Regularization Drawer (Image 2 & Image 3) */}
      {insightDrawerDate && (
        <AttendanceInsightDrawer
          isOpen={Boolean(insightDrawerDate)}
          date={insightDrawerDate}
          record={selectedRecordForDrawer}
          shift={shift}
          initialMode={insightDrawerMode}
          empId={viewingEmpId}
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
