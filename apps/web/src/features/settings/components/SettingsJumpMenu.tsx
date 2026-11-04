import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, SearchX, type LucideIcon } from 'lucide-react';
import type { SettingsSectionConfig } from '../settings.registry';

export interface JumpGroup {
  id: string;
  name: string;
  icon: LucideIcon;
  sections: SettingsSectionConfig[];
}

interface SettingsJumpMenuProps {
  groups: JumpGroup[];
  current?: SettingsSectionConfig;
  onSelect: (path: string) => void;
}

/** Searchable, grouped "jump to any settings page" menu. */
export const SettingsJumpMenu: React.FC<SettingsJumpMenuProps> = ({ groups, current, onSelect }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    searchRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const needle = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          sections: needle ? g.sections.filter((s) => s.label.toLowerCase().includes(needle) || g.name.toLowerCase().includes(needle)) : g.sections,
        }))
        .filter((g) => g.sections.length > 0),
    [groups, needle],
  );

  const pick = (path: string) => {
    setOpen(false);
    onSelect(path);
  };

  const CurrentIcon = current?.icon;

  return (
    <div ref={rootRef} className="relative w-full sm:w-72">
      <button
        type="button"
        id="master-data-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-12 w-full items-center gap-3 rounded-xl border bg-white pl-2.5 pr-3 text-left shadow-sm transition focus:outline-hidden ${
          open ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          {CurrentIcon ? <CurrentIcon className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">Jump to</span>
          <span className="block truncate text-sm font-semibold text-slate-900">{current?.label ?? 'Select a page'}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-[18rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-150 sm:w-[22rem]">
          <div className="border-b border-slate-100 p-2.5">
            <label className="relative block">
              <span className="sr-only">Search settings</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered[0]) pick(filtered[0].sections[0].path);
                }}
                placeholder="Search settings..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition focus:border-blue-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/15 [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
          </div>

          <div role="listbox" aria-label="Settings pages" className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain p-1.5">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <SearchX className="h-6 w-6 text-slate-300" />
                <p className="text-[13px] text-slate-500">Nothing matches "{query}"</p>
              </div>
            )}
            {filtered.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.id} className="mb-1 last:mb-0">
                  <p className="sticky top-0 z-10 flex items-center gap-2 bg-white/95 px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 backdrop-blur-xs">
                    <GroupIcon className="h-3.5 w-3.5" />
                    {group.name}
                  </p>
                  {group.sections.map((sec) => {
                    const SecIcon = sec.icon;
                    const active = sec.id === current?.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => pick(sec.path)}
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <SecIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className={`flex-1 truncate text-[13.5px] ${active ? 'font-semibold text-blue-700' : 'font-medium text-slate-700'}`}>{sec.label}</span>
                        {active && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
