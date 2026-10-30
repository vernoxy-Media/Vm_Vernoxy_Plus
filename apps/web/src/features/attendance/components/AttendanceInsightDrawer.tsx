import React, { useState, useEffect, useMemo } from 'react';
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
import { useAuth } from '../../../context/AuthContext';
import { useDayDetail } from '../hooks/use-attendance';
import { createRegularizationRequest } from '../api/attendance.api';
import { useLookupsQuery } from '../../../hooks/use-master-data';
import type { DayRecord, CreateRegularizationPayload } from '../types/attendance.types';

export interface AttendanceInsightDrawerProps {
  isOpen: boolean;
  date: string | null; // "YYYY-MM-DD"
  record?: DayRecord | null;
  initialMode?: 'insight' | 'regularize';
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
  initialMode = 'insight',
  onClose,
  onSuccessRegularization,
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'insight' | 'regularize'>(initialMode);
  const { data: dayDetail } = useDayDetail(isOpen && date ? date : null);

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
    dayDetail?.production_seconds ??
    record?.production_seconds ??
    0;

  const breakSeconds =
    dayDetail?.break_seconds ??
    record?.break_seconds ??
    0;

  const grossSeconds = productionSeconds + breakSeconds;

  const formatHoursDisplay = (sec: number) => {
    if (!sec || sec <= 0) return '0:0hrs';
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    if (minutes === 0) return `${hours}h 00m`;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  };

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

  // Shift Timing (reference screenshot shows: SHIFT ● 09:00 AM — 05:30 PM)
  const shiftDisplay = '09:00 AM — 05:30 PM';

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
        emp_id: user?.emp_id,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden select-none"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250">
          {/* Top Section / Header matching reference images 2 & 3 */}
          <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                ATTENDANCE INSIGHT
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                {fullDateFormatted}
              </h2>
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 mt-1 tracking-wide">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
                <span>SHIFT ● {shiftDisplay}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close insight"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {mode === 'insight' ? (
              /* ================= MODE 1: ATTENDANCE INSIGHT (Image 2) ================= */
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 5 Metric Cards in Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  {/* Card 1: STATUS */}
                  <div className="bg-[#f8fafc] border border-slate-100/90 rounded-2xl p-4 transition-all">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      STATUS
                    </span>
                    <span className="block text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                      {statusLabel}
                    </span>
                  </div>

                  {/* Card 2: EFFECTIVE */}
                  <div className="bg-[#f8fafc] border border-slate-100/90 rounded-2xl p-4 transition-all">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      EFFECTIVE
                    </span>
                    <span className="block text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                      {formatHoursDisplay(productionSeconds)}
                    </span>
                  </div>

                  {/* Card 3: GROSS */}
                  <div className="bg-[#f8fafc] border border-slate-100/90 rounded-2xl p-4 transition-all">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      GROSS
                    </span>
                    <span className="block text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                      {formatHoursDisplay(grossSeconds)}
                    </span>
                  </div>

                  {/* Card 4: PRODUCTIVE */}
                  <div className="bg-[#f8fafc] border border-slate-100/90 rounded-2xl p-4 transition-all">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      PRODUCTIVE
                    </span>
                    <span className="block text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                      {formatHoursDisplay(productionSeconds)}
                    </span>
                  </div>

                  {/* Card 5: BREAK */}
                  <div className="bg-[#f8fafc] border border-slate-100/90 rounded-2xl p-4 col-span-1 transition-all">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      BREAK
                    </span>
                    <span className="block text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                      {formatHoursDisplay(breakSeconds)}
                    </span>
                  </div>
                </div>

                {/* ACTIVITY TIMELINE Header Row with Regularize Button */}
                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                    ACTIVITY TIMELINE
                  </h3>
                  <button
                    onClick={() => setMode('regularize')}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 hover:bg-rose-100 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 stroke-[2.3]" />
                    <span>Regularize</span>
                  </button>
                </div>

                {/* SYSTEM PUNCH RECORDS Box (matching reference image dashed container) */}
                <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-white text-center">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                    SYSTEM PUNCH RECORDS
                  </div>

                  <div className="flex items-center justify-center gap-8 py-1">
                    {/* Arrival */}
                    <div className="text-center min-w-[90px]">
                      <div className="font-mono text-base font-extrabold text-slate-800 tracking-tight">
                        {arrivalDisplay}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mt-0.5">
                        ARRIVAL
                      </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="w-[1px] h-8 bg-slate-200" />

                    {/* Departure */}
                    <div className="text-center min-w-[90px]">
                      <div className="font-mono text-base font-extrabold text-slate-800 tracking-tight">
                        {departureDisplay}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mt-0.5">
                        DEPARTURE
                      </div>
                    </div>
                  </div>

                  {/* Punch Location Note (Valsad by default) */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location: Valsad</span>
                  </div>
                </div>

                {/* Timeline Events detail if available */}
                {dayDetail?.timeline && dayDetail.timeline.length > 0 && (
                  <div className="pt-2 space-y-3">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Detailed Activity Log
                    </div>
                    <div className="space-y-2.5">
                      {dayDetail.timeline.map((event, idx) => {
                        let Icon = Clock;
                        let iconBg = 'bg-slate-100 text-slate-600';
                        if (event.type === 'punch_in') {
                          Icon = LogIn;
                          iconBg = 'bg-emerald-50 text-emerald-600';
                        } else if (event.type === 'break_start') {
                          Icon = Coffee;
                          iconBg = 'bg-rose-50 text-rose-600';
                        } else if (event.type === 'break_end') {
                          Icon = Play;
                          iconBg = 'bg-blue-50 text-blue-600';
                        } else if (event.type === 'punch_out') {
                          Icon = LogOut;
                          iconBg = 'bg-rose-50 text-rose-600';
                        }

                        return (
                          <div
                            key={event.id || idx}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-slate-800">{event.label}</span>
                            </div>
                            <span className="font-mono font-semibold text-slate-500">
                              {event.display_time}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
    </div>
  );
};
