import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  Edit3,
  FileText,
  Send,
  AlertCircle,
  CheckCircle2,
  MapPin,
  LogIn,
  LogOut,
  Coffee,
  Play,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useDayDetail } from '../hooks/use-attendance';
import { resolveShift } from '../utils/attendance-metrics';
import { createRegularizationRequest } from '../api/attendance.api';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import type { DayRecord, CreateRegularizationPayload } from '../types/attendance.types';

export interface AttendanceInsightDrawerProps {
  isOpen: boolean;
  date: string | null; // "YYYY-MM-DD"
  record?: DayRecord | null;
  shift?: {
    shift_name?: string;
    start_time?: string;
    end_time?: string;
    late_arrival_grace_minutes?: number;
    early_exit_grace_minutes?: number;
  };
  initialMode?: 'insight' | 'regularize';
  /** Administrators looking at another employee: the day and any request are theirs */
  empId?: number | null;
  onClose: () => void;
  onSuccessRegularization?: (message: string) => void;
}

const PUNCH_TYPES = [
  'Missing Clock Out',
  'Missing Clock In',
  'Both Clock In & Out',
  'Incorrect Time',
  'Full Day Missed',
  'On Duty / Field Work',
];

const REASONS = [
  'Forgot to Punch',
  'Device or Network Issue',
  'Client Visit',
  'Work From Home',
  'Power Failure',
  'Other',
];

