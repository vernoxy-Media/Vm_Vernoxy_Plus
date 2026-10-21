import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface HoldReasonModalProps {
  isOpen: boolean;
  taskTitle: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export const HoldReasonModal: React.FC<HoldReasonModalProps> = ({
  isOpen,
  taskTitle,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Hold reason is mandatory.');
      return;
    }
    if (trimmed.length > 500) {
      setError('Hold reason cannot exceed 500 characters.');
      return;
    }
    onConfirm(trimmed);
    setReason('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Move Task to Hold</h3>
            <p className="text-xs text-slate-500 truncate max-w-[260px]">{taskTitle}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-3">
          Please state the reason why this task is being put on hold. This will be recorded in the task history and displayed to team members.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Hold Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              maxLength={500}
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Waiting on client API keys and database credentials..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
              <span>{error ? <span className="text-rose-600 font-medium">{error}</span> : 'Mandatory field'}</span>
              <span>{reason.length}/500</span>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold rounded-xl text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors cursor-pointer"
            >
              Confirm Hold
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
