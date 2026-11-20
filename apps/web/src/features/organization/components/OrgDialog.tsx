import React, { useEffect } from 'react';
import { AlertCircle, Loader2, X, type LucideIcon } from 'lucide-react';

/** Shared look for the Departments / Designations create, edit and delete popups. */

export const orgInputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60';

export const orgTextareaCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60';

export const OrgField: React.FC<{
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, htmlFor, required, hint, children }) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-700">
      {label}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const OrgToggle: React.FC<{
  id?: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}> = ({ id, label, description, checked, disabled, onChange }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
    <div className="min-w-0">
      <span className="block text-sm font-semibold text-slate-800">{label}</span>
      {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
    </div>
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-hidden focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  </div>
);

export const OrgError: React.FC<{ message?: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  ) : null;

interface OrgDialogProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** When given the dialog is a <form> and the primary button submits it. */
  onSubmit?: (e: React.FormEvent) => void;
  /** For confirm dialogs without a form. */
  onConfirm?: () => void;
  submitLabel: string;
  submitId?: string;
  pending?: boolean;
  danger?: boolean;
  error?: string | null;
  children?: React.ReactNode;
}

export const OrgDialog: React.FC<OrgDialogProps> = ({
  icon: Icon,
  title,
  subtitle,
  onClose,
  onSubmit,
  onConfirm,
  submitLabel,
  submitId,
  pending,
  danger,
  error,
  children,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !pending && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  const accent = danger
    ? { chip: 'from-rose-50 to-rose-100 text-rose-600 ring-rose-200', btn: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25 focus:ring-rose-600/25' }
    : { chip: 'from-blue-50 to-indigo-50 text-blue-600 ring-blue-100', btn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 shadow-blue-600/25 focus:ring-blue-600/25' };

  const Body: React.ElementType = onSubmit ? 'form' : 'div';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm animate-in fade-in duration-150 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !pending && onClose()}
    >
      <Body
        {...(onSubmit ? { onSubmit } : {})}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl animate-in zoom-in-95 duration-150 sm:rounded-3xl"
      >
        <div className="flex items-start gap-3.5 border-b border-slate-100 px-6 pb-4 pt-6">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-inset ${accent.chip}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold tracking-tight text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={pending}
            className="-mr-1 -mt-1 cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <OrgError message={error} />
          {children}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-10 cursor-pointer rounded-xl px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-200/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type={onSubmit ? 'submit' : 'button'}
            id={submitId}
            onClick={onSubmit ? undefined : onConfirm}
            disabled={pending}
            className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-5 text-[13px] font-semibold text-white shadow-md transition focus:outline-hidden focus:ring-4 active:scale-[0.98] disabled:opacity-60 ${accent.btn}`}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </Body>
    </div>
  );
};
