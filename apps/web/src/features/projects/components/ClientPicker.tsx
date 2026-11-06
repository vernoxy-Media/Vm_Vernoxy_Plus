import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ChevronDown, Loader2, Plus, X } from 'lucide-react';
import { J_INPUT } from '@/shared/ui/JiraModal';
import { fetchClientOptions } from '../api/projects.api';
import type { ClientOption } from '../types';

interface ClientPickerProps {
  /** The client's name, which is what a project stores. */
  value: string;
  onChange: (name: string) => void;
  id?: string;
}

/**
 * Choose the client of a project from the clients the company has won, with a search box.
 * A name that is not in the list can still be typed (a client who is not in the system yet), and when the list
 * cannot be loaded for this user the field falls back to a plain text box.
 */
export const ClientPicker: React.FC<ClientPickerProps> = ({ value, onChange, id = 'project-client' }) => {
  const [options, setOptions] = useState<ClientOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    fetchClientOptions()
      .then((o) => live && setOptions(o))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (options ?? []).filter((o) => !q || o.name.toLowerCase().includes(q) || (o.client_code ?? '').toLowerCase().includes(q)).slice(0, 50),
    [options, q],
  );
  const exact = (options ?? []).some((o) => o.name.toLowerCase() === q);
  const rows: Array<{ kind: 'client'; client: ClientOption } | { kind: 'new'; name: string }> = [
    ...matches.map((client) => ({ kind: 'client' as const, client })),
    ...(q && !exact ? [{ kind: 'new' as const, name: query.trim() }] : []),
  ];

  // The list is not available for this user: a plain box still lets them type the name
  if (failed) {
    return (
      <>
        <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Acme Corp" className={J_INPUT} />
        <p className="mt-1 text-[12px] text-[#5E6C84]">The client list is not available, so type the name.</p>
      </>
    );
  }

  const choose = (name: string) => {
    onChange(name);
    setQuery('');
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(rows.length - 1, i + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    if (e.key === 'Enter' && open && rows[active]) {
      e.preventDefault();
      const r = rows[active];
      choose(r.kind === 'client' ? r.client.name : r.name);
    }
  };

  return (
    <div ref={root} className="relative">
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E6C84]" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={open ? query : value}
          placeholder={options === null ? 'Loading clients…' : 'Search clients'}
          onFocus={() => { setQuery(''); setOpen(true); setActive(0); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={onKey}
          className={`${J_INPUT} pl-8 pr-14`}
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
          {options === null && <Loader2 className="h-4 w-4 animate-spin text-[#5E6C84]" />}
          {value && (
            <button type="button" aria-label="Clear client" onClick={() => choose('')} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[3px] text-[#5E6C84] hover:bg-[rgba(9,30,66,0.08)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className="pointer-events-none h-4 w-4 text-[#5E6C84]" />
        </div>
      </div>

      {open && (
        <div role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-[3px] bg-white py-1 shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]">
          {options !== null && rows.length === 0 && (
            <p className="px-3 py-4 text-center text-[13px] text-[#5E6C84]">{options.length === 0 ? 'No clients yet. Type a name to use it.' : 'No client matches your search.'}</p>
          )}
          {rows.map((r, i) => (
            <button
              key={r.kind === 'client' ? r.client.client_id : `new-${r.name}`}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(r.kind === 'client' ? r.client.name : r.name)}
              className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[14px] ${i === active ? 'bg-[#F4F5F7]' : ''}`}
            >
              {r.kind === 'client' ? (
                <>
                  <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] bg-[#DEEBFF] text-[12px] font-bold text-[#0747A6]">{r.client.name.charAt(0).toUpperCase()}</span>
                  <span className={`min-w-0 flex-1 truncate ${r.client.name === value ? 'font-semibold text-[color:var(--ac-main,#0052CC)]' : 'text-[#172B4D]'}`}>{r.client.name}</span>
                  {r.client.client_code && <span className="shrink-0 text-[12px] text-[#5E6C84]">{r.client.client_code}</span>}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 shrink-0 text-[#5E6C84]" />
                  <span className="min-w-0 flex-1 truncate text-[#42526E]">Use “{r.name}” as a new client name</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
