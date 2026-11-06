import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  CornerUpRight,
  Forward,
  Info,
  ListChecks,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';
import type { Conversation, Message } from '../types';
import { DELETE_WINDOW_MINUTES, EDIT_WINDOW_MINUTES, QUICK_REACTIONS } from '../types';
import { formatTime, nameColour, tokenize, withinMinutes } from '../utils';
import { FileCard, ImageThumb } from './parts';
import { TEXT_SIZE_PX, useSettings } from '../settings';

/** *bold*, _italic_, ~strike~ and `code`, kept deliberately small. */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g);
  return parts.map((p, i) => {
    const key = `${keyBase}-${i}`;
    if (p.length > 2) {
      const inner = p.slice(1, -1);
      if (p.startsWith('*') && p.endsWith('*')) return <strong key={key}>{inner}</strong>;
      if (p.startsWith('_') && p.endsWith('_')) return <em key={key}>{inner}</em>;
      if (p.startsWith('~') && p.endsWith('~')) return <s key={key}>{inner}</s>;
      if (p.startsWith('`') && p.endsWith('`')) return <code key={key} className="rounded bg-black/5 px-1 font-mono text-[0.85em]">{inner}</code>;
    }
    return <React.Fragment key={key}>{p}</React.Fragment>;
  });
}

export const RichText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {tokenize(text).map((t, i) =>
      t.type === 'link' ? (
        <a key={i} href={t.value} target="_blank" rel="noopener noreferrer" className="break-all text-sky-700 underline underline-offset-2">
          {t.value}
        </a>
      ) : t.type === 'mention' ? (
        <span key={i} className="rounded bg-sky-100 px-1 font-medium text-sky-800">{t.value}</span>
      ) : (
        <React.Fragment key={i}>{inline(t.value, String(i))}</React.Fragment>
      ),
    )}
  </>
);

export const Ticks: React.FC<{ message: Message; readUpto: number; deliveredUpto: number }> = ({ message, readUpto, deliveredUpto }) => {
  if (message.pending === 'failed') return <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-label="Not sent" />;
  if (message.pending === 'sending') return <Clock className="h-3 w-3 text-slate-400" aria-label="Sending" />;
  if (message.message_id <= readUpto) return <CheckCheck className="h-4 w-4 text-sky-500" aria-label="Read" />;
  if (message.message_id <= deliveredUpto) return <CheckCheck className="h-4 w-4 text-slate-400" aria-label="Delivered" />;
  return <Check className="h-4 w-4 text-slate-400" aria-label="Sent" />;
};

interface Props {
  message: Message;
  conversation: Conversation;
  me: number;
  mine: boolean;
  showSender: boolean;
  firstOfRun: boolean;
  highlighted: boolean;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onStartSelect: () => void;
  onReply: () => void;
  onForward: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onInfo: () => void;
  onPin: () => void;
  onStar: () => void;
  onReact: (emoji: string) => void;
  onMoreReactions: () => void;
  onCopy: () => void;
  onOpenFile: () => void;
  onJump: (id: number) => void;
  onRetry: () => void;
  onDiscard: () => void;
}

