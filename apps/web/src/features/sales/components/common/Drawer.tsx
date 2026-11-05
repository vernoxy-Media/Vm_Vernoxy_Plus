import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useSheetDrag } from '../../hooks/useSheetDrag';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
  /** On phones, cover the whole screen instead of a bottom sheet. */
  fullOnPhone?: boolean;
}

/**
 * A panel for filters and quick forms.
 * Phones: a bottom sheet (rounded top, grab handle, up to 92% of the screen).
 * Larger screens: a floating panel from the right edge.
 */
export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, subtitle, children, footer, size = 'md', fullOnPhone = false }) => {
  const panel = useRef<HTMLDivElement>(null);
  const sheet = useSheetDrag(onClose);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const width = { md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-xl' }[size];

  // Rendered on <body>, so the backdrop always covers the whole window: sidebar and top bar included.
  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ opacity: sheet.backdropOpacity, transition: sheet.dragging ? 'none' : 'opacity 160ms' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panel}
        tabIndex={-1}
        style={sheet.panelStyle}
        className={`absolute flex flex-col bg-white shadow-2xl outline-hidden animate-in slide-in-from-bottom duration-300 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:rounded-none sm:rounded-l-3xl sm:border-l sm:border-slate-200/70 sm:slide-in-from-right ${
          fullOnPhone ? 'inset-0 max-h-none rounded-none' : 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl'
        } ${width}`}
      >
        {/* Grab handle and header: drag them down to close (phones) */}
        <div className="touch-none sm:touch-auto" {...sheet.handlers}>
          <div className="flex cursor-grab justify-center pb-1 pt-2.5 active:cursor-grabbing sm:hidden" aria-hidden="true">
            <span className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>

        <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-2 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-100 px-5 py-5 text-sm text-slate-700 sm:px-6">
          <div className="space-y-6">{children}</div>
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:rounded-bl-3xl sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
};
