import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Flag, Loader2, PhoneCall, Search, StickyNote, Target, Video, X } from 'lucide-react';
import { fetchCalendarDue, fetchCalendarEvents } from '../api/calendar.api';
import { followUpLabel, isFollowUp } from '../follow-up';
import type { CalendarDueItem, CalendarEvent } from '../types';
import type { Layers } from './CalendarRail';

interface Props {
  layers: Layers;
  onClose: () => void;
  onOpenEvent: (e: CalendarEvent) => void;
  onOpenTask: (taskId: number) => void;
  onOpenProject: (projectId: number) => void;
  onGoToDate: (d: Date) => void;
}

interface Criteria {
  what: string;
  who: string;
  where: string;
  without: string;
  from: string;
  to: string;
  scope: 'active' | 'all';
}

const EMPTY: Criteria = { what: '', who: '', where: '', without: '', from: '', to: '', scope: 'active' };

const words = (v: string) => v.toLowerCase().split(/\s+/).filter(Boolean);
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

type Hit =
  | { kind: 'event'; key: string; when: string; sort: string; event: CalendarEvent }
  | { kind: 'due'; key: string; when: string; sort: string; item: CalendarDueItem };

const input =
  'h-10 w-full rounded-lg border border-transparent bg-slate-100 px-3 text-base text-slate-800 placeholder:text-slate-500 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm';

