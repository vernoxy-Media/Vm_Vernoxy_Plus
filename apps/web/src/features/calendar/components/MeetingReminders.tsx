import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Video, X } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { fetchCalendarEvents, sendMeetingReminder } from '../api/calendar.api';
import type { CalendarEvent } from '../types';

const FIRED_KEY = 'meeting-reminders-fired';
const LEAD_MINUTES = 10; // "starting soon"
const GRACE_MINUTES = 3; // still worth a "starting now" this long after the start

interface Toast {
  id: string;
  eventId: number;
  title: string;
  kind: 'before' | 'start';
  start: string;
  link: string | null;
}

const readFired = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? '[]');
  } catch {
    return [];
  }
};

const minutesLabel = (iso: string) => {
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  return m <= 0 ? 'now' : m === 1 ? 'in 1 minute' : `in ${m} minutes`;
};

/**
 * Reminds the signed-in person about their own meetings while Pulse is open in a browser tab:
 * a Chrome notification, an on-screen card, and an entry in the notification bell.
 * The server records each reminder once per person, so several tabs or devices do not repeat it.
 */
export const MeetingReminders: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const me = user?.emp_id;
  const events = useRef<CalendarEvent[]>([]);
  const fired = useRef<Set<string>>(new Set(readFired()));
  const retryAt = useRef<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const remember = (key: string) => {
    fired.current.add(key);
    try {
      localStorage.setItem(FIRED_KEY, JSON.stringify([...fired.current].slice(-200)));
    } catch {
      /* private mode: reminders may repeat after a reload */
    }
  };

  const fire = useCallback(
    async (ev: CalendarEvent, kind: 'before' | 'start') => {
      const key = `${ev.event_id}:${kind}`;
      remember(key);
      try {
        const res = await sendMeetingReminder(ev.event_id, kind);
        if (!res.created) return; // already shown to this person (another tab or device)
        const toast: Toast = { id: key, eventId: ev.event_id, title: ev.title, kind, start: ev.start_time, link: ev.meeting_link };
        setToasts((t) => [...t.filter((x) => x.id !== key), toast].slice(-3));
        setTimeout(() => dismiss(key), 90_000);
        if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(kind === 'start' ? 'Meeting starting now' : 'Meeting starting soon', {
            body: `${ev.title} · ${minutesLabel(ev.start_time)}`,
            tag: `meeting-${key}`,
            requireInteraction: true,
          });
          n.onclick = () => {
            window.focus();
            if (ev.meeting_link) window.open(ev.meeting_link, '_blank', 'noopener,noreferrer');
            else navigate('/calendar');
            n.close();
          };
        }
      } catch {
        fired.current.delete(key);
        retryAt.current[key] = Date.now() + 2 * 60_000; // try again in a couple of minutes, not every tick
      }
    },
    [dismiss, navigate],
  );

  // The meetings in the next half day, refreshed every few minutes and when the tab comes back.
  useEffect(() => {
    if (!isAuthenticated || !me) return;
    let live = true;
    const load = async () => {
      const from = new Date(Date.now() - GRACE_MINUTES * 60_000);
      const to = new Date(Date.now() + 12 * 3600_000);
      const list = await fetchCalendarEvents(from.toISOString(), to.toISOString());
      if (!live) return;
      // Admins get everyone's events from the API; a reminder is only for meetings the person is part of.
      events.current = list.filter(
        (e) =>
          e.event_type === 'meeting' &&
          !e.is_all_day &&
          e.status !== 'cancelled' &&
          (e.organizer_id === me || e.attendees.some((a) => a.employee_id === me && a.response_status !== 'declined')),
      );
    };
    void load();
    const refresh = setInterval(load, 5 * 60_000);
    const onVisible = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      live = false;
      clearInterval(refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, me]);

  // Every 20 seconds: is any meeting about to start?
  useEffect(() => {
    if (!isAuthenticated || !me) return;
    const tick = () => {
      const now = Date.now();
      for (const ev of events.current) {
        const minutes = (new Date(ev.start_time).getTime() - now) / 60000;
        const waiting = (kind: string) => (retryAt.current[`${ev.event_id}:${kind}`] ?? 0) > now;
        if (minutes > 0 && minutes <= LEAD_MINUTES && !fired.current.has(`${ev.event_id}:before`) && !waiting('before')) void fire(ev, 'before');
        else if (minutes <= 0 && minutes >= -GRACE_MINUTES && !fired.current.has(`${ev.event_id}:start`) && !waiting('start')) void fire(ev, 'start');
      }
    };
    tick();
    const t = setInterval(tick, 20_000);
    return () => clearInterval(t);
  }, [isAuthenticated, me, fire]);

  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[85] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" aria-live="assertive">
      {toasts.map((t) => (
        <div key={t.id} className="msg-slide-up pointer-events-auto rounded-2xl border border-blue-100 bg-white p-4 shadow-xl shadow-slate-900/10">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Bell className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{t.kind === 'start' ? 'Meeting starting now' : 'Meeting starting soon'}</p>
              <p className="truncate text-sm font-semibold text-slate-900">{t.title}</p>
              <p className="text-xs text-slate-500">
                {new Date(t.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} · {minutesLabel(t.start)}
              </p>
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            {t.link && (
              <a href={t.link} target="_blank" rel="noreferrer" onClick={() => dismiss(t.id)} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700">
                <Video className="h-4 w-4" /> Join Google Meet
              </a>
            )}
            <button type="button" onClick={() => { dismiss(t.id); navigate('/calendar'); }} className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Open calendar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

/** One line in the calendar that asks for Chrome's permission, which only a click can request. */
export const ReminderPermissionBanner: React.FC = () => {
  const [show, setShow] = useState(
    () => 'Notification' in window && Notification.permission === 'default' && localStorage.getItem('cal-notif-dismissed') !== '1',
  );
  if (!show) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 text-sm text-blue-900">
      <Bell className="h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">Get a Chrome notification when a meeting is about to start.</p>
      <button
        type="button"
        onClick={() => void Notification.requestPermission().finally(() => setShow(false))}
        className="shrink-0 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
      >
        Turn on
      </button>
      <button
        type="button"
        aria-label="Not now"
        onClick={() => {
          localStorage.setItem('cal-notif-dismissed', '1');
          setShow(false);
        }}
        className="shrink-0 rounded-full p-1 text-blue-700 hover:bg-blue-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
