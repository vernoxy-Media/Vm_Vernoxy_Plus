import React, { useEffect, useState } from 'react';
import { CalendarCheck, CalendarHeart, CalendarPlus, ChevronDown, ChevronLeft, ChevronRight, Check, Eye, ListChecks, MoreVertical, Plus, X } from 'lucide-react';
import { WEEKDAY_LABELS, weekdayIndex } from '../date-utils';

export interface Layers {
  meetings: boolean;
  followups: boolean;
  tasks: boolean;
  deadlines: boolean;
  attendance: boolean;
  leaves: boolean;
  holidays: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  onCreateTask: () => void;
  /** Only passed for people who can add company holidays. */
  onCreateHoliday?: () => void;
  currentDate: Date;
  selectedDate: Date;
  onPick: (d: Date) => void;
  layers: Layers;
  onToggleLayer: (key: keyof Layers) => void;
  /** "Display this only": show that calendar and hide the rest. */
  onOnlyLayer: (key: keyof Layers) => void;
  onShowAll: () => void;
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const MY_CALENDARS: Array<{ key: keyof Layers; label: string; colour: string }> = [
  { key: 'meetings', label: 'Meetings & events', colour: '#2563eb' },
  { key: 'followups', label: 'Sales follow-ups', colour: '#e11d48' },
  { key: 'tasks', label: 'Tasks', colour: '#f59e0b' },
  { key: 'deadlines', label: 'Due dates & deadlines', colour: '#7c3aed' },
  { key: 'attendance', label: 'Attendance', colour: '#16a34a' },
  { key: 'leaves', label: 'Leaves', colour: '#8b5cf6' },
];

const Box: React.FC<{ checked: boolean; colour: string }> = ({ checked, colour }) => (
  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-2" style={{ borderColor: colour, backgroundColor: checked ? colour : 'transparent' }} aria-hidden>
    {checked && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
  </span>
);

interface RowProps {
  item: { key: keyof Layers; label: string; colour: string };
  layers: Layers;
  menuFor: keyof Layers | null;
  setMenuFor: (k: keyof Layers | null) => void;
  onToggle: (k: keyof Layers) => void;
  onOnly: (k: keyof Layers) => void;
  onShowAll: () => void;
}

/** One calendar: its checkbox, and a small menu (Display this only / Show all calendars). */
const CalendarRow: React.FC<RowProps> = ({ item, layers, menuFor, setMenuFor, onToggle, onOnly, onShowAll }) => {
  const open = menuFor === item.key;
  const allOn = Object.values(layers).every(Boolean);
  return (
    <div className="group relative flex items-center rounded-lg hover:bg-slate-100">
      <button type="button" role="checkbox" aria-checked={layers[item.key]} onClick={() => onToggle(item.key)} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-700">
        <Box checked={layers[item.key]} colour={item.colour} />
        <span className="truncate">{item.label}</span>
      </button>
      <button
        type="button"
        aria-label={`Options for ${item.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setMenuFor(open ? null : item.key)}
        className={`mr-1 rounded-full p-1.5 text-slate-500 hover:bg-slate-200 focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 ${open ? 'lg:opacity-100' : ''}`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onMouseDown={() => setMenuFor(null)} aria-hidden />
          <div role="menu" className="absolute right-0 top-full z-[56] mt-1 w-52 overflow-hidden rounded-xl bg-white py-1.5 shadow-[0_2px_6px_rgba(60,64,67,.3),0_8px_16px_4px_rgba(60,64,67,.15)]">
            <button type="button" role="menuitem" onClick={() => { setMenuFor(null); onOnly(item.key); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-100">
              <Eye className="h-4 w-4 text-slate-500" />
              Display this only
            </button>
            <button type="button" role="menuitem" disabled={allOn} onClick={() => { setMenuFor(null); onShowAll(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-100 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent">
              <Check className="h-4 w-4 text-slate-500" />
              Show all calendars
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/** Google-Calendar-style left rail: Create, a small month to jump around, and which calendars are shown. */
export const CalendarRail: React.FC<Props> = ({ open, onClose, onCreate, onCreateTask, onCreateHoliday, currentDate, selectedDate, onPick, layers, onToggleLayer, onOnlyLayer, onShowAll }) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<keyof Layers | null>(null);
  const [myOpen, setMyOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
  const [mini, setMini] = useState(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  useEffect(() => setMini(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)), [currentDate]);

  const first = new Date(mini.getFullYear(), mini.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - weekdayIndex(first));
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const rows = days[35].getMonth() === mini.getMonth() ? 6 : 5; // drop an empty last week
  const today = new Date();

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Calendar navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-5 overflow-y-auto bg-white p-4 shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:shrink-0 lg:translate-x-0 lg:bg-transparent lg:p-0 lg:pr-2 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-base font-bold text-slate-900">Calendar</span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="relative w-fit">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={createOpen}
            onClick={() => setCreateOpen((v) => !v)}
            className="flex h-14 items-center gap-3 rounded-2xl bg-white pl-4 pr-5 text-sm font-semibold text-slate-800 shadow-[0_1px_3px_rgba(60,64,67,.3),0_4px_8px_3px_rgba(60,64,67,.15)] transition hover:bg-slate-50 hover:shadow-lg"
          >
            <Plus className="h-6 w-6 text-blue-600" strokeWidth={2.5} />
            Create
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
          {createOpen && (
            <>
              <div className="fixed inset-0 z-[55]" onMouseDown={() => setCreateOpen(false)} aria-hidden />
              <div role="menu" className="absolute left-0 top-full z-[56] mt-1 w-56 overflow-hidden rounded-xl bg-white py-2 shadow-[0_2px_6px_rgba(60,64,67,.3),0_8px_16px_4px_rgba(60,64,67,.15)]">
                {[
                  { label: 'Event', icon: CalendarPlus, run: onCreate },
                  { label: 'Task', icon: ListChecks, run: onCreateTask },
                  ...(onCreateHoliday ? [{ label: 'Holiday', icon: CalendarHeart, run: onCreateHoliday }] : []),
                ].map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCreateOpen(false);
                      onClose();
                      m.run();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-100"
                  >
                    <m.icon className="h-4 w-4 text-slate-500" />
                    {m.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <section aria-label="Month">
          <div className="mb-1 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-slate-800">{mini.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex">
              <button type="button" aria-label="Previous month" onClick={() => setMini(new Date(mini.getFullYear(), mini.getMonth() - 1, 1))} className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" aria-label="Next month" onClick={() => setMini(new Date(mini.getFullYear(), mini.getMonth() + 1, 1))} className="rounded-full p-1.5 text-slate-600 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-500">
            {WEEKDAY_LABELS.map((d, i) => <span key={i} className="py-1.5">{d[0]}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5 text-center">
            {days.slice(0, rows * 7).map((d) => {
              const isToday = sameDay(d, today);
              const isSelected = sameDay(d, selectedDate);
              const outside = d.getMonth() !== mini.getMonth();
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    onPick(d);
                    onClose();
                  }}
                  aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  aria-current={isToday ? 'date' : undefined}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition ${
                    isToday ? 'bg-blue-600 font-bold text-white' : isSelected ? 'bg-blue-100 font-semibold text-blue-700' : outside ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="My calendars">
          <button type="button" onClick={() => setMyOpen((v) => !v)} aria-expanded={myOpen} className="mb-1 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-100">
            <CalendarCheck className="h-4 w-4 text-slate-500" />
            <span className="flex-1 text-left">My calendars</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${myOpen ? 'rotate-180' : ''}`} />
          </button>
          {myOpen && (
            <div className="space-y-0.5">
              {MY_CALENDARS.map((c) => (
                <CalendarRow key={c.key} item={c} layers={layers} menuFor={menuFor} setMenuFor={setMenuFor} onToggle={onToggleLayer} onOnly={onOnlyLayer} onShowAll={onShowAll} />
              ))}
            </div>
          )}
        </section>

        <section aria-label="Other calendars">
          <div className="mb-1 flex items-center">
            <button type="button" onClick={() => setOtherOpen((v) => !v)} aria-expanded={otherOpen} className="flex flex-1 items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-100">
              <span className="flex-1 text-left">Other calendars</span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${otherOpen ? 'rotate-180' : ''}`} />
            </button>
            {onCreateHoliday && (
              <button type="button" aria-label="Add holiday" title="Add holiday" onClick={() => { onClose(); onCreateHoliday(); }} className="ml-1 rounded-full p-1.5 text-slate-600 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          {otherOpen && (
            <CalendarRow item={{ key: 'holidays', label: 'Holidays', colour: '#15803d' }} layers={layers} menuFor={menuFor} setMenuFor={setMenuFor} onToggle={onToggleLayer} onOnly={onOnlyLayer} onShowAll={onShowAll} />
          )}
        </section>
      </aside>
    </>
  );
};