export const MessageBubble: React.FC<Props> = (p) => {
  const { message: m, conversation: conv, mine } = p;
  // Only messages that just arrived animate in, not the whole history on open.
  const fresh = Date.now() - new Date(m.created_at).getTime() < 4000;
  const [menu, setMenu] = useState(false);
  const { textSize } = useSettings();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  /** Opens the menu and, on wide screens, keeps it fully inside the window. Phones get a bottom sheet instead. */
  const openMenu = () => {
    const r = bubbleRef.current?.getBoundingClientRect();
    if (r && window.innerWidth >= 640) {
      const width = 264;
      const height = Math.min(430, window.innerHeight - 16);
      const left = Math.min(Math.max(8, p.mine ? r.right - width : r.left), window.innerWidth - width - 8);
      const top = Math.min(Math.max(8, r.top + 28), window.innerHeight - height - 8);
      setPos({ top, left });
    } else setPos(null);
    setMenu(true);
  };
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) return;
    const out = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', out);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  if (m.kind === 'system') {
    return (
      <div className="my-2 flex justify-center px-4" data-mid={m.message_id}>
        <span className="max-w-[90%] rounded-lg bg-white/90 px-3 py-1 text-center text-xs text-slate-500 shadow-sm">{m.body}</span>
      </div>
    );
  }

  const deleted = !!m.deleted;
  const isImg = m.file && m.file.mime.startsWith('image/') && !deleted;
  const canEdit = mine && !deleted && !m.pending && withinMinutes(m.created_at, EDIT_WINDOW_MINUTES);
  const canDeleteAll = !deleted && !m.pending && ((mine && withinMinutes(m.created_at, DELETE_WINDOW_MINUTES)) || (conv.kind === 'group' && conv.my_is_admin));
  const canPin = !deleted && !m.pending && (conv.kind === 'direct' || conv.my_is_admin) && !conv.is_closed;
  const noMenu = !!m.pending;

  const act = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };

  const bubble = mine ? 'bg-[var(--chat-mine,#e0e7ff)] rounded-tr-none' : 'bg-white rounded-tl-none';
  const radius = p.firstOfRun ? '' : mine ? 'rounded-tr-lg' : 'rounded-tl-lg';

  const row = (Icon: React.ElementType, label: string, fn: () => void, danger?: boolean) => (
    <button
      type="button"
      role="menuitem"
      onClick={act(fn)}
      className={`flex w-full items-center gap-3.5 px-5 py-2.5 text-left text-[14.5px] transition hover:bg-slate-100 focus:bg-slate-100 focus:outline-none ${danger ? 'text-red-600 hover:bg-red-50 focus:bg-red-50' : 'text-slate-800'}`}
    >
      <Icon className={`h-[18px] w-[18px] shrink-0 ${danger ? 'text-red-500' : 'text-slate-500'}`} />
      {label}
    </button>
  );

  return (
    <div
      data-mid={m.message_id}
      className={`group relative flex px-3 sm:px-6 ${fresh ? 'msg-pop' : ''} ${mine ? 'justify-end' : 'justify-start'} ${p.firstOfRun ? 'mt-2' : 'mt-0.5'} ${p.highlighted ? 'bg-amber-200/40' : ''} ${p.selected ? 'bg-indigo-200/40' : ''} transition-colors duration-700`}
      onClick={p.selecting ? p.onToggleSelect : undefined}
    >
      {p.selecting && (
        <span className={`my-auto mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${p.selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'} ${mine ? 'order-first' : ''}`} aria-hidden>
          {p.selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      )}
      <div
        ref={bubbleRef}
        className={`relative max-w-[85%] rounded-lg px-2.5 pb-1.5 pt-1.5 shadow-sm sm:max-w-[70%] lg:max-w-[60%] 2xl:max-w-[50%] ${bubble} ${radius}`}
        onTouchStart={() => {
          if (noMenu || p.selecting) return;
          pressTimer.current = setTimeout(openMenu, 450);
        }}
        onTouchEnd={() => clearTimeout(pressTimer.current)}
        onTouchMove={() => clearTimeout(pressTimer.current)}
        onContextMenu={(e) => {
          if (noMenu || p.selecting) return;
          e.preventDefault();
          openMenu();
        }}
      >
        {p.showSender && !mine && p.firstOfRun && (
          <p className={`mb-0.5 text-[13px] font-semibold ${nameColour(m.sender_id)}`}>{m.sender_name}</p>
        )}
        {m.is_forwarded && !deleted && (
          <p className="mb-0.5 flex items-center gap-1 text-[11px] italic text-slate-500"><CornerUpRight className="h-3 w-3" /> Forwarded</p>
        )}
        {m.reply_to && !deleted && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              p.onJump(m.reply_to!.message_id);
            }}
            className={`mb-1 block w-full rounded-md border-l-4 px-2 py-1 text-left ${mine ? 'border-indigo-600 bg-indigo-100/80' : 'border-sky-500 bg-slate-100'}`}
          >
            <span className="block truncate text-xs font-semibold text-indigo-800">{m.reply_to.sender_name}</span>
            <span className="block truncate text-xs text-slate-600">
              {m.reply_to.deleted ? 'This message was deleted.' : m.reply_to.kind === 'file' ? `📎 ${m.reply_to.body || m.reply_to.file_name}` : m.reply_to.body}
            </span>
          </button>
        )}

        {deleted ? (
          <p className="flex items-center gap-1.5 py-0.5 pr-14 text-sm italic text-slate-500">
            <Ban className="h-3.5 w-3.5" />
            {m.deleted === 'admin' ? 'Removed by group admin' : 'This message was deleted.'}
          </p>
        ) : (
          <>
            {m.kind === 'file' && m.file && (
              <div className="mb-1 min-w-[12rem] max-w-xs">
                {isImg ? <ImageThumb message={m} onOpen={p.onOpenFile} /> : <FileCard message={m} onOpen={p.onOpenFile} mine={mine} />}
              </div>
            )}
            {m.body && (
              <p style={{ fontSize: TEXT_SIZE_PX[textSize] }} className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-snug text-slate-900">
                <RichText text={m.body} />
                <span className="inline-block w-20 align-bottom" aria-hidden />
              </p>
            )}
            {!m.body && <span className="inline-block h-3 w-16" aria-hidden />}
          </>
        )}

        <span className="absolute bottom-1 right-2 flex items-center gap-1 text-[11px] text-slate-500">
          {m.starred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-label="Starred" />}
          {m.pinned && <Pin className="h-3 w-3" aria-label="Pinned" />}
          {m.edited_at && !deleted && <span>Edited</span>}
          <time dateTime={m.created_at}>{formatTime(m.created_at)}</time>
          {mine && !deleted && <Ticks message={m} readUpto={conv.read_upto} deliveredUpto={conv.delivered_upto} />}
        </span>

        {!noMenu && !p.selecting && (
          <button
            type="button"
            aria-label="Message actions"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => (menu ? setMenu(false) : openMenu())}
            className={`absolute right-1 top-1 rounded-full bg-gradient-to-l ${mine ? 'from-[var(--chat-mine,#e0e7ff)]' : 'from-white'} to-transparent p-1 text-slate-500 opacity-0 transition focus:opacity-100 group-hover:opacity-100 max-sm:hidden`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        {m.reactions.length > 0 && (
          <div className="-mb-3 mt-1.5 flex flex-wrap gap-1">
            {m.reactions.map((r) => {
              const iReacted = r.emp_ids.includes(p.me);
              return (
                <button
                  key={r.emoji}
                  type="button"
                  title={r.names.join(', ')}
                  onClick={(e) => {
                    e.stopPropagation();
                    p.onReact(r.emoji);
                  }}
                  className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs shadow-sm ${iReacted ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                >
                  <span>{r.emoji}</span>
                  <span className="font-medium text-slate-600">{r.count}</span>
                </button>
              );
            })}
          </div>
        )}
        {m.reactions.length > 0 && <div className="h-3" />}

        {m.pending === 'failed' && (
          <div className="mt-1 flex items-center gap-3 text-xs">
            <span className="text-red-600">Not sent</span>
            <button type="button" onClick={p.onRetry} className="font-semibold text-sky-700 hover:underline">Retry</button>
            <button type="button" onClick={p.onDiscard} className="font-semibold text-slate-500 hover:underline">Delete</button>
          </div>
        )}

        {menu &&
          createPortal(
            <>
              <div className="fixed inset-0 z-[100] bg-black/30 sm:bg-transparent" aria-hidden onMouseDown={() => setMenu(false)} />
              <div
                role="menu"
                aria-label="Message actions"
                ref={(el) => {
                  menuRef.current = el;
                  if (el && !el.dataset.focused) {
                    el.dataset.focused = '1';
                    requestAnimationFrame(() => el.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
                  }
                }}
                onKeyDown={(e) => {
                  const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
                  const at = items.indexOf(document.activeElement as HTMLElement);
                  const go = (i: number) => {
                    e.preventDefault();
                    items[(i + items.length) % items.length]?.focus();
                  };
                  if (e.key === 'ArrowDown') go(at + 1);
                  else if (e.key === 'ArrowUp') go(at < 0 ? -1 : at - 1);
                  else if (e.key === 'Home') go(0);
                  else if (e.key === 'End') go(items.length - 1);
                }}
                style={pos ?? undefined}
                className="msg-pop fixed inset-x-0 bottom-0 z-[101] flex flex-col gap-2 p-3 sm:inset-x-auto sm:bottom-auto sm:w-[264px] sm:p-0"
              >
                {!deleted && (
                  <div className="flex items-center justify-between rounded-full bg-white px-2 py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.18)] ring-1 ring-black/5">
                    {QUICK_REACTIONS.map((e) => (
                      <button key={e} type="button" onClick={act(() => p.onReact(e))} className="flex h-9 w-9 items-center justify-center rounded-full text-[22px] leading-none transition hover:scale-110 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]" aria-label={`React ${e}`}>
                        {e}
                      </button>
                    ))}
                    <button type="button" onClick={act(p.onMoreReactions)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg leading-none text-slate-600 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]" aria-label="More reactions">+</button>
                  </div>
                )}
                <div className="max-h-[calc(100dvh-110px)] overflow-y-auto rounded-2xl bg-white py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.18)] ring-1 ring-black/5">
                  {!deleted && !conv.is_closed && row(Reply, 'Reply', p.onReply)}
                  {!deleted && row(Forward, 'Forward', p.onForward)}
                  {!deleted && m.body && row(Copy, 'Copy', p.onCopy)}
                  {canEdit && row(Pencil, 'Edit', p.onEdit)}
                  {!deleted && row(m.starred ? StarOff : Star, m.starred ? 'Unstar' : 'Star', p.onStar)}
                  {canPin && row(m.pinned ? PinOff : Pin, m.pinned ? 'Unpin' : 'Pin', p.onPin)}
                  {!deleted && row(ListChecks, 'Select', p.onStartSelect)}
                  {mine && !deleted && row(Info, 'Message info', p.onInfo)}
                  <div className="my-1 border-t border-slate-100" role="separator" />
                  {row(Trash2, canDeleteAll ? 'Delete…' : 'Delete for me', p.onDelete, true)}
                </div>
              </div>
            </>,
            document.body,
          )}
      </div>
    </div>
  );
};
