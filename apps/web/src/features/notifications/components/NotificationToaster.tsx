import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Bug, CalendarClock, CheckCircle2, ClipboardList, FolderKanban, X } from 'lucide-react';
import { useSocket } from '@/shared/socket/SocketContext';

interface IncomingNotification {
  notification_id?: number;
  kind?: string;
  title?: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
}

interface ToastItem {
  id: number;
  title: string;
  body: string;
  kind: string;
  path: string | null;
}

const MAX_VISIBLE = 4;
const VISIBLE_MS = 9000;

/** Where a notification leads when the toast is clicked. */
function destination(n: IncomingNotification): string | null {
  const kind = n.kind ?? '';
  if (kind.startsWith('project_') && n.entity_id) return `/projects/${n.entity_id}`;
  if (kind.startsWith('task_') || kind.startsWith('bug_')) return '/my-tasks';
  if (kind.startsWith('calendar_')) return '/calendar';
  if (kind.startsWith('follow_up') || kind === 'lead_assigned') return '/sales/follow-ups';
  if (kind.startsWith('leave_')) return '/leave';
  if (kind.startsWith('expense_')) return '/expense';
  return null;
}

function visual(kind: string): { Icon: React.ElementType; tone: string } {
  if (kind.startsWith('bug_')) return { Icon: Bug, tone: 'bg-rose-50 text-rose-600' };
  if (kind.startsWith('calendar_')) return { Icon: CalendarClock, tone: 'bg-violet-50 text-violet-600' };
  if (kind.startsWith('project_')) return { Icon: FolderKanban, tone: 'bg-indigo-50 text-indigo-600' };
  if (kind === 'task_approved') return { Icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' };
  if (kind.startsWith('task_')) return { Icon: ClipboardList, tone: 'bg-blue-50 text-blue-600' };
  return { Icon: Bell, tone: 'bg-slate-100 text-slate-600' };
}

/**
 * Pops a card in the bottom-right corner the moment something is assigned to, or sent to, the signed-in person
 * (a task, a project, a bug, a calendar invitation, a mention…). The bell keeps the permanent record.
 * Messenger shows its own toast for new chat messages.
 */
export const NotificationToaster: React.FC = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNotification = (n: IncomingNotification) => {
      if (!n?.title) return;
      const id = ++seq.current;
      const item: ToastItem = { id, title: n.title, body: n.body ?? '', kind: n.kind ?? '', path: destination(n) };
      setToasts((prev) => [item, ...prev].slice(0, MAX_VISIBLE));
      timers.current.set(id, setTimeout(() => dismiss(id), VISIBLE_MS));
    };
    socket.on('notification:received', onNotification);
    return () => {
      socket.off('notification:received', onNotification);
    };
  }, [socket, dismiss]);

  useEffect(() => {
    const live = timers.current;
    return () => live.forEach((t) => clearTimeout(t));
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const { Icon, tone } = visual(t.kind);
        return (
          <div key={t.id} role="status" className="msg-slide-up pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-900/10">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
            <button
              type="button"
              disabled={!t.path}
              onClick={() => {
                if (t.path) navigate(t.path);
                dismiss(t.id);
              }}
              className={`min-w-0 flex-1 text-left ${t.path ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className="block text-sm font-semibold leading-5 text-slate-900">{t.title}</span>
              {t.body && <span className="mt-0.5 line-clamp-3 block text-xs leading-5 text-slate-600">{t.body}</span>}
              <span className="mt-1 block text-[11px] font-medium text-slate-400">Just now{t.path ? ' · Click to open' : ''}</span>
            </button>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
