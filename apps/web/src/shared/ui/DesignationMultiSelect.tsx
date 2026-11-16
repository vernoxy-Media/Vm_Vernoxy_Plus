import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface DesignationOption {
  role_id: number;
  role_name: string;
  dep_id?: number;
  dep_name?: string;
}

interface DesignationMultiSelectProps {
  /** Designations that can be picked: only those of the selected departments should be passed in. */
  roles: DesignationOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  /** Shown when no department has been chosen yet. */
  emptyHint?: string;
}

/**
 * Multi-select for designations, grouped by department. The first one picked is the primary designation.
 * Mirrors DepartmentMultiSelect so both fields look and behave the same.
 */
export const DesignationMultiSelect: React.FC<DesignationMultiSelectProps> = ({
  roles,
  selectedIds,
  onChange,
  placeholder = 'Select Designation(s)...',
  error,
  disabled = false,
  emptyHint = 'Select a department first to see its designations',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => searchInputRef.current?.focus(), 30);
  }, [isOpen]);

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const map = new Map<string, DesignationOption[]>();
    [...roles]
      .sort((a, b) => a.role_name.localeCompare(b.role_name))
      .filter((r) => !term || r.role_name.toLowerCase().includes(term) || (r.dep_name || '').toLowerCase().includes(term))
      .forEach((r) => {
        const key = r.dep_name || 'Other';
        map.set(key, [...(map.get(key) || []), r]);
      });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [roles, search]);

  const toggle = (id: number) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  // Keep the order the user picked them in, so the first chip is the primary designation
  const selectedRoles = useMemo(
    () => selectedIds.map((id) => roles.find((r) => r.role_id === id)).filter(Boolean) as DesignationOption[],
    [roles, selectedIds],
  );

  const noDepartment = roles.length === 0 && selectedIds.length === 0;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && setIsOpen((p) => !p)}
        className={`w-full min-h-[44px] px-3 py-1.5 bg-slate-50 border rounded-xl text-left flex items-center justify-between gap-2 transition focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
          disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
        } ${error ? 'border-red-400 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'} ${
          isOpen ? 'ring-2 ring-blue-500/20 border-blue-500 bg-white' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 py-0.5">
          {selectedRoles.length === 0 ? (
            <span className="text-[13.5px] text-slate-400 font-normal px-1">
              {noDepartment ? emptyHint : placeholder}
            </span>
          ) : (
            selectedRoles.map((r, i) => (
              <span
                key={r.role_id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200/80 shadow-2xs"
                title={i === 0 ? 'Primary designation' : undefined}
              >
                <span>{r.role_name}</span>
                {r.dep_name && <span className="font-normal text-violet-500">· {r.dep_name}</span>}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(r.role_id);
                    }}
                    className="p-0.5 hover:text-violet-900 hover:bg-violet-200/60 rounded cursor-pointer transition-colors"
                    title={`Remove ${r.role_name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designation or department..."
              className="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-800 placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 border-b border-slate-100 pb-1.5">
            <span>
              {selectedIds.length} of {roles.length} selected
            </span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1">
            {groups.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-5 font-medium">
                {roles.length === 0 ? emptyHint : 'No results found'}
              </p>
            ) : (
              groups.map(([depName, items]) => (
                <div key={depName}>
                  <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{depName}</div>
                  {items.map((r) => {
                    const on = selectedIds.includes(r.role_id);
                    return (
                      <button
                        key={r.role_id}
                        type="button"
                        onClick={() => toggle(r.role_id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                          on ? 'bg-violet-50/70 text-violet-900 font-semibold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <span className="truncate pr-2">{r.role_name}</span>
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            on ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {on && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-red-500 font-medium mt-1">{error}</p>}
    </div>
  );
};
