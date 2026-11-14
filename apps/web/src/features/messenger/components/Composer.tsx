import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Lock, Paperclip, Pencil, Send, Smile, X } from 'lucide-react';
import type { Member, Message } from '../types';
import { BLOCKED_EXTENSIONS, MAX_BODY, MAX_FILE_BYTES } from '../types';
import { formatSize } from '../utils';
import { EmojiPicker } from './parts';
import { getSettings } from '../settings';

export const draftKey = (id: number) => `msg-draft-${id}`;
export const readDraft = (id: number) => localStorage.getItem(draftKey(id)) ?? '';

function saveDraft(id: number, text: string) {
  if (text.trim()) localStorage.setItem(draftKey(id), text);
  else localStorage.removeItem(draftKey(id));
  window.dispatchEvent(new CustomEvent('msg-draft', { detail: id }));
}

export function checkFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (BLOCKED_EXTENSIONS.includes(ext)) return 'This file type is not allowed.';
  if (file.size > MAX_FILE_BYTES) return 'File exceeds the 25 MB limit.';
  return null;
}

interface Props {
  conversationId: number;
  members: Member[];
  isGroup: boolean;
  me: number;
  replyTo: Message | null;
  editing: Message | null;
  blockedReason: string | null;
  notice: string | null;
  droppedFiles: File[];
  onConsumeDropped: () => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSend: (text: string, files: File[]) => void;
  onSaveEdit: (text: string) => void;
  onTyping: () => void;
  onError: (msg: string) => void;
  focusKey: number;
}

