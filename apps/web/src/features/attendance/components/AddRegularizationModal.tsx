import React, { useState, useEffect } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { createRegularizationRequest } from '../api/attendance.api';
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
  'Missing Check-in',
  'Missing Check-out',
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

  const [attendanceDate, setAttendanceDate] = useState(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [requestType, setRequestType] = useState('Missing Check-out');
  const [currentCheckIn, setCurrentCheckIn] = useState(initialCheckIn || '--');
  const [currentCheckOut, setCurrentCheckOut] = useState(initialCheckOut || '--');
  const [requestedCheckIn, setRequestedCheckIn] = useState('09:30');
  const [requestedCheckOut, setRequestedCheckOut] = useState('18:30');
  const [reason, setReason] = useState('Forgot to Punch');
  const [remarks, setRemarks] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialDate) setAttendanceDate(initialDate);
    if (initialCheckIn) setCurrentCheckIn(initialCheckIn);
    if (initialCheckOut) setCurrentCheckOut(initialCheckOut);
  }, [initialDate, initialCheckIn, initialCheckOut]);

  if (!isOpen) return null;

  const isCheckInRequired = requestType !== 'Missing Check-out';
  const isCheckOutRequired = requestType !== 'Missing Check-in';
  const isAttachmentRequired = requestType === 'On Duty / Field Work';

  const employeeLabel = user
    ? `${user.name} (EMP-${String(user.emp_id).padStart(4, '0')})`
    : 'Current Employee';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!attendanceDate) {
      setError('Please select an attendance date');
      return;
    }

    if (remarks.trim().length < 10) {
      setError('Remarks must be at least 10 characters long');
      return;
    }

    if (remarks.trim().length > 250) {
      setError('Remarks cannot exceed 250 characters');
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
      const payload: CreateRegularizationPayload = {
        emp_id: user?.emp_id,
        work_date: attendanceDate,
        request_type: requestType,
        current_check_in_at: currentCheckIn !== '--' ? currentCheckIn : null,
        current_check_out_at: currentCheckOut !== '--' ? currentCheckOut : null,
        requested_check_in_at: isCheckInRequired ? `${attendanceDate}T${requestedCheckIn}:00.000Z` : null,
        requested_check_out_at: isCheckOutRequired ? `${attendanceDate}T${requestedCheckOut}:00.000Z` : null,
        reason,
        remarks: remarks.trim(),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Add Regularization Request
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Request ID, Employee, Attendance Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Request ID
              </label>
              <input
                type="text"
                disabled
                value="REG-(auto)"
                className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Employee <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled
                value={employeeLabel}
                className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Attendance Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Row 2: Request Type, Current Check-in, Current Check-out */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Request Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {REQUEST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current Check-in
              </label>
              <input
                type="text"
                disabled
                value={currentCheckIn}
                className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current Check-out
              </label>
              <input
                type="text"
                disabled
                value={currentCheckOut}
                className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Row 3: Requested Check-in, Requested Check-out, Reason */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Requested Check-in {isCheckInRequired && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="time"
                disabled={!isCheckInRequired}
                value={isCheckInRequired ? requestedCheckIn : ''}
                onChange={(e) => setRequestedCheckIn(e.target.value)}
                className={`w-full rounded border px-3 py-2 text-sm focus:outline-none ${
                  isCheckInRequired
                    ? 'border-slate-300 bg-white text-slate-800 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                    : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/60'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Requested Check-out {isCheckOutRequired && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="time"
                disabled={!isCheckOutRequired}
                value={isCheckOutRequired ? requestedCheckOut : ''}
                onChange={(e) => setRequestedCheckOut(e.target.value)}
                className={`w-full rounded border px-3 py-2 text-sm focus:outline-none ${
                  isCheckOutRequired
                    ? 'border-slate-300 bg-white text-slate-800 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                    : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800/60'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Remarks */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Remarks <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] ${remarks.length < 10 || remarks.length > 250 ? 'text-amber-600' : 'text-slate-400'}`}>
                {remarks.length} / 250 characters (min 10)
              </span>
            </div>
            <textarea
              rows={3}
              required
              minLength={10}
              maxLength={250}
              placeholder="Left the office in a hurry and forgot to check out."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white p-3 text-sm text-slate-800 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Row 5: Attachment and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Attachment {isAttachmentRequired && <span className="text-rose-500">*</span>}
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Choose file</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachment(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                <span className="text-xs text-slate-500 truncate max-w-xs">
                  {attachment ? attachment.name : 'PDF / JPG / PNG, max 5 MB'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <input
                type="text"
                disabled
                value="Pending (after submit)"
                className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
