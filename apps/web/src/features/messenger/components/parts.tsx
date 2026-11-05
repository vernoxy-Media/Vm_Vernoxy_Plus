import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, Loader2, Music, Video, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Avatar } from '@/shared/ui/Avatar';
import { fetchMessageFile } from '../api';
import type { Message, PresenceState } from '../types';
import { formatSize, isImage, presenceDot, presenceOf } from '../utils';

/** Round avatar with the presence dot in the corner. */
export const PersonAvatar: React.FC<{
  name: string;
  src?: string | null;
  size?: number;
  presence?: PresenceState;
  showPresence?: boolean;
  group?: boolean;
}> = ({ name, src, size = 48, presence, showPresence = true, group }) => (
  <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
    {group && !src ? (
      <span
        className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 font-semibold text-white"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {name.trim().slice(0, 2).toUpperCase()}
      </span>
    ) : (
      <Avatar src={src} name={name} size={size} />
    )}
    {showPresence && !group && (
      <span
        className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white ${presenceDot[presenceOf(presence)]}`}
        style={{ width: Math.max(10, size * 0.26), height: Math.max(10, size * 0.26) }}
        aria-hidden
      />
    )}
  </span>
);

const urlCache = new Map<number, Promise<string>>();

/** Private files need the user's token, so they are fetched and shown from an object URL. */
export function useFileUrl(messageId: number, enabled = true) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled || messageId <= 0) return;
    let cancelled = false;
    let promise = urlCache.get(messageId);
    if (!promise) {
      promise = fetchMessageFile(messageId).then((b) => URL.createObjectURL(b));
      urlCache.set(messageId, promise);
    }
    promise.then((u) => !cancelled && setUrl(u)).catch(() => {
      urlCache.delete(messageId);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [messageId, enabled]);
  return { url, failed };
}

export async function downloadMessageFile(m: Pick<Message, 'message_id' | 'file'>) {
  const blob = await fetchMessageFile(m.message_id, true);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = m.file?.name ?? 'file';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const ImageThumb: React.FC<{ message: Message; onOpen: () => void }> = ({ message, onOpen }) => {
  const { url, failed } = useFileUrl(message.message_id);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block max-h-72 w-full overflow-hidden rounded-lg bg-slate-100 text-left"
      style={{ aspectRatio: '4 / 3' }}
      aria-label={`Open ${message.file?.name}`}
    >
      {url ? (
        <img src={url} alt={message.file?.name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">
          {failed ? 'Image unavailable' : <Loader2 className="h-5 w-5 animate-spin" />}
        </span>
      )}
    </button>
  );
};

export const FileCard: React.FC<{ message: Message; onOpen: () => void; mine: boolean }> = ({ message, onOpen, mine }) => {
  const f = message.file!;
  const Icon = f.mime.startsWith('video/') ? Video : f.mime.startsWith('audio/') ? Music : FileText;
  return (
    <div className={`flex min-w-[14rem] items-center gap-3 rounded-lg p-2.5 ${mine ? 'bg-indigo-200/60' : 'bg-slate-100'}`}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-rose-500 shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-slate-800">{f.name}</span>
          <span className="block text-[11px] uppercase text-slate-500">
            {(f.name.split('.').pop() ?? '').slice(0, 5)} · {formatSize(f.size)}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label={`Download ${f.name}`}
        onClick={() => downloadMessageFile(message).catch(() => undefined)}
        className="rounded-full p-2 text-slate-500 hover:bg-white"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
};

/** Full screen viewer for images, PDFs, video and audio, with zoom for pictures and next/previous. */
export const Lightbox: React.FC<{ items: Message[]; index: number; onIndex: (i: number) => void; onClose: () => void }> = ({
  items,
  index,
  onIndex,
  onClose,
}) => {
  const m = items[index];
  const [zoom, setZoom] = useState(1);
  const { url, failed } = useFileUrl(m.message_id);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => setZoom(1), [index]);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, onIndex, onClose]);

  const mime = m.file?.mime ?? '';
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950/95" role="dialog" aria-modal="true" aria-label={m.file?.name}>
      <div className="flex items-center gap-2 px-4 py-3 text-white">
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{m.file?.name}</p>
          <p className="truncate text-xs text-white/60">{m.sender_name}</p>
        </div>
        {isImage(mime) && (
          <>
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="rounded-full p-2 hover:bg-white/10"><ZoomOut className="h-5 w-5" /></button>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="rounded-full p-2 hover:bg-white/10"><ZoomIn className="h-5 w-5" /></button>
          </>
        )}
        <button type="button" aria-label="Download" onClick={() => downloadMessageFile(m).catch(() => undefined)} className="rounded-full p-2 hover:bg-white/10"><Download className="h-5 w-5" /></button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-2"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          if (start === null || zoom !== 1) return;
          const dx = e.changedTouches[0].clientX - start;
          if (dx < -60 && index < items.length - 1) onIndex(index + 1);
          if (dx > 60 && index > 0) onIndex(index - 1);
        }}
      >
        {!url ? (
          <span className="text-sm text-white/70">{failed ? 'This file is not available.' : <Loader2 className="h-6 w-6 animate-spin" />}</span>
        ) : isImage(mime) ? (
          <img src={url} alt={m.file?.name} style={{ transform: `scale(${zoom})` }} className="max-h-full max-w-full object-contain transition-transform" />
        ) : mime === 'application/pdf' ? (
          <iframe src={url} title={m.file?.name} className="h-full w-full max-w-4xl rounded-lg bg-white" />
        ) : mime.startsWith('video/') ? (
          <video src={url} controls className="max-h-full max-w-full rounded-lg" />
        ) : mime.startsWith('audio/') ? (
          <audio src={url} controls />
        ) : (
          <p className="text-sm text-white/80">No preview for this file type. Use Download.</p>
        )}
        {index > 0 && (
          <button type="button" aria-label="Previous" onClick={() => onIndex(index - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-xl text-white hover:bg-white/20">‹</button>
        )}
        {index < items.length - 1 && (
          <button type="button" aria-label="Next" onClick={() => onIndex(index + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-xl text-white hover:bg-white/20">›</button>
        )}
      </div>
    </div>
  );
};

export { EmojiPanel, EmojiPicker } from './EmojiPicker';

/** Small modal shell: centred on desktop, a sheet from the bottom on phones. */
export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({
  title,
  onClose,
  children,
  footer,
  wide,
}) => {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="msg-fade fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`msg-modal flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-3xl sm:pb-0 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
};
