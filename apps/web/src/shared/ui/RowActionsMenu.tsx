import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, type LucideIcon } from 'lucide-react';

export interface RowAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  /** Red styling for destructive actions. */
  danger?: boolean;
  /** Shown greyed out; `hint` says why. */
  disabled?: boolean;
  hint?: string;
}

interface RowActionsMenuProps {
  actions: RowAction[];
  label?: string;
  id?: string;
}

const MENU_WIDTH = 192;

/**
 * A three-dots button with a small menu. The menu is drawn in a portal with fixed
 * positioning so a scrolling table never clips it.
 */
export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({ actions, label = 'Row actions', id }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight ?? actions.length * 40 + 12;
    const below = r.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, r.top - height - 6) : below;
    const left = Math.min(Math.max(8, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    setPos({ top, left });
  }, [open, actions.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open, close]);

  if (actions.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`rounded-lg p-2 transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
          open ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
        }`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: MENU_WIDTH }}
            className="fixed z-[70] origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-100"
          >
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  role="menuitem"
                  disabled={a.disabled}
                  title={a.disabled ? a.hint : undefined}
                  onClick={() => {
                    close();
                    a.onClick();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    a.danger ? 'text-rose-600 hover:bg-rose-50 disabled:hover:bg-transparent' : 'text-slate-700 hover:bg-slate-50 disabled:hover:bg-transparent'
                  }`}
                >
                  {Icon && <Icon className={`h-4 w-4 shrink-0 ${a.danger ? 'text-rose-500' : 'text-slate-400'}`} />}
                  {a.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};
