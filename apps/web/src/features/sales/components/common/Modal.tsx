import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useSheetDrag } from '../../hooks/useSheetDrag';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const sheet = useSheetDrag(onClose);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-3xl',
    '2xl': 'sm:max-w-4xl',
    '4xl': 'sm:max-w-5xl',
    full: 'sm:max-w-full sm:m-4',
  }[size];

  // Rendered on <body>, so the backdrop always covers the whole window: sidebar and top bar included.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[100] overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ opacity: sheet.backdropOpacity, transition: sheet.dragging ? 'none' : 'opacity 160ms' }}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
        <div
          ref={modalRef}
          style={sheet.panelStyle}
          className={`w-full ${sizeClasses} transform rounded-t-2xl sm:rounded-2xl bg-white text-left shadow-xl transition-all border border-slate-200/80 flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-200`}
        >
          {/* Grab handle (phones): drag it, or the header, down to close */}
          <div className="touch-none sm:hidden" {...sheet.handlers}>
            <div className="flex cursor-grab justify-center pb-1 pt-2.5 active:cursor-grabbing" aria-hidden="true">
              <span className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
          </div>

          {/* Header */}
          {(title || subtitle) && (
            <div className="flex touch-none items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0 sm:touch-auto" {...sheet.handlers}>
              <div className="pr-4">
                {title && (
                  <h3 id="modal-title" className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-slate-700 text-sm">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
