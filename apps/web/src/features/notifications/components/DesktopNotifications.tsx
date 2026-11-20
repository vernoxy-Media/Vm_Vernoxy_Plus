import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, BellOff, X } from 'lucide-react';
import { currentPushState, disablePush, enablePush, syncPushSilently, type PushState } from '../push-client';

const DISMISS_KEY = 'pulse:desktop-notifications:dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function usePushState() {
  const [state, setState] = useState<PushState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void currentPushState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      setState(await enablePush());
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      setState(await disablePush());
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable };
}

/** Keeps an already-allowed browser registered, and once offers to turn notifications on. */
export const DesktopNotificationsPrompt: React.FC = () => {
  const { state, busy, enable } = usePushState();
  const [hidden, setHidden] = useState(wasDismissed);

  useEffect(() => {
    void syncPushSilently();
  }, []);

  if (state !== 'off' || hidden || (typeof Notification !== 'undefined' && Notification.permission !== 'default')) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* the prompt just comes back next time */
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-[60] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <button type="button" onClick={dismiss} aria-label="Not now" className="absolute right-2.5 top-2.5 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <BellRing className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Turn on desktop notifications</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Get messages, task and project assignments and attendance updates on your screen, even when this tab is closed.</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void enable()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? 'Turning on…' : 'Turn on'}
            </button>
            <button type="button" onClick={dismiss} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** A row inside the notification bell to switch desktop notifications on or off. */
export const DesktopNotificationsToggle: React.FC = () => {
  const { state, busy, enable, disable } = usePushState();
  if (state === 'loading' || state === 'unsupported') return null;

  const on = state === 'on';
  const note =
    state === 'blocked'
      ? 'Blocked in your browser settings. Allow notifications for this site to turn it on.'
      : state === 'unavailable'
        ? 'Not available right now. Please try again later.'
        : on
          ? 'On: you get notifications even when this tab is closed.'
          : 'Get notifications even when this tab is closed.';

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
      <div className="flex min-w-0 items-start gap-2">
        {on ? <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <BellOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">Desktop notifications</p>
          <p className="text-[11px] leading-snug text-slate-500">{note}</p>
        </div>
      </div>
      {state !== 'blocked' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void (on ? disable() : enable())}
          className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-60 ${on ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {busy ? 'Please wait…' : on ? 'Turn off' : 'Turn on'}
        </button>
      )}
    </div>
  );
};
