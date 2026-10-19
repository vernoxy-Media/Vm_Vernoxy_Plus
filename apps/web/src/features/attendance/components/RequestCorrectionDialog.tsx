import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import type { CorrectionRequestPayload } from '../types/attendance.types';
import { useSubmitCorrection } from '../hooks/use-attendance';
import { CorrectionFormFields } from './CorrectionFormFields';

export interface RequestCorrectionDialogProps {
  isOpen: boolean;
  date: string;
  defaultPunchIn?: string | null;
  defaultPunchOut?: string | null;
  defaultBreakMinutes?: number;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const RequestCorrectionDialog: React.FC<RequestCorrectionDialogProps> = ({
  isOpen,
  date,
  defaultPunchIn,
  defaultPunchOut,
  defaultBreakMinutes = 60,
  onClose,
  onSuccess,
}) => {
  const [punchIn, setPunchIn] = useState('10:00');
  const [punchOut, setPunchOut] = useState('19:00');
  const [breakMinutes, setBreakMinutes] = useState(defaultBreakMinutes);
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultPunchIn) setPunchIn(defaultPunchIn.slice(0, 5));
      if (defaultPunchOut) setPunchOut(defaultPunchOut.slice(0, 5));
      setBreakMinutes(defaultBreakMinutes);
      setReason('');
      setValidationError(null);
    }
  }, [isOpen, date, defaultPunchIn, defaultPunchOut, defaultBreakMinutes]);

  const mutation = useSubmitCorrection(() => {
    onSuccess?.('Correction request submitted successfully.');
    onClose();
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!punchIn || !punchOut) {
      setValidationError('Please specify both Punch In and Punch Out times.');
      return;
    }
    if (!reason.trim()) {
      setValidationError('Please provide a reason for the correction request.');
      return;
    }

    const payload: CorrectionRequestPayload = {
      date,
      punch_in: punchIn,
      punch_out: punchOut,
      break_minutes: Number(breakMinutes) || 0,
      reason: reason.trim(),
    };

    mutation.mutate(payload);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 id="correction-dialog-title" className="text-lg font-bold text-slate-900">
              Request Attendance Correction
            </h2>
            <p className="text-xs text-slate-500">
              Submit adjusted punch times for manager approval.
            </p>
          </div>
        </div>

        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <CorrectionFormFields
            date={date}
            punchIn={punchIn}
            setPunchIn={setPunchIn}
            punchOut={punchOut}
            setPunchOut={setPunchOut}
            breakMinutes={breakMinutes}
            setBreakMinutes={setBreakMinutes}
            reason={reason}
            setReason={setReason}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
