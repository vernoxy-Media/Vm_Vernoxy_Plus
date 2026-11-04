import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Search } from 'lucide-react';
import { EMOJI_GROUPS } from '../emoji-data';

const RECENT_KEY = 'msg-emoji-recent';
const readRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
};
const remember = (e: string) =>
  localStorage.setItem(RECENT_KEY, JSON.stringify([e, ...readRecent().filter((x) => x !== e)].slice(0, 32)));

const nameOf = new Map<string, string>(EMOJI_GROUPS.flatMap((g) => g.items));

/** Every emoji, searchable, with category tabs and recently used, like the phone keyboards people know. */
export const EmojiPanel: React.FC<{ onPick: (emoji: string) => void; className?: string }> = ({ onPick, className = '' }) => {
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [active, setActive] = useState('Recent');
  const scroller = useRef<HTMLDivElement>(null);
  const sections = useRef<Record<string, HTMLElement | null>>({});

  const term = q.trim().toLowerCase();
  const results = useMemo(
    () => (term ? EMOJI_GROUPS.flatMap((g) => g.items).filter(([, name]) => name.includes(term)) : []),
    [term],
  );

  const pick = (e: string) => {
    remember(e);
    setRecent(readRecent());
    onPick(e);
  };

  const tabs = [...(recent.length ? [{ name: 'Recent', icon: null as string | null }] : []), ...EMOJI_GROUPS.map((g) => ({ name: g.name, icon: g.icon }))];

  const onScroll = () => {
    const top = scroller.current?.getBoundingClientRect().top ?? 0;
    let current = tabs[0]?.name;
    for (const t of tabs) {
      const el = sections.current[t.name];
      if (el && el.getBoundingClientRect().top - top <= 40) current = t.name;
    }
    if (current) setActive(current);
  };

  const cell = (e: string) => (
    <button key={e} type="button" onClick={() => pick(e)} title={nameOf.get(e)} aria-label={nameOf.get(e) ?? e} className="flex h-10 w-10 items-center justify-center rounded-lg text-[26px] leading-none transition hover:bg-slate-100 focus:bg-slate-100 focus:outline-none">
      {e}
    </button>
  );

  return (
    <div className={`flex flex-col overflow-hidden bg-white ${className}`}>
      <div className="px-3 pt-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emoji" aria-label="Search emoji" className="h-9 w-full rounded-full border-0 bg-slate-100 pl-9 pr-3 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
        </label>
      </div>
      {!term && (
        <div className="flex justify-between border-b border-slate-100 px-2 pt-1" role="tablist" aria-label="Emoji categories">
          {tabs.map((t) => (
            <button
              key={t.name}
              type="button"
              role="tab"
              aria-selected={active === t.name}
              aria-label={t.name}
              title={t.name}
              onClick={() => {
                setActive(t.name);
                const el = sections.current[t.name];
                if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' });
              }}
              className={`flex h-9 flex-1 items-center justify-center border-b-2 text-lg transition ${active === t.name ? 'border-indigo-600' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              {t.icon ?? <Clock className="h-[18px] w-[18px] text-slate-600" />}
            </button>
          ))}
        </div>
      )}
      <div ref={scroller} onScroll={term ? undefined : onScroll} className="relative min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {term ? (
          results.length ? (
            <div className="grid grid-cols-8 pt-2">{results.map(([e]) => cell(e))}</div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">No emoji found.</p>
          )
        ) : (
          <>
            {recent.length > 0 && (
              <section ref={(el) => (sections.current.Recent = el)}>
                <h3 className="sticky top-0 bg-white/95 px-1 py-1.5 text-xs font-semibold text-slate-500 backdrop-blur">Recently used</h3>
                <div className="grid grid-cols-8">{recent.map(cell)}</div>
              </section>
            )}
            {EMOJI_GROUPS.map((g) => (
              <section key={g.name} ref={(el) => (sections.current[g.name] = el)} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
                <h3 className="sticky top-0 bg-white/95 px-1 py-1.5 text-xs font-semibold text-slate-500 backdrop-blur">{g.name}</h3>
                <div className="grid grid-cols-8">{g.items.map(([e]) => cell(e))}</div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

/** The panel as a pop-up above the composer. */
export const EmojiPicker: React.FC<{ onPick: (emoji: string) => void; onClose: () => void }> = ({ onPick, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const out = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', out);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);
  return (
    <div ref={ref} className="absolute bottom-full left-0 z-30 mb-2 h-[min(25rem,55dvh)] w-[min(22.5rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
      <EmojiPanel onPick={onPick} className="h-full" />
    </div>
  );
};
