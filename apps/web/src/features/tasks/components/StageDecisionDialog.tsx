import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

export interface StageDecisionDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmButtonClass?: string;
  requiresNote?: boolean;
  onConfirm: (note: string) => void;
  onClose: () => void;
}

export const StageDecisionDialog: React.FC<StageDecisionDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmButtonClass = 'bg-rose-600 hover:bg-rose-700 text-white',
  requiresNote = false,
  onConfirm,
  onClose,
}) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresNote && !note.trim()) {
      setError('Please provide a reason or review note.');
      return;
    }
    onConfirm(note.trim());
    setNote('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
        </div>

        <p className="text-sm text-slate-600 mb-4">{description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Review Note {requiresNote ? '(Required)' : '(Optional)'}
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Explain the reason or requested changes..."
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-semibold rounded-xl shadow-xs transition-colors ${confirmButtonClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