export const AttendanceInsightDrawer: React.FC<AttendanceInsightDrawerProps> = ({
  isOpen,
  date,
  record,
  shift,
  initialMode = 'insight',
  empId,
  onClose,
  onSuccessRegularization,
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'insight' | 'regularize'>(initialMode);
  const { data: dayDetail } = useDayDetail(isOpen && date ? date : null, empId);

  // Form states for Regularization Form
  const [missingPunchType, setMissingPunchType] = useState('Missing Clock Out');
  const [correctInTime, setCorrectInTime] = useState('09:30');
  const [correctOutTime, setCorrectOutTime] = useState('18:30');
  const [reasonCategory, setReasonCategory] = useState('Forgot to Punch');
  const [otherReason, setOtherReason] = useState('');
  const [reasonDescription, setReasonDescription] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Master data lookups
  const { data: requestTypeOptions } = useLookupsQuery('request_type');
  const { data: reasonOptions } = useLookupsQuery('attendance_reason');

  const punchTypeOptions = useMemo(() => {
    if (requestTypeOptions && requestTypeOptions.length > 0) {
      return requestTypeOptions.map((o) => o.label);
    }
    return PUNCH_TYPES;
  }, [requestTypeOptions]);

  const reasonList = useMemo(() => {
    if (reasonOptions && reasonOptions.length > 0) {
      return reasonOptions.map((o) => o.label);
    }
    return REASONS;
  }, [reasonOptions]);

  // Sync mode and reset state when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setFormError(null);
      setFormSuccess(null);
      setReasonDescription('');
      setRemarks('');
      setAttachment(null);
      setOtherReason('');

      // Auto-populate times based on record
      if (record?.punch_in) {
        setCorrectInTime(record.punch_in.slice(0, 5));
      } else {
        setCorrectInTime('09:30');
      }

      if (record?.punch_out) {
        setCorrectOutTime(record.punch_out.slice(0, 5));
      } else {
        setCorrectOutTime('18:30');
      }

      // Default punch type based on record state
      if (record?.punch_in && !record.punch_out) {
        setMissingPunchType('Missing Clock Out');
      } else if (!record?.punch_in && record?.punch_out) {
        setMissingPunchType('Missing Clock In');
      } else if (!record?.punch_in && !record?.punch_out) {
        setMissingPunchType('Full Day Missed');
      } else {
        setMissingPunchType('Missing Clock Out');
      }
    }
  }, [isOpen, date, record, initialMode]);

  // Escape key handler
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !date) return null;

  // Format Date for Header: e.g. "October 24, 2026"
  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const fullDateFormatted = dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  // Calculate Metrics Data (from dayDetail or record)
  const productionSeconds =
    record?.production_seconds ??
    dayDetail?.production_seconds ??
    0;

  const breakSeconds =
    record?.break_seconds ??
    dayDetail?.break_seconds ??
    0;

  const grossSeconds = productionSeconds + breakSeconds;

  // Status computation
  const statusLabel = useMemo(() => {
    if (record?.status_label) return record.status_label;
    if (record?.status === 'present') {
      return record.punch_out ? 'Clocked Out' : 'Present';
    }
    if (record?.status === 'holiday') return 'Holiday';
    if (record?.status === 'weekly_off') return 'Weekly Off';
    if (record?.status === 'absent') return 'Absent';
    if (record?.status === 'leave') return 'On Leave';
    if (record?.punch_in && !record?.punch_out) return 'Clocked In';
    if (record?.punch_in && record?.punch_out) return 'Clocked Out';
    return 'Not Clocked In';
  }, [record]);

  // Arrival / Departure
  const punchInTime =
    dayDetail?.punched_in_at ||
    record?.punch_in ||
    null;

  const punchOutTime =
    dayDetail?.punched_out_at ||
    record?.punch_out ||
    null;

  const formatTimeDisplay = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    if (timeStr.includes('T')) {
      const dt = new Date(timeStr);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    }
    // Parse HH:MM
    const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      let h = parseInt(match[1], 10);
      const min = match[2];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${min} ${ampm}`;
    }
    return timeStr;
  };

  const arrivalDisplay = formatTimeDisplay(punchInTime);
  const departureDisplay = formatTimeDisplay(punchOutTime);

  // Shift Timing (e.g. 09:30 AM — 06:30 PM)
  const shiftDisplay =
    shift?.start_time && shift?.end_time
      ? `${formatTimeDisplay(shift.start_time)} — ${formatTimeDisplay(shift.end_time)}`
      : '09:30 AM — 06:30 PM';

  // Submission handler for Regularization Form
  const handleSubmitRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const isCheckInRequired =
      missingPunchType === 'Missing Clock In' ||
      missingPunchType === 'Both Clock In & Out' ||
      missingPunchType === 'Incorrect Time' ||
      missingPunchType === 'Full Day Missed' ||
      missingPunchType === 'On Duty / Field Work';

    const isCheckOutRequired =
      missingPunchType === 'Missing Clock Out' ||
      missingPunchType === 'Both Clock In & Out' ||
      missingPunchType === 'Incorrect Time' ||
      missingPunchType === 'Full Day Missed' ||
      missingPunchType === 'On Duty / Field Work';

    const formatIsoTime = (dStr: string, time: string) => {
      const cleanTime = time.length === 5 ? `${time}:00` : time;
      return `${dStr}T${cleanTime}`;
    };

    const finalReason =
      reasonCategory.trim().toLowerCase() === 'other' && otherReason.trim()
        ? `Other: ${otherReason.trim()}`
        : reasonCategory;

    const fullReasonText = reasonDescription.trim()
      ? `${finalReason} - ${reasonDescription.trim()}`
      : finalReason;

    try {
      setIsSubmitting(true);
      const payload: CreateRegularizationPayload = {
        emp_id: empId ?? user?.emp_id,
        work_date: date,
        request_type: missingPunchType,
        current_check_in_at: punchInTime,
        current_check_out_at: punchOutTime,
        requested_check_in_at: isCheckInRequired ? formatIsoTime(date, correctInTime) : null,
        requested_check_out_at: isCheckOutRequired ? formatIsoTime(date, correctOutTime) : null,
        reason: fullReasonText,
        remarks: remarks.trim() || reasonDescription.trim(),
        attachment_name: attachment ? attachment.name : null,
      };

      await createRegularizationRequest(payload);
      setFormSuccess('Regularization request submitted successfully.');
      onSuccessRegularization?.('Regularization request submitted successfully.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit regularization request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOther = reasonCategory.toLowerCase() === 'other';

  const statusChip =
    record?.status === 'present' ? 'bg-emerald-100 text-emerald-700'
    : record?.status === 'absent' || record?.status === 'incomplete' || record?.status === 'short_hours' ? 'bg-rose-100 text-rose-700'
    : record?.status === 'leave' || record?.status === 'half_day' ? 'bg-violet-100 text-violet-700'
    : 'bg-slate-100 text-slate-600';

  const clockMinutes = (t: string | null) => {
    if (!t) return null;
    if (t.includes('T')) {
      const dt = new Date(t);
      return isNaN(dt.getTime()) ? null : dt.getHours() * 60 + dt.getMinutes();
    }
    const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const ap = m[3]?.toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h * 60 + parseInt(m[2], 10);
  };
  const inMin = clockMinutes(punchInTime);
  const outMin = clockMinutes(punchOutTime);
  const T0 = 360;
  const SPAN = 960;
  const barLeft = inMin === null ? 0 : Math.min(98, Math.max(0, ((inMin - T0) / SPAN) * 100));
  const barWidth = inMin === null || outMin === null ? 0 : Math.min(100 - barLeft, Math.max(1.5, ((outMin - inMin) / SPAN) * 100));
  const hrs = (sec: number) => {
    const t = Math.max(0, Math.round((sec || 0) / 60));
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} hrs`;
  };
  const leaveChip = record?.leave_half
    ? `${record.leave_half === 'FIRST_HALF' ? '1st' : '2nd'} half leave${record.leave_type ? ` · ${record.leave_type}` : ''}`
    : record?.status === 'leave'
    ? `Leave${record.leave_type ? ` · ${record.leave_type}` : ''}`
    : null;
  const sh = resolveShift(shift);
  const leaveWindow = record?.leave_half === 'FIRST_HALF' ? [sh.start, sh.split] : record?.leave_half === 'SECOND_HALF' ? [sh.split, sh.end] : null;
  const gapsMin = (record?.breaks || [])
    .map((b) => ({ s: clockMinutes(b.started_at), e: clockMinutes(b.ended_at) }))
    .filter((g): g is { s: number; e: number } => g.s !== null && g.e !== null && g.e > g.s);
  const punchPlace = record?.check_in_location || null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 z-50"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 z-50 pointer-events-none">
        <div className="w-screen max-w-md h-full bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250 pointer-events-auto">
          {/* Top Section / Header matching reference images 2 & 3 */}
          <div className="px-5 py-4 sm:px-6 border-b border-slate-200 flex items-start justify-between gap-3 bg-white shrink-0">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Attendance insight</div>
              <h2 className="mt-0.5 text-xl font-semibold text-slate-900 tracking-tight">{fullDateFormatted}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span>General Shift</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700">{shiftDisplay}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusChip}`}>{statusLabel}</span>
                {leaveChip && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">{leaveChip}</span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close insight"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {mode === 'insight' ? (
              /* ================= MODE 1: ATTENDANCE INSIGHT (Image 2) ================= */
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Hours summary */}
                <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {[
                    ['Effective hours', hrs(productionSeconds), 'text-sky-600'],
                    ['Gross hours', hrs(grossSeconds), 'text-slate-900'],
                    ['Break', hrs(breakSeconds), 'text-amber-600'],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="px-3 py-3.5 text-center">
                      <div className={`text-base sm:text-lg font-semibold tabular-nums ${tone}`}>{value}</div>
                      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Attendance visual */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attendance visual</h3>
                    <button
                      onClick={() => setMode('regularize')}
                      type="button"
                      className="inline-flex items-center gap-1.5 text-[13px] text-[#1471DD] hover:underline cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Regularise
                    </button>
                  </div>
                  <div
                    className="relative h-7 rounded-lg border border-slate-200 bg-slate-50"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(to right, #CBD5E1 0, #CBD5E1 1px, transparent 1px, transparent 6.25%)',
                    }}
                  >
                    {leaveWindow && (
                      <div
                        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-violet-400"
                        style={{ left: `${((leaveWindow[0] - T0) / SPAN) * 100}%`, width: `${((leaveWindow[1] - leaveWindow[0]) / SPAN) * 100}%` }}
                        title={record?.leave_half === 'FIRST_HALF' ? 'First half on leave' : 'Second half on leave'}
                      />
                    )}
                    {barWidth > 0 && (
                      <div
                        className="absolute top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-sm bg-sky-400"
                        style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                      >
                        {gapsMin.map((g, i) => (
                          <span
                            key={i}
                            className="absolute inset-y-0 bg-sky-100"
                            style={{ left: `${((g.s - (inMin as number)) / Math.max(1, (outMin as number) - (inMin as number))) * 100}%`, width: `${((g.e - g.s) / Math.max(1, (outMin as number) - (inMin as number))) * 100}%` }}
                          />
                        ))}
                      </div>
                    )}
                    {inMin !== null && barWidth === 0 && (
                      <span className="absolute top-1/2 h-3 w-1.5 -translate-y-1/2 rounded-sm bg-sky-400" style={{ left: `${barLeft}%` }} />
                    )}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>6 AM</span><span>10 AM</span><span>2 PM</span><span>6 PM</span><span>10 PM</span>
                  </div>
                </div>

                {/* Arrival / departure */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 p-3.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                      <LogIn className="h-3.5 w-3.5" /> Arrival
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{arrivalDisplay}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-rose-500">
                      <LogOut className="h-3.5 w-3.5" /> Departure
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{departureDisplay}</div>
                  </div>
                </div>
                {record?.latitude != null && record.longitude != null && (
                  <div className="-mt-1 overflow-hidden rounded-xl border border-slate-200">
                    <iframe
                      title="Punch location"
                      loading="lazy"
                      className="h-40 w-full"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${record.longitude - 0.004}%2C${record.latitude - 0.003}%2C${record.longitude + 0.004}%2C${record.latitude + 0.003}&layer=mapnik&marker=${record.latitude}%2C${record.longitude}`}
                    />
                  </div>
                )}
                {punchPlace && (
                  <div className="-mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{punchPlace}</span>
                  </div>
                )}

                {/* Activity log (vertical timeline) */}
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Activity log</h3>
                  {dayDetail?.timeline && dayDetail.timeline.length > 0 ? (
                    <ol className="relative ml-3 space-y-4 border-l border-slate-200 pl-6">
                      {dayDetail.timeline.map((event, idx) => {
                        let Icon = Clock;
                        let tone = 'bg-slate-100 text-slate-500';
                        if (event.type === 'punch_in') { Icon = LogIn; tone = 'bg-emerald-100 text-emerald-600'; }
                        else if (event.type === 'break_start') { Icon = Coffee; tone = 'bg-amber-100 text-amber-600'; }
                        else if (event.type === 'break_end') { Icon = Play; tone = 'bg-sky-100 text-sky-600'; }
                        else if (event.type === 'punch_out') { Icon = LogOut; tone = 'bg-rose-100 text-rose-600'; }
                        return (
                          <li key={event.id || idx} className="relative">
                            <span className={`absolute -left-[37px] top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${tone}`}>
                              <Icon className="h-3 w-3" />
                            </span>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-slate-800 capitalize">{event.label}</p>
                                {(event.break_type || event.reason) && (
                                  <p className="mt-0.5 text-xs text-slate-500">{[event.break_type, event.reason].filter(Boolean).join(' · ')}</p>
                                )}
                              </div>
                              <span className="shrink-0 text-xs tabular-nums text-slate-500">{event.display_time}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                      No clock-in or clock-out was recorded for this day.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* ================= MODE 2: REGULARIZATION FORM (Image 3) ================= */
              <form
                onSubmit={handleSubmitRegularization}
                className="space-y-5 animate-in fade-in duration-200"
              >
                {/* Form Title Banner with icon */}
                <div className="flex items-center gap-2.5 pb-1">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Regularization Form
                  </h3>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* Field 1: MISSING PUNCH TYPE * */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    MISSING PUNCH TYPE <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={missingPunchType}
                    onChange={(e) => setMissingPunchType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs cursor-pointer"
                  >
                    {punchTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 2: CORRECT IN / OUT TIME * */}
                {(missingPunchType === 'Missing Clock In' ||
                  missingPunchType === 'Both Clock In & Out' ||
                  missingPunchType === 'Incorrect Time' ||
                  missingPunchType === 'Full Day Missed' ||
                  missingPunchType === 'On Duty / Field Work') && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      CORRECT IN TIME <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        required
                        value={correctInTime}
                        onChange={(e) => setCorrectInTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {(missingPunchType === 'Missing Clock Out' ||
                  missingPunchType === 'Both Clock In & Out' ||
                  missingPunchType === 'Incorrect Time' ||
                  missingPunchType === 'Full Day Missed' ||
                  missingPunchType === 'On Duty / Field Work') && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      CORRECT OUT TIME <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        required
                        value={correctOutTime}
                        onChange={(e) => setCorrectOutTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Field 3: Reason Category (Extra field from development) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    REASON CATEGORY <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs cursor-pointer"
                  >
                    {reasonList.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* If Other Reason */}
                {isOther && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      SPECIFY REASON <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Specify your reason..."
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs"
                    />
                  </div>
                )}

                {/* Field 4: Reason for Adjustment (Textarea as shown in Image 3) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Reason for Adjustment
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Tell us why this record needs correction..."
                    value={reasonDescription}
                    onChange={(e) => setReasonDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs resize-none"
                  />
                </div>

                {/* Field 5: Attachment / Proof (Optional) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Attachment / Proof (Optional)
                  </label>
                  <div className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 flex items-center justify-between shadow-2xs">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setAttachment(file);
                      }}
                      className="text-xs text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    You can upload an image or PDF to support your request.
                  </p>
                </div>

                {/* Bottom Action Buttons matching Image 3 */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('insight')}
                    className="flex-1 min-h-[42px] px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Cancel</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 min-h-[42px] px-4 py-2.5 rounded-xl bg-[#52637a] hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Drawer Footer matching reference images 2 & 3 */}
          <div className="py-4 px-6 border-t border-slate-100 text-center shrink-0 bg-white">
            <p className="text-[11px] font-medium text-slate-400">
              © 2026 Vernoxy Systems ● Professional Attendance Mode
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
