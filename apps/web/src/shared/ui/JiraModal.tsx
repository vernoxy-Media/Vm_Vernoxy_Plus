import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/* Jira (Atlassian) form language, shared by every create / edit dialog. */

export const J_LABEL = 'mb-1 block text-[12px] font-semibold text-[#5E6C84]';
export const J_INPUT =
  'block w-full rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] px-2 py-1.5 text-[14px] leading-5 text-[#172B4D] placeholder:text-[#7A869A] transition-colors hover:bg-[#EBECF0] focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F4F5F7] disabled:text-[#7A869A]';
export const J_BTN_PRIMARY =
  'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[3px] bg-[color:var(--ac-main,#0052CC)] px-3 text-[14px] font-medium text-white transition hover:bg-[color:var(--ac-hover,#0065FF)] active:bg-[#0747A6] disabled:cursor-not-allowed disabled:opacity-50';
export const J_BTN_DANGER =
  'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[3px] bg-[#DE350B] px-3 text-[14px] font-medium text-white transition hover:bg-[#BF2600] disabled:cursor-not-allowed disabled:opacity-50';
export const J_BTN_SUBTLE =
  'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[3px] px-3 text-[14px] font-medium text-[#42526E] transition hover:bg-[rgba(9,30,66,0.08)] disabled:cursor-not-allowed disabled:opacity-50';

interface JFieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

/** A labelled form field with Jira's red asterisk, hint and error text. */
export const JField: React.FC<JFieldProps> = ({ label, required, optional, error, hint, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className={J_LABEL}>
      {label}
      {required && <span className="ml-0.5 text-[#DE350B]" aria-hidden>*</span>}
      {optional && <span className="ml-1.5 font-normal text-[#7A869A]">Optional</span>}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-[12px] text-[#5E6C84]">{hint}</p>}
    {error && <p role="alert" className="mt-1 text-[12px] text-[#BF2600]">{error}</p>}
  </div>
);

/** Red or yellow banner inside a form, like Jira's inline flags. */
export const JBanner: React.FC<{ tone?: 'error' | 'success' | 'info'; children: React.ReactNode }> = ({ tone = 'error', children }) => {
  const style = {
    error: 'bg-[#FFEBE6] text-[#BF2600] shadow-[inset_3px_0_0_#DE350B]',
    success: 'bg-[#E3FCEF] text-[#006644] shadow-[inset_3px_0_0_#36B37E]',
    info: 'bg-[#DEEBFF] text-[#0747A6] shadow-[inset_3px_0_0_var(--ac-main,#0052CC)]',
  }[tone];
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-[3px] px-3 py-2 text-[13px] ${style}`}>{children}</div>;
};

interface JiraModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Buttons for the sticky footer. */
  footer?: React.ReactNode;
  /** Left side of the footer, for example a "Create another" checkbox. */
  footerStart?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Wrap the body in a form so Enter submits. */
  onSubmit?: (e: React.FormEvent) => void;
  zIndex?: number;
}

const SIZES = { sm: 'sm:max-w-[440px]', md: 'sm:max-w-[600px]', lg: 'sm:max-w-[760px]' };

/**
 * Jira's modal dialog: dimmed overlay, flat white panel, a heading, a body that
 * scrolls and a footer that stays in view. On phones it becomes a full-height sheet.
 */
export const JiraModal: React.FC<JiraModalProps> = ({ title, onClose, children, footer, footerStart, size = 'md', onSubmit, zIndex = 60 }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const Shell: React.ElementType = onSubmit ? 'form' : 'div';

  return (
    <div className="fixed inset-0 flex items-end justify-center bg-[rgba(9,30,66,0.54)] sm:items-center sm:p-6" style={{ zIndex }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Shell
        {...(onSubmit ? { onSubmit, noValidate: true } : {})}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[100dvh] w-full flex-col bg-white shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] sm:max-h-[min(92dvh,900px)] sm:rounded-[3px] ${SIZES[size]}`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 px-6 pb-3 pt-5">
          <h2 className="text-[20px] font-medium leading-7 text-[#172B4D]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4 pt-1">{children}</div>
        {(footer || footerStart) && (
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 pb-5 pt-3">
            <div className="text-[14px] text-[#42526E]">{footerStart}</div>
            <div className="flex items-center gap-2">{footer}</div>
          </footer>
        )}
      </Shell>
    </div>
  );
};
