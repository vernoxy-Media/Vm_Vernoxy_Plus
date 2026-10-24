import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { ProjectStatus } from '../types';

export interface ProjectStatusReasonModalProps {
  isOpen: boolean;
  projectName: string;
  targetStatus: ProjectStatus;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export const ProjectStatusReasonModal: React.FC<ProjectStatusReasonModalProps> = ({
  isOpen,
  projectName,
  targetStatus,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isHold = targetStatus === 'on_hold';
  const actionTitle = isHold ? 'Hold Project' : 'Cancel Project';
  const statusLabel = isHold ? 'On Hold' : 'Cancelled';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(`Reason is required when moving project to ${statusLabel}.`);
      return;
    }
    if (trimmed.length > 500) {
      setError('Reason cannot exceed 500 characters.');
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
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              isHold
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{actionTitle}</h3>
            <p className="text-xs text-slate-500 truncate max-w-[260px]">{projectName}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Please state the reason for moving this project to{' '}
          <strong className="text-slate-900">{statusLabel}</strong>. This note will be recorded in
          the project activity history.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              maxLength={500}
              required
              autoFocus
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                isHold
                  ? 'e.g. Awaiting client review on v1 design assets and wireframes...'
                  : 'e.g. Client paused business operations or scope terminated...'
              }
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
              <span>{error ? <span className="text-rose-600 font-medium">{error}</span> : 'Mandatory field'}</span>
              <span>{reason.length}/500</span>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-colors cursor-pointer ${
                isHold
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
              }`}
            >
              Confirm {statusLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
