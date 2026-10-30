import React, { useState, useEffect } from 'react';
import { X, FileText, Send, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { createRegularizationRequest, fetchDayDetail } from '../api/attendance.api';
import { useLookupsQuery } from '../../../hooks/use-master-data';
import type { CreateRegularizationPayload } from '../types/attendance.types';

interface AddRegularizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string;
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
}

const REQUEST_TYPES = [
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

export const AddRegularizationModal: React.FC<AddRegularizationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
  initialCheckIn,
  initialCheckOut,
}) => {
  const { user } = useAuth();

  const { data: requestTypeOptions } = useLookupsQuery('request_type');
  const { data: reasonOptions } = useLookupsQuery('attendance_reason');

  const requestTypes =
    requestTypeOptions && requestTypeOptions.length > 0
      ? requestTypeOptions.map((o) => o.label)
      : REQUEST_TYPES;

  const reasons =
    reasonOptions && reasonOptions.length > 0
      ? reasonOptions.map((o) => o.label)
      : REASONS;

  const [attendanceDate, setAttendanceDate] = useState(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [requestType, setRequestType] = useState('Missing Clock Out');
  const [currentCheckIn, setCurrentCheckIn] = useState(initialCheckIn || '--');
  const [currentCheckOut, setCurrentCheckOut] = useState(initialCheckOut || '--');
  const [currentCheckInRaw, setCurrentCheckInRaw] = useState<string | null>(initialCheckIn || null);
  const [currentCheckOutRaw, setCurrentCheckOutRaw] = useState<string | null>(initialCheckOut || null);
  const [requestedCheckIn, setRequestedCheckIn] = useState('09:30');
  const [requestedCheckOut, setRequestedCheckOut] = useState('18:30');
  const [reason, setReason] = useState('Forgot to Punch');
  const [otherReason, setOtherReason] = useState('');
  const [reasonDescription, setReasonDescription] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOtherReason = reason.trim().toLowerCase() === 'other';

  useEffect(() => {
    if (initialDate) setAttendanceDate(initialDate);
    if (initialCheckIn) {
      setCurrentCheckIn(initialCheckIn);
      setCurrentCheckInRaw(initialCheckIn);
      setRequestedCheckIn(initialCheckIn.slice(0, 5));
    }
    if (initialCheckOut) {
      setCurrentCheckOut(initialCheckOut);
      setCurrentCheckOutRaw(initialCheckOut);
      setRequestedCheckOut(initialCheckOut.slice(0, 5));
    }
    if (!isOpen) {
      setOtherReason('');
      setReasonDescription('');
      setError(null);
    }
  }, [isOpen, initialDate, initialCheckIn, initialCheckOut]);

  // Dynamically fetch day details when attendanceDate changes
  useEffect(() => {
    if (!isOpen || !attendanceDate) return;
    let isCancelled = false;

    const loadDayDetail = async () => {
      try {
        const detail = await fetchDayDetail(attendanceDate);
        if (isCancelled || !detail) return;

        if (detail.punched_in_at) {
          setCurrentCheckInRaw(detail.punched_in_at);
          const inDate = new Date(detail.punched_in_at);
          const timeStr = !isNaN(inDate.getTime())
            ? inDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : detail.punched_in_at;
          setCurrentCheckIn(timeStr);
          setRequestedCheckIn(timeStr);
        } else {
          setCurrentCheckInRaw(null);
          setCurrentCheckIn('--');
        }

        if (detail.punched_out_at) {
          setCurrentCheckOutRaw(detail.punched_out_at);
          const outDate = new Date(detail.punched_out_at);
          const timeStr = !isNaN(outDate.getTime())
            ? outDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : detail.punched_out_at;
          setCurrentCheckOut(timeStr);
          setRequestedCheckOut(timeStr);
        } else {
          setCurrentCheckOutRaw(null);
          setCurrentCheckOut('--');
        }
      } catch {
        if (!isCancelled) {
          setCurrentCheckIn('--');
          setCurrentCheckOut('--');
          setCurrentCheckInRaw(null);
          setCurrentCheckOutRaw(null);
        }
      }
    };

    loadDayDetail();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, attendanceDate]);

  if (!isOpen) return null;

  const isCheckInRequired =
    requestType === 'Missing Clock In' ||
    requestType === 'Both Clock In & Out' ||
    requestType === 'Incorrect Time' ||
    requestType === 'Full Day Missed' ||
    requestType === 'On Duty / Field Work';

  const isCheckOutRequired =
    requestType === 'Missing Clock Out' ||
    requestType === 'Both Clock In & Out' ||
    requestType === 'Incorrect Time' ||
    requestType === 'Full Day Missed' ||
    requestType === 'On Duty / Field Work';

  const isAttachmentRequired = requestType === 'On Duty / Field Work';

  const formatIsoTime = (dateStr: string, timeStr: string) => {
    return `${dateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}.000Z`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!attendanceDate) {
      setError('Please select an attendance date');
      return;
    }

    if (reasonDescription.trim().length > 0 && reasonDescription.trim().length < 5) {
      setError('Please provide a clearer reason for adjustment');
      return;
    }

    if (isAttachmentRequired && !attachment) {
      setError('Attachment is mandatory for On Duty / Field Work requests');
      return;
    }

    if (isCheckInRequired && isCheckOutRequired) {
      if (requestedCheckOut <= requestedCheckIn) {
        setError('Requested check-out must be later than requested check-in');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const finalReason = isOtherReason && otherReason.trim()
        ? `Other: ${otherReason.trim()}`
        : reason;

      const fullReasonText = reasonDescription.trim()
        ? `${finalReason} - ${reasonDescription.trim()}`
        : finalReason;

      const payload: CreateRegularizationPayload = {
        emp_id: user?.emp_id,
        work_date: attendanceDate,
        request_type: requestType,
        current_check_in_at: currentCheckInRaw || (currentCheckIn !== '--' ? currentCheckIn : null),
        current_check_out_at: currentCheckOutRaw || (currentCheckOut !== '--' ? currentCheckOut : null),
        requested_check_in_at: isCheckInRequired ? formatIsoTime(attendanceDate, requestedCheckIn) : null,
        requested_check_out_at: isCheckOutRequired ? formatIsoTime(attendanceDate, requestedCheckOut) : null,
        reason: fullReasonText,
        remarks: reasonDescription.trim() || finalReason,
        attachment_name: attachment ? attachment.name : null,
      };

      await createRegularizationRequest(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit regularization request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Date Header formatted: "October 24, 2026"
  const [y, m, d] = attendanceDate.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const fullDateFormatted = dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

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
          {/* Header matching Image 3 */}
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
                <span>SHIFT ● 09:00 AM — 05:30 PM</span>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close form"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Form Body matching Image 3 */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Form Title Banner */}
              <div className="flex items-center gap-2.5 pb-1">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Regularization Form
                </h3>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Attendance Date (editable if needed) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  ATTENDANCE DATE <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs cursor-pointer font-mono"
                />
              </div>

              {/* MISSING PUNCH TYPE * */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  MISSING PUNCH TYPE <span className="text-rose-500">*</span>
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs cursor-pointer"
                >
                  {requestTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* CORRECT IN TIME */}
              {isCheckInRequired && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    CORRECT IN TIME <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={requestedCheckIn}
                    onChange={(e) => setRequestedCheckIn(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs font-mono"
                  />
                </div>
              )}

              {/* CORRECT OUT TIME */}
              {isCheckOutRequired && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    CORRECT OUT TIME <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={requestedCheckOut}
                    onChange={(e) => setRequestedCheckOut(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs font-mono"
                  />
                </div>
              )}

              {/* REASON CATEGORY */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  REASON CATEGORY <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 transition shadow-2xs cursor-pointer"
                >
                  {reasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* SPECIFY REASON IF OTHER */}
              {isOtherReason && (
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

              {/* Reason for Adjustment (Textarea) */}
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

              {/* Attachment / Proof (Optional) */}
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

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
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
          </div>

          {/* Footer matching Image 3 */}
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
