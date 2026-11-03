import React from 'react';
import { Modal } from './Modal';
import { AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

export interface BlockerItem {
  company_id?: number;
  company_code?: string | null;
  name?: string;
  reason: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  blockers?: BlockerItem[] | null;
  blockerTitle?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  blockers,
  blockerTitle = 'This action is blocked:',
}) => {
  const hasBlockers = blockers && blockers.length > 0;

  const iconColors = {
    danger: 'bg-rose-50 text-rose-600 ring-rose-50',
    warning: 'bg-amber-50 text-amber-600 ring-amber-50',
    primary: 'bg-blue-50 text-blue-600 ring-blue-50',
  }[variant];

  const buttonColors = {
    danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
  }[variant];

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        {hasBlockers ? 'Close' : cancelLabel}
      </button>
      {!hasBlockers && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-xs cursor-pointer ${buttonColors} disabled:opacity-50`}
        >
          {isLoading ? 'Processing...' : confirmLabel}
        </button>
      )}
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} footer={footer} size="sm">
      <div className="flex flex-col items-center text-center p-2">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ring-8 ${iconColors}`}>
          {hasBlockers ? (
            <ShieldAlert className="w-6 h-6" />
          ) : variant === 'danger' ? (
            <AlertCircle className="w-6 h-6" />
          ) : (
            <AlertTriangle className="w-6 h-6" />
          )}
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">{message}</p>

        {hasBlockers && (
          <div className="w-full text-left bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5 space-y-2 mt-1">
            <p className="text-xs font-semibold text-rose-900">{blockerTitle}</p>
            <ul className="text-xs text-rose-800 space-y-1 list-disc pl-4">
              {blockers.map((b, idx) => (
                <li key={idx}>
                  {b.name ? <span className="font-medium">{b.name}: </span> : null}
                  {b.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};
