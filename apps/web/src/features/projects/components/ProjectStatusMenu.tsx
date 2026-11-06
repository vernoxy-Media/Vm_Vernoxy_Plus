import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { ProjectStatus } from '../types';

/** Status lozenges in Jira's style: small, bold, uppercase. */
export const STATUS_LOZENGE: Record<ProjectStatus, { label: string; cls: string; hover: string }> = {
  new: { label: 'New', cls: 'bg-[#DFE1E6] text-[#42526E]', hover: 'hover:bg-[#C1C7D0]' },
  planning: { label: 'Planning', cls: 'bg-[#EAE6FF] text-[#403294]', hover: 'hover:bg-[color:var(--ac-200,#C0B6F2)]' },
  in_progress: { label: 'In Progress', cls: 'bg-[#DEEBFF] text-[#0747A6]', hover: 'hover:bg-[#B3D4FF]' },
  pending: { label: 'Pending', cls: 'bg-[#FFF0B3] text-[#172B4D]', hover: 'hover:bg-[#FFE380]' },
  review: { label: 'Review', cls: 'bg-[#EAE6FF] text-[#403294]', hover: 'hover:bg-[color:var(--ac-200,#C0B6F2)]' },
  delivered: { label: 'Delivered', cls: 'bg-[#E3FCEF] text-[#006644]', hover: 'hover:bg-[#ABF5D1]' },
  on_hold: { label: 'On Hold', cls: 'bg-[#FFEBE6] text-[#BF2600]', hover: 'hover:bg-[#FFBDAD]' },
  cancelled: { label: 'Cancelled', cls: 'bg-[#DFE1E6] text-[#5E6C84]', hover: 'hover:bg-[#C1C7D0]' },
};

const ORDER: ProjectStatus[] = ['new', 'planning', 'in_progress', 'pending', 'review', 'delivered', 'on_hold', 'cancelled'];
/** These need a written reason, so the menu says so. */
const NEEDS_REASON: ProjectStatus[] = ['on_hold', 'cancelled'];

interface ProjectStatusMenuProps {
  status: ProjectStatus;
  /** When false the status is shown as a plain lozenge with no menu. */
  canChange: boolean;
  onSelect: (status: ProjectStatus) => void;
}

/**
 * Jira's status control: the current status as a lozenge, and when the user may
 * change it a menu of every status that closes on Esc or a click outside.
 */
export const ProjectStatusMenu: React.FC<ProjectStatusMenuProps> = ({ status, canChange, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<Array<HTMLButtonElement | null>>([]);
  const current = STATUS_LOZENGE[status] ?? STATUS_LOZENGE.new;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) items.current[active]?.focus();
  }, [open, active]);

  if (!canChange) {
    return <span className={`inline-flex h-6 items-center rounded-[3px] px-2 text-[12px] font-bold uppercase tracking-[0.01em] ${current.cls}`}>{current.label}</span>;
  }

  const choose = (s: ProjectStatus) => {
    setOpen(false);
    if (s !== status) onSelect(s);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % ORDER.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + ORDER.length) % ORDER.length); }
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKey}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change project status"
        onClick={() => { setActive(Math.max(0, ORDER.indexOf(status))); setOpen((v) => !v); }}
        className={`inline-flex h-6 cursor-pointer items-center gap-1 rounded-[3px] pl-2 pr-1 text-[12px] font-bold uppercase tracking-[0.01em] transition ${current.cls} ${current.hover} ${open ? 'ring-2 ring-[color:var(--ac-400,#4C9AFF)]' : ''}`}
      >
        {current.label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} />
      </button>

      {open && (
        <div role="menu" aria-label="Project status" className="absolute left-0 top-full z-40 mt-1.5 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[3px] bg-white py-1 shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] animate-in fade-in zoom-in-95 duration-100">
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#5E6C84]">Change status</p>
          {ORDER.map((s, i) => {
            const l = STATUS_LOZENGE[s];
            const on = s === status;
            return (
              <button
                key={s}
                ref={(el) => { items.current[i] = el; }}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                tabIndex={i === active ? 0 : -1}
                onClick={() => choose(s)}
                className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left outline-none transition-colors focus:bg-[#F4F5F7] hover:bg-[#F4F5F7] ${on ? 'bg-[#F4F5F7]' : ''}`}
              >
                <span className={`inline-block rounded-[3px] px-1.5 py-px text-[11px] font-bold uppercase tracking-[0.01em] ${l.cls}`}>{l.label}</span>
                {NEEDS_REASON.includes(s) && <span className="text-[11px] text-[#7A869A]">needs a reason</span>}
                {s === 'delivered' && <span className="text-[11px] text-[#7A869A]">checks open work</span>}
                {on && <Check className="ml-auto h-4 w-4 shrink-0 text-[color:var(--ac-main,#0052CC)]" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