/** Google-Calendar-style search: keywords, a person, a place, words to leave out, and a date range. */
export const CalendarSearch: React.FC<Props> = ({ layers, onClose, onOpenEvent, onOpenTask, onOpenProject, onGoToDate }) => {
  const [c, setC] = useState<Criteria>(EMPTY);
  const [submitted, setSubmitted] = useState<Criteria | null>(null);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  // Without dates, look from three months back to a year ahead.
  const range = useMemo(() => {
    const from = submitted?.from ? new Date(`${submitted.from}T00:00:00`) : new Date(Date.now() - 90 * 86_400_000);
    const to = submitted?.to ? new Date(`${submitted.to}T23:59:59`) : new Date(Date.now() + 365 * 86_400_000);
    return { from, to };
  }, [submitted]);

  const { data, isFetching } = useQuery({
    queryKey: ['calendar-search', submitted, range.from.getTime(), range.to.getTime()],
    enabled: submitted !== null,
    queryFn: async () => {
      const [events, due] = await Promise.all([
        fetchCalendarEvents(range.from.toISOString(), range.to.toISOString()),
        fetchCalendarDue(range.from.toISOString(), range.to.toISOString()),
      ]);
      return { events, due };
    },
  });

  const find = (q: Criteria): Hit[] => {
    if (!data) return [];
    const must = words(q.what);
    const mustNot = words(q.without);
    const who = q.who.trim().toLowerCase();
    const where = q.where.trim().toLowerCase();
    const active = q.scope === 'active';
    const out: Hit[] = [];

    for (const e of data.events) {
      const followUp = isFollowUp(e);
      const note = !followUp && e.event_type !== 'meeting';
      if (active && (followUp ? !layers.followups : !layers.meetings)) continue;
      if (note && e.event_type === 'task_block' && e.task_id) continue; // task blocks are found as tasks
      const people = [e.organizer_name, ...e.attendees.flatMap((a) => [a.name, a.email])].join(' ').toLowerCase();
      const text = [e.title, e.description ?? '', e.location ?? '', people, e.meeting_link ?? ''].join(' ').toLowerCase();
      if (must.some((w) => !text.includes(w))) continue;
      if (mustNot.some((w) => text.includes(w))) continue;
      if (who && !people.includes(who)) continue;
      if (where && !(e.location ?? '').toLowerCase().includes(where)) continue;
      out.push({ kind: 'event', key: `e-${e.event_id}`, when: e.start_time, sort: e.start_time, event: e });
    }

    // Tasks and projects have no guests or place, so they only join a search by words and dates.
    if (!who && !where && (!active || layers.deadlines)) {
      for (const d of data.due) {
        const text = [d.title, d.code, d.project_name ?? '', d.priority ?? ''].join(' ').toLowerCase();
        if (must.some((w) => !text.includes(w)) || mustNot.some((w) => text.includes(w))) continue;
        const at = new Date(`${d.due_date}T00:00:00`).toISOString();
        out.push({ kind: 'due', key: `d-${d.kind}-${d.id}`, when: at, sort: at, item: d });
      }
    }
    return out.sort((a, b) => a.sort.localeCompare(b.sort)).slice(0, 200);
  };

  const hits = useMemo<Hit[]>(() => (submitted ? find(submitted) : []), [submitted, data, layers]); // eslint-disable-line react-hooks/exhaustive-deps

  /** When nothing matches: which single field, if left out, would have found something. */
  const hints = useMemo(() => {
    if (!submitted || hits.length > 0 || !data) return [];
    const labels: Record<'what' | 'who' | 'where' | 'without', string> = { what: 'What', who: 'Who', where: 'Where', without: 'Doesn’t have' };
    return (['what', 'who', 'where', 'without'] as const)
      .filter((k) => submitted[k].trim())
      .map((k) => ({ field: k, label: `${labels[k]}: ${submitted[k].trim()}`, count: find({ ...submitted, [k]: '' }).length }))
      .filter((h) => h.count > 0);
  }, [submitted, hits.length, data, layers]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasCriteria = Object.entries(c).some(([k, v]) => k !== 'scope' && String(v).trim());
  const run = () => hasCriteria && setSubmitted(c);
  const reset = () => {
    setC(EMPTY);
    setSubmitted(null);
    first.current?.focus();
  };
  const set = (k: keyof Criteria) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setC((v) => ({ ...v, [k]: e.target.value }));
  const dateBad = c.from && c.to && c.from > c.to;

  const open = (h: Hit) => {
    onClose();
    onGoToDate(new Date(h.when));
    if (h.kind === 'event') onOpenEvent(h.event);
    else if (h.item.kind === 'task') onOpenTask(h.item.id);
    else onOpenProject(h.item.id);
  };

  const row = (label: string, children: React.ReactNode) => (
    <div className="grid grid-cols-1 items-center gap-1 sm:grid-cols-[7.5rem_1fr] sm:gap-3">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </div>
  );

  return (
    <div className="msg-fade fixed inset-0 z-[70] flex items-start justify-center bg-slate-900/30 sm:p-4 sm:pt-16" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        role="search"
        aria-label="Search calendar"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="msg-modal flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 sm:max-h-[calc(100dvh-5rem)] sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-slate-500" />
          <input ref={first} value={c.what} onChange={set('what')} placeholder="Search: words in the title or description" aria-label="What" className="min-w-0 flex-1 bg-transparent text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none" />
          <button type="button" onClick={onClose} aria-label="Close search" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="px-5 pt-3 text-xs leading-relaxed text-slate-500">
            Fill one or more boxes; an event must match <b>all</b> of them. <b>Search</b> (top) looks at the title, description and guests; <b>Who</b> is a person’s name; <b>Where</b> is the location.
          </p>
          <div className="space-y-3 px-5 py-4">
            {row('Search in', (
              <select value={c.scope} onChange={set('scope')} aria-label="Search in" className={`${input} sm:w-60`}>
                <option value="active">Active calendars</option>
                <option value="all">All calendars</option>
              </select>
            ))}
            {row('Who', <input value={c.who} onChange={set('who')} placeholder="A person’s name, e.g. Krishna" aria-label="Who" className={input} />)}
            {row('Where', <input value={c.where} onChange={set('where')} placeholder="A place, e.g. Daman office" aria-label="Where" className={input} />)}
            {row('Doesn’t have', <input value={c.without} onChange={set('without')} placeholder="Leave out events with these words" aria-label="Doesn’t have" className={input} />)}
            {row('Date', (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  From
                  <input type="date" value={c.from} onChange={set('from')} aria-label="From date" className={input} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-500">
                  To
                  <input type="date" value={c.to} onChange={set('to')} aria-label="To date" className={input} />
                </label>
              </div>
            ))}
            {dateBad && <p role="alert" className="text-sm text-red-600 sm:pl-[8.5rem]">The first date cannot be after the second.</p>}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 pb-4">
            <button type="button" onClick={reset} className="rounded-full px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Reset</button>
            <button type="submit" disabled={!hasCriteria || !!dateBad} className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">Search</button>
          </div>

          {submitted && (
            <div className="border-t border-slate-100 px-2 py-2" aria-live="polite">
              {isFetching ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
              ) : hits.length === 0 ? (
                <div className="space-y-3 px-3 py-6 text-center">
                  <p className="text-sm font-medium text-slate-700">Nothing found.</p>
                  {hints.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Something matches if you leave one of these out:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {hints.map((h) => (
                          <button
                            key={h.field}
                            type="button"
                            onClick={() => {
                              const next = { ...c, [h.field]: '' };
                              setC(next);
                              setSubmitted(next);
                            }}
                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
                          >
                            Remove “{h.label}” · {h.count} result{h.count > 1 ? 's' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Try fewer words, widen the dates, or search in All calendars.</p>
                  )}
                </div>
              ) : (
                <>
                  <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{hits.length}{hits.length === 200 ? '+' : ''} result{hits.length === 1 ? '' : 's'}</p>
                  <ul>
                    {hits.map((h) => {
                      const meta =
                        h.kind === 'due'
                          ? { icon: h.item.kind === 'project' ? <Target className="h-4 w-4" /> : <Flag className="h-4 w-4" />, tone: h.item.kind === 'project' ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700', title: h.item.kind === 'project' ? `Deadline: ${h.item.title}` : h.item.title, sub: [h.item.code, h.item.project_name].filter(Boolean).join(' · '), time: 'Due' }
                          : isFollowUp(h.event)
                            ? { icon: <PhoneCall className="h-4 w-4" />, tone: 'bg-rose-100 text-rose-700', title: followUpLabel(h.event.title), sub: 'Sales follow-up', time: clock(h.event.start_time) }
                            : h.event.event_type === 'meeting'
                              ? { icon: <Video className="h-4 w-4" />, tone: 'bg-blue-100 text-blue-700', title: h.event.title, sub: [h.event.location, h.event.organizer_name].filter(Boolean).join(' · '), time: h.event.is_all_day ? 'All day' : clock(h.event.start_time) }
                              : { icon: <StickyNote className="h-4 w-4" />, tone: 'bg-amber-100 text-amber-700', title: h.event.title, sub: h.event.event_type === 'reminder' ? 'Reminder' : 'Note', time: clock(h.event.start_time) };
                      return (
                        <li key={h.key}>
                          <button type="button" onClick={() => open(h)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>{meta.icon}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-900">{meta.title}</span>
                              {meta.sub && <span className="block truncate text-xs text-slate-500">{meta.sub}</span>}
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-xs font-medium text-slate-700">{day(h.when)}</span>
                              <span className="block text-xs text-slate-500">{meta.time}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
          {!submitted && (
            <p className="flex items-center justify-center gap-2 border-t border-slate-100 px-5 py-6 text-sm text-slate-500">
              <CalendarIcon className="h-4 w-4" /> Search meetings, follow-ups, tasks and project deadlines.
            </p>
          )}
        </div>
      </form>
    </div>
  );
};
