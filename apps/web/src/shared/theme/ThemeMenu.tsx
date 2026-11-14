import React, { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { customFetch } from '@vernoxy-pulse/api-client';
import { useAuth } from '@/features/auth/context/AuthContext';
import { APP_THEMES, DEFAULT_THEME_ID, applyAppTheme, themeById, themeCache } from './app-theme';

/** A palette button in the header: every employee picks the colour of the whole app for themselves. */
export const ThemeMenu: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(themeById(user?.ui_theme).id);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setChoice(themeById(user?.ui_theme).id), [user?.ui_theme]);

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

  const pick = async (id: string) => {
    const before = choice;
    setChoice(id);
    applyAppTheme(id); // shows at once
    themeCache.write(id);
    setError(null);
    try {
      await customFetch('/api/v1/me/theme', { method: 'PATCH', body: JSON.stringify({ theme: id === DEFAULT_THEME_ID ? null : id }) });
      await refreshProfile();
    } catch {
      setChoice(before);
      applyAppTheme(before);
      themeCache.write(before);
      setError('Could not save the theme. Try again.');
    }
  };

  return (
    <div ref={box} className="relative">
      <button type="button" id="header-theme-btn" title="Theme colour" aria-label="Theme colour" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={className}>
        <Palette className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </button>

      {open && (
        <div role="dialog" aria-label="Theme colour" className="absolute right-0 top-full z-50 mt-2 w-[min(280px,calc(100vw-24px))] rounded-2xl bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.2)] ring-1 ring-black/5">
          <p className="text-sm font-semibold text-slate-900">Theme colour</p>
          <p className="mb-3 text-xs text-slate-500">Only you see this. It follows you to any computer.</p>
          <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label="Theme colour">
            {APP_THEMES.map((t) => {
              const on = t.id === choice;
              return (
                <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => pick(t.id)} className="group flex cursor-pointer flex-col items-center gap-1.5 focus:outline-none" title={t.name}>
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full transition group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-slate-400" style={{ background: t.accent, boxShadow: on ? `0 0 0 2px #fff, 0 0 0 4px ${t.accent}` : undefined }}>
                    {on && <Check className="h-5 w-5 text-white" strokeWidth={3} />}
                  </span>
                  <span className={`text-center text-[11px] leading-tight ${on ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{t.name.replace(' (default)', '')}</span>
                </button>
              );
            })}
          </div>
          {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
};
