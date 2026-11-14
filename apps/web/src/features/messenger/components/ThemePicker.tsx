import React, { useEffect, useRef, useState } from 'react';
import { Check, Palette, RotateCcw } from 'lucide-react';
import { CHAT_THEMES, setAllChatsTheme, setChatTheme, useChatTheme } from '../chat-theme';

/** A palette button in the chat header: pick the colours of this chat, only for yourself. */
export const ThemePicker: React.FC<{ empId: number; conversationId: number }> = ({ empId, conversationId }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { theme, ownTheme, allTheme } = useChatTheme(empId, conversationId);

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

  return (
    <div ref={box} className="relative">
      <button type="button" aria-label="Chat theme" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`rounded-full p-2 hover:bg-slate-200 ${open ? 'bg-slate-200' : ''}`} style={{ color: theme.accent }}>
        <Palette className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(320px,calc(100vw-24px))] rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.2)] ring-1 ring-black/5">
          <p className="text-sm font-semibold text-slate-900">Chat theme</p>
          <p className="mb-3 text-xs text-slate-500">Only you see these colours.</p>

          <div className="grid grid-cols-4 gap-2.5" role="radiogroup" aria-label="Theme colour">
            {CHAT_THEMES.map((t) => {
              const on = t.id === theme.id;
              return (
                <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setChatTheme(empId, conversationId, t.id)} className="group flex flex-col items-center gap-1.5 focus:outline-none">
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl ring-2 transition group-hover:scale-105 group-focus-visible:ring-slate-400" style={{ background: t.bg, boxShadow: on ? `0 0 0 2px #fff, 0 0 0 4px ${t.accent}` : undefined, ['--tw-ring-color' as string]: on ? 'transparent' : '#e2e8f0' }}>
                    <span className="absolute right-1.5 top-1.5 h-3.5 w-5 rounded-md rounded-tr-none" style={{ background: t.mine }} />
                    <span className="absolute bottom-1.5 left-1.5 h-3.5 w-5 rounded-md rounded-bl-none bg-white" />
                    <span className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
                    {on && <Check className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white p-0.5" style={{ color: t.accent }} strokeWidth={3} />}
                  </span>
                  <span className={`text-[11px] ${on ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{t.name}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-1.5 border-t border-slate-100 pt-3 text-sm">
            <button type="button" onClick={() => setAllChatsTheme(empId, theme.id)} disabled={allTheme.id === theme.id && !ownTheme} className="cursor-pointer rounded-lg px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent">
              Use {theme.name} for all chats
            </button>
            {ownTheme && (
              <button type="button" onClick={() => setChatTheme(empId, conversationId, null)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-left font-medium text-slate-700 hover:bg-slate-100">
                <RotateCcw className="h-3.5 w-3.5" /> Back to the default for this chat
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
