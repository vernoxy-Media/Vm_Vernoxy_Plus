import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlignLeft, CalendarDays, Clock, GripHorizontal, MapPin, Users, Video, X } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Avatar } from '@/shared/ui/Avatar';
import { AssignableEmployee, fetchAssignableEmployees } from '../api/calendar.api';
import { getLocalToday } from '../date-utils';
import { addMinutes, buildInviteText, describeSaveError, minutesBetween } from '../meeting';
import { MeetLinkField } from './MeetLinkField';
import type { CreateCalendarEventPayload } from '../types';

export interface EventDraft {
  title: string;
  date: string;
  start: string;
  end: string;
  link: string;
  location: string;
  description: string;
  guestIds: number[];
}

interface Props {
  defaultDate?: string;
  defaultStartTime?: string;
  /** Opened from a day in the month grid: starts as an all-day event with an "Add time" button. */
  allDay?: boolean;
  onTask?: () => void;
  onClose: () => void;
  onSave: (payload: CreateCalendarEventPayload) => Promise<void>;
  /** Hands the draft to the full form for tasks, long descriptions and the rest. */
  onMoreOptions: (draft: EventDraft) => void;
}

const input =
  'h-9 rounded-lg border border-transparent bg-slate-100 px-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20';

/** Google-Calendar-style quick add: a small card over the grid on desktop, a bottom sheet on phones. */
export const QuickCreatePopover: React.FC<Props> = ({ defaultDate, defaultStartTime, allDay: allDayDefault = false, onTask, onClose, onSave, onMoreOptions }) => {
  const startDefault = defaultStartTime ?? (() => {
    const n = new Date();
    return `${String(Math.min(n.getHours() + 1, 22)).padStart(2, '0')}:00`;
  })();
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(allDayDefault);
  const [date, setDate] = useState(defaultDate ?? getLocalToday());
  const [start, setStart] = useState(startDefault);
  const [end, setEnd] = useState(addMinutes(startDefault, 60));
  const [link, setLink] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [guestIds, setGuestIds] = useState<number[]>([]);
  const [guestQuery, setGuestQuery] = useState('');
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    titleRef.current?.focus();
    fetchAssignableEmployees().then(setEmployees);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const guests = employees.filter((e) => guestIds.includes(e.emp_id));
  const matches = useMemo(() => {
    const q = guestQuery.trim().toLowerCase();
    if (!q) return [];
    return employees.filter((e) => !guestIds.includes(e.emp_id) && (e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))).slice(0, 5);
  }, [guestQuery, employees, guestIds]);

  // Moving the start keeps the length of the event, like Google does.
  const changeStart = (value: string) => {
    const length = Math.max(15, minutesBetween(start, end));
    setStart(value);
    setEnd(addMinutes(value, length));
  };

  const range = () => {
    if (allDay) {
      const s0 = new Date(`${date}T00:00:00`);
      return { s: s0, e: new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() + 1) };
    }
    return { s: new Date(`${date}T${start}:00`), e: new Date(`${date}T${end}:00`) };
  };

  const draft = (): EventDraft => ({ title, date, start: allDay ? '09:00' : start, end: allDay ? '10:00' : end, link, location, description, guestIds });

  const save = async () => {
    const { s, e } = range();
    if (!title.trim()) return setError('Please add a title.');
    if (e <= s) return setError('End time must be after the start time.');
    setSaving(true);
    setError(null);
    try {
      await onSave({
        event_type: 'meeting',
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: s.toISOString(),
        end_time: e.toISOString(),
        is_all_day: allDay || undefined,
        meeting_link: link || undefined,
        location: location.trim() || undefined,
        attendee_ids: guestIds.length ? guestIds : undefined,
      });
    } catch (err) {
      setError(describeSaveError(err, 'Could not save the event.'));
      setSaving(false);
    }
  };

  const row = 'flex items-start gap-4';
  const icon = 'mt-2 h-5 w-5 shrink-0 text-slate-500';

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 sm:items-start sm:bg-slate-900/20 sm:pt-20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Create event"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-black/5 sm:max-h-[calc(100dvh-6rem)] sm:w-[28rem] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
          <GripHorizontal className="h-5 w-5 text-slate-400" aria-hidden />
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-slate-500 hover:bg-slate-200"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 pb-2 pt-3">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={allDay ? 'Add title and time' : 'Add title'}
            aria-label="Event title"
            maxLength={200}
            className="w-full border-0 border-b-2 border-slate-200 bg-transparent pb-1.5 text-[22px] text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
          />

          <div role="tablist" aria-label="What to create" className="flex gap-1">
            <button type="button" role="tab" aria-selected className="rounded-lg bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-900">Event</button>
            {onTask && (
              <button type="button" role="tab" aria-selected={false} onClick={onTask} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Task
              </button>
            )}
          </div>

          <div className={row}>
            <Clock className={icon} />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className={`${input} min-w-[8.5rem] flex-1`} />
              {allDay ? (
                <button type="button" onClick={() => setAllDay(false)} className="h-9 rounded-full border border-slate-300 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                  Add time
                </button>
              ) : (
                <>
                  <input type="time" value={start} onChange={(e) => changeStart(e.target.value)} aria-label="Start time" className={`${input} w-[6.5rem]`} />
                  <span className="text-slate-400" aria-hidden>–</span>
                  <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="End time" className={`${input} w-[6.5rem]`} />
                </>
              )}
              <p className="flex w-full items-center gap-2 text-xs text-slate-500">
                {allDay ? 'All day' : (
                  <button type="button" onClick={() => setAllDay(true)} className="font-semibold text-blue-700 hover:underline">All day</button>
                )}
                <span aria-hidden>·</span>
                Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>
          </div>

          <div className={row}>
            <Users className={icon} />
            <div className="relative min-w-0 flex-1">
              {guests.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  {guests.map((g) => (
                    <span key={g.emp_id} className="flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-1 pr-2 text-xs font-medium text-slate-700">
                      <Avatar src={g.profile_picture_url} name={g.name} size={20} />
                      {g.name}
                      <button type="button" aria-label={`Remove ${g.name}`} onClick={() => setGuestIds((ids) => ids.filter((x) => x !== g.emp_id))} className="text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
                    </span>
                  ))}
                </div>
              )}
              <input value={guestQuery} onChange={(e) => setGuestQuery(e.target.value)} placeholder="Add guests" aria-label="Add guests" className={`${input} w-full`} />
              {matches.length > 0 && (
                <ul className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  {matches.map((m) => (
                    <li key={m.emp_id}>
                      <button type="button" onClick={() => { setGuestIds((ids) => [...ids, m.emp_id]); setGuestQuery(''); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50">
                        <Avatar src={m.profile_picture_url} name={m.name} size={28} />
                        <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{m.name}</span><span className="block truncate text-xs text-slate-500">{m.email}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={row}>
            <Video className={icon} />
            <div className="min-w-0 flex-1">
              <MeetLinkField
                value={link}
                onChange={setLink}
                getInviteText={() => {
                  const r = range();
                  return buildInviteText({ title, start: r.s, end: r.e, link, location, description, guests: guests.map((g) => g.name) });
                }}
              />
            </div>
          </div>

          <div className={row}>
            <MapPin className={icon} />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" aria-label="Location" maxLength={255} className={`${input} min-w-0 flex-1`} />
          </div>

          <div className={row}>
            <AlignLeft className={icon} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add description" aria-label="Description" rows={2} className={`${input} min-w-0 flex-1 resize-none py-2 h-auto`} />
          </div>

          <div className={row}>
            <CalendarDays className={icon} />
            <div className="min-w-0 flex-1 pt-1">
              <p className="flex items-center gap-2 text-sm text-slate-800"><span className="truncate">{user?.name ?? 'My calendar'}</span><span className="h-3 w-3 shrink-0 rounded-full bg-sky-500" aria-hidden /></p>
              <p className="text-xs text-slate-500">Busy · Default visibility</p>
            </div>
          </div>

          {error && <p role="alert" className="whitespace-pre-line rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <button type="button" onClick={() => onMoreOptions(draft())} className="rounded-full px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">More options</button>
          <button type="submit" disabled={saving} className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
};
