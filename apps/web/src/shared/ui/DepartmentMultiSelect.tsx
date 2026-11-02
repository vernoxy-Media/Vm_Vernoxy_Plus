import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface DepartmentOption {
  dep_id: number;
  name: string;
}

interface DepartmentMultiSelectProps {
  departments: DepartmentOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export const DepartmentMultiSelect: React.FC<DepartmentMultiSelectProps> = ({
  departments,
  selectedIds,
  onChange,
  placeholder = 'Select Department(s)...',
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
    }
  }, [isOpen]);

  // Alphabetical sort A to Z
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => a.name.localeCompare(b.name));
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    if (!search.trim()) return sortedDepartments;
    const term = search.toLowerCase().trim();
    return sortedDepartments.filter((d) => d.name.toLowerCase().includes(term));
  }, [sortedDepartments, search]);

  const toggleDepartment = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeDepartment = (id: number) => {
    onChange(selectedIds.filter((item) => item !== id));
  };

  const selectAll = () => {
    onChange(departments.map((d) => d.dep_id));
  };

  const clearAll = () => {
    onChange([]);
  };

  // Selected department objects
  const selectedDepartments = useMemo(() => {
    return departments.filter((d) => selectedIds.includes(d.dep_id));
  }, [departments, selectedIds]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button with Tags */}
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-[44px] px-3 py-1.5 bg-slate-50 border rounded-xl text-left flex items-center justify-between gap-2 transition cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
          error ? 'border-red-400 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
        } ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500 bg-white' : ''}`}
      >
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 py-0.5">
          {selectedDepartments.length === 0 ? (
            <span className="text-[13.5px] text-slate-400 font-normal px-1">
              {placeholder}
            </span>
          ) : (
            selectedDepartments.map((dept) => (
              <span
                key={dept.dep_id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs animate-in fade-in duration-150"
              >
                <span>{dept.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDepartment(dept.dep_id);
                  }}
                  className="p-0.5 hover:text-blue-900 hover:bg-blue-200/60 rounded cursor-pointer transition-colors"
                  title={`Remove ${dept.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
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

          {/* Quick Actions (Select All / Clear) */}
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 border-b border-slate-100 pb-1.5">
            <span>
              {selectedIds.length} of {departments.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Select all
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Department List with Checkboxes */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
            {filteredDepartments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-5 font-medium">No results found</p>
            ) : (
              filteredDepartments.map((dept) => {
                const isSelected = selectedIds.includes(dept.dep_id);
                return (
                  <button
                    key={dept.dep_id}
                    type="button"
                    onClick={() => toggleDepartment(dept.dep_id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 text-blue-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="truncate">{dept.name}</span>
                      {isSelected && (
                        <span className="text-[11px] text-slate-400 font-normal shrink-0">
                          (already chosen)
                        </span>
                      )}
                    </div>

                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-red-500 font-medium mt-1">{error}</p>}
    </div>
  );
};
