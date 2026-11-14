import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Users } from 'lucide-react';
import { JiraAvatar } from '@/shared/ui/JiraAvatar';

export interface FilterPerson {
  id: number;
  name: string;
  avatar?: string | null;
}

interface EmployeeFilterProps {
  people: FilterPerson[];
  /** 'all' or an employee id as text. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Admin and project manager: look at the whole project, or at one employee's work in it.
 * It applies to the board, the backlog, the timeline, the bugs and the summary alike.
 */
const EmployeeChips: React.FC<EmployeeFilterProps> = ({ people, value, onChange }) => (
  <div className="flex items-center gap-2" role="group" aria-label="Show the work of">
    <span className="shrink-0 text-[12px] font-semibold text-[#5E6C84]">Employee</span>
    <div className="-mx-1 flex min-w-0 items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
      <button
        type="button"
        aria-pressed={value === 'all'}
        onClick={() => onChange('all')}
        className={`h-8 shrink-0 cursor-pointer rounded-[3px] px-3 text-[13px] font-medium transition ${value === 'all' ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'bg-[rgba(9,30,66,0.04)] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}
      >
        Everyone
      </button>
      {people.map((p) => {
        const on = value === String(p.id);
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? 'all' : String(p.id))}
            title={p.name}
            className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-[3px] pl-1 pr-2.5 text-[13px] font-medium transition ${on ? 'bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'bg-[rgba(9,30,66,0.04)] text-[#42526E] hover:bg-[rgba(9,30,66,0.08)]'}`}
          >
            <JiraAvatar name={p.name} id={p.id} src={p.avatar} size={22} />
            <span className="max-w-[120px] truncate">{p.name}</span>
          </button>
        );
      })}
    </div>
  </div>
);

/** More people than this and the chips would fill the screen: a searchable list takes over. */
const MAX_CHIPS = 6;

/** One button that opens a searchable list of people, for teams too big for chips. */
const EmployeeCombobox: React.FC<EmployeeFilterProps> = ({ people, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const selected = people.find((p) => String(p.id) === value);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const shown = useMemo(() => people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())), [people, q]);
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[12px] font-semibold text-[#5E6C84]">Employee</span>
      <div ref={box} className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex h-8 min-w-[200px] cursor-pointer items-center gap-2 rounded-[3px] border-2 px-2 text-[14px] transition-colors ${selected ? 'border-[color:var(--ac-200,#B3D4FF)] bg-[color:var(--ac-50,#DEEBFF)] text-[color:var(--ac-main,#0052CC)]' : 'border-[#DFE1E6] bg-[#FAFBFC] text-[#172B4D] hover:bg-[#EBECF0]'}`}
        >
          {selected ? <JiraAvatar name={selected.name} id={selected.id} src={selected.avatar} size={20} /> : <Users className="h-4 w-4 text-[#5E6C84]" />}
          <span className="flex-1 truncate text-left font-medium">{selected ? selected.name : `Everyone (${people.length})`}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 w-[280px] rounded-[3px] bg-white shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]">
            <div className="relative border-b border-[#DFE1E6] p-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E6C84]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search people"
                aria-label="Search people"
                className="h-8 w-full rounded-[3px] border-2 border-[#DFE1E6] bg-[#FAFBFC] pl-7 pr-2 text-[14px] focus:border-[color:var(--ac-400,#4C9AFF)] focus:bg-white focus:outline-none"
              />
            </div>
            <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
              {!q && (
                <li>
                  <button type="button" role="option" aria-selected={value === 'all'} onClick={() => pick('all')} className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[14px] hover:bg-[#F4F5F7]">
                    <Users className="h-5 w-5 text-[#5E6C84]" />
                    <span className="flex-1 font-medium">Everyone</span>
                    {value === 'all' && <Check className="h-4 w-4 text-[color:var(--ac-main,#0052CC)]" />}
                  </button>
                </li>
              )}
              {shown.map((p) => (
                <li key={p.id}>
                  <button type="button" role="option" aria-selected={String(p.id) === value} onClick={() => pick(String(p.id))} className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[14px] hover:bg-[#F4F5F7]">
                    <JiraAvatar name={p.name} id={p.id} src={p.avatar} size={22} />
                    <span className="flex-1 truncate">{p.name}</span>
                    {String(p.id) === value && <Check className="h-4 w-4 text-[color:var(--ac-main,#0052CC)]" />}
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="px-3 py-4 text-center text-[13px] text-[#5E6C84]">Nobody matches “{q}”.</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Admin and project manager: look at everyone's work, or at one employee's.
 * A small team gets one button per person; a large one gets a searchable list.
 */
export const EmployeeFilter: React.FC<EmployeeFilterProps> = (props) =>
  props.people.length > MAX_CHIPS ? <EmployeeCombobox {...props} /> : <EmployeeChips {...props} />;
