import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, type LucideIcon } from 'lucide-react';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Red, for things like Delete. A divider is drawn before the first danger item. */
  danger?: boolean;
  disabled?: boolean;
  /** Why it is disabled, shown under the label. */
  hint?: string;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
}

const MENU_WIDTH = 224; // 14rem

/**
 * A three-dot menu. The list is drawn on <body> so a table's scroll area can never clip it,
 * opens below the button (above it near the bottom of the screen), and closes on outside click, Esc and scroll.
 */
export const ActionMenu: React.FC<ActionMenuProps> = ({ items, label = 'More actions' }) => {
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const r = button.current.getBoundingClientRect();
    const height = menu.current?.offsetHeight ?? items.length * 44 + 16;
    const below = window.innerHeight - r.bottom;
    const top = below < height + 12 && r.top > height + 12 ? r.top - height - 6 : r.bottom + 6;
    const left = Math.min(Math.max(8, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    setPos({ top, left });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (menu.current?.contains(t) || button.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        button.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  const firstDanger = items.findIndex((i) => i.danger);

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => {
          setPos(null);
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
          open ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
        }`}
      >
        <MoreVertical className="h-[18px] w-[18px]" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: MENU_WIDTH, visibility: pos ? 'visible' : 'hidden' }}
            className="fixed z-[110] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
          >
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <React.Fragment key={item.key}>
                  {i === firstDanger && i > 0 && <div className="my-1 h-px bg-slate-100" role="separator" />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      close();
                      item.onSelect();
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      item.disabled
                        ? 'cursor-not-allowed text-slate-300'
                        : item.danger
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${item.disabled ? 'text-slate-300' : item.danger ? 'text-rose-500' : 'text-slate-400'}`} />
                    <span className="min-w-0">
                      <span className="block">{item.label}</span>
                      {item.disabled && item.hint && <span className="block text-[11px] font-normal text-slate-400">{item.hint}</span>}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};