export const Composer: React.FC<Props> = (p) => {
  const { conversationId } = p;
  const [text, setText] = useState(() => readDraft(conversationId));
  const [files, setFiles] = useState<File[]>([]);
  const [emoji, setEmoji] = useState(false);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastTyping = useRef(0);

  // A different conversation brings its own draft.
  useEffect(() => {
    setText(readDraft(conversationId));
    setFiles([]);
    setMention(null);
  }, [conversationId]);

  useEffect(() => {
    if (p.editing) setText(p.editing.body ?? '');
    else setText(readDraft(conversationId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.editing?.message_id]);

  useEffect(() => {
    area.current?.focus();
  }, [p.focusKey, p.replyTo?.message_id, p.editing?.message_id, conversationId]);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const accepted: File[] = [];
      for (const f of incoming) {
        const err = checkFile(f);
        if (err) {
          p.onError(`${f.name}: ${err}`);
          continue;
        }
        accepted.push(f);
      }
      setFiles((prev) => {
        const next = [...prev, ...accepted];
        if (next.length > 10) p.onError('You can share up to 10 files in one message.');
        return next.slice(0, 10);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.onError],
  );

  useEffect(() => {
    if (p.droppedFiles.length) {
      addFiles(p.droppedFiles);
      p.onConsumeDropped();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.droppedFiles]);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const change = (value: string, caret: number) => {
    setText(value);
    if (!p.editing) saveDraft(conversationId, value);
    if (Date.now() - lastTyping.current > 3000 && value.trim()) {
      lastTyping.current = Date.now();
      p.onTyping();
    }
    const m = /(^|\s)@([\w.]*)$/.exec(value.slice(0, caret));
    if (p.isGroup && m) {
      setMention({ query: m[2].toLowerCase(), start: caret - m[2].length - 1 });
      setMentionIdx(0);
    } else setMention(null);
  };

  const candidates = useMemo(
    () =>
      mention
        ? p.members.filter((m) => m.emp_id !== p.me && m.name.toLowerCase().includes(mention.query)).slice(0, 6)
        : [],
    [mention, p.members, p.me],
  );

  const pickMention = (m: Member) => {
    if (!mention || !area.current) return;
    const caret = area.current.selectionStart;
    const next = `${text.slice(0, mention.start)}@${m.name} ${text.slice(caret)}`;
    setText(next);
    saveDraft(conversationId, next);
    setMention(null);
    const pos = mention.start + m.name.length + 2;
    requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(pos, pos);
    });
  };

  const tooLong = text.length > MAX_BODY;
  const canSend = !p.blockedReason && !tooLong && (p.editing ? !!text.trim() : !!text.trim() || files.length > 0);

  const submit = () => {
    if (!canSend) {
      if (tooLong) p.onError('Message is too long (max 4,000 characters).');
      return;
    }
    if (p.editing) {
      p.onSaveEdit(text.trim());
    } else {
      p.onSend(text.trim(), files);
      setText('');
      setFiles([]);
      saveDraft(conversationId, '');
    }
    setEmoji(false);
  };

  if (p.blockedReason) {
    return (
      <div className="flex items-center justify-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
        <Lock className="h-4 w-4" /> {p.blockedReason}
      </div>
    );
  }

  const quoted = p.editing ?? p.replyTo;

  return (
    <div className="relative border-t border-slate-200 bg-[#f0f2f5] pb-[env(safe-area-inset-bottom)]">
      {p.notice && <p className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-700">{p.notice}</p>}

      {quoted && (
        <div className="flex items-start gap-2 border-b border-slate-200 bg-white/70 px-3 py-2">
          <div className="min-w-0 flex-1 rounded-md border-l-4 border-indigo-500 bg-white px-2 py-1">
            <p className="flex items-center gap-1 text-xs font-semibold text-indigo-700">
              {p.editing ? <><Pencil className="h-3 w-3" /> Editing message</> : quoted.sender_name}
            </p>
            <p className="truncate text-xs text-slate-600">{quoted.kind === 'file' ? `📎 ${quoted.body || quoted.file?.name}` : quoted.body}</p>
          </div>
          <button type="button" aria-label="Cancel" onClick={p.editing ? p.onCancelEdit : p.onCancelReply} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white/70 px-3 py-2">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative flex w-40 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 pr-7">
              {f.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(f)} alt="" className="h-9 w-9 rounded object-cover" onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
              ) : (
                <FileText className="h-9 w-9 text-rose-500" />
              )}
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-slate-800">{f.name}</span>
                <span className="block text-[11px] text-slate-500">{formatSize(f.size)}</span>
              </span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full p-0.5 text-slate-400 hover:bg-slate-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {mention && candidates.length > 0 && (
        <ul role="listbox" className="absolute bottom-full left-3 right-3 z-30 mb-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl sm:right-auto sm:w-72">
          {candidates.map((m, i) => (
            <li key={m.emp_id} role="option" aria-selected={i === mentionIdx}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pickMention(m); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === mentionIdx ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                <span className="font-medium text-slate-800">{m.name}</span>
                <span className="truncate text-xs text-slate-400">{m.department}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-1.5 px-2 py-2 sm:gap-2 sm:px-3">
        <div className="relative">
          <button type="button" aria-label="Emoji" onClick={() => setEmoji((v) => !v)} className="rounded-full p-2.5 text-slate-500 hover:bg-slate-200">
            <Smile className="h-6 w-6" />
          </button>
          {emoji && (
            <EmojiPicker
              onClose={() => setEmoji(false)}
              onPick={(e) => {
                const el = area.current;
                const s = el?.selectionStart ?? text.length;
                const next = text.slice(0, s) + e + text.slice(el?.selectionEnd ?? s);
                change(next, s + e.length);
                requestAnimationFrame(() => {
                  el?.focus();
                  el?.setSelectionRange(s + e.length, s + e.length);
                });
              }}
            />
          )}
        </div>
        {!p.editing && (
          <>
            <button type="button" aria-label="Attach file" onClick={() => fileInput.current?.click()} className="rounded-full p-2.5 text-slate-500 hover:bg-slate-200">
              <Paperclip className="h-6 w-6" />
            </button>
            <input ref={fileInput} type="file" multiple hidden onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />
          </>
        )}
        <textarea
          ref={area}
          rows={1}
          value={text}
          aria-label="Type a message"
          placeholder={files.length ? 'Add a caption…' : 'Type a message'}
          onChange={(e) => change(e.target.value, e.target.selectionStart)}
          onPaste={(e) => {
            const pasted = [...e.clipboardData.files];
            if (pasted.length) {
              e.preventDefault();
              addFiles(pasted);
            }
          }}
          onKeyDown={(e) => {
            if (mention && candidates.length) {
              if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => (i + 1) % candidates.length); return; }
              if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => (i - 1 + candidates.length) % candidates.length); return; }
              if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(candidates[mentionIdx]); return; }
              if (e.key === 'Escape') { setMention(null); return; }
            }
            const sends = getSettings().enterToSend ? e.key === 'Enter' && !e.shiftKey : e.key === 'Enter' && (e.ctrlKey || e.metaKey);
            if (sends && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
            if (e.key === 'Escape') {
              if (p.editing) p.onCancelEdit();
              else if (p.replyTo) p.onCancelReply();
            }
          }}
          className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border-0 bg-white px-4 py-2.5 text-base sm:max-h-40 sm:text-[15px] leading-snug text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        <button
          type="button"
          aria-label={p.editing ? 'Save edit' : 'Send'}
          disabled={!canSend}
          onClick={submit}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--chat-accent,#4F46E5)] text-white shadow-sm transition hover:bg-[var(--chat-accent-dark,#4338CA)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
      {text.length > MAX_BODY - 200 && (
        <p className={`px-4 pb-1 text-right text-[11px] ${tooLong ? 'text-red-600' : 'text-slate-400'}`}>{text.length}/{MAX_BODY}</p>
      )}
    </div>
  );
};
