import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';

export interface ManagerOption {
  emp_id: number;
  name: string;
  email?: string;
  employee_code?: string;
  role_name?: string | null;
  status?: string;
}

interface ReportingManagerSelectProps {
  options: ManagerOption[];
  value: number | string | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: string | boolean;
  className?: string;
}

const AVATAR_COLORS = [
  'bg-emerald-600 text-white',
  'bg-cyan-600 text-white',
  'bg-amber-600 text-white',
  'bg-blue-600 text-white',
  'bg-violet-600 text-white',
  'bg-rose-600 text-white',
  'bg-indigo-600 text-white',
  'bg-teal-600 text-white',
];

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index]!;
}

export const ReportingManagerSelect: React.FC<ReportingManagerSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'None / Self',
  searchPlaceholder = 'Search by name or Emp ID...',
  disabled = false,
  error,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openUpward, setOpenUpward] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // When opened, focus search input and calculate flip direction if close to bottom
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpward(spaceBelow < 300 && rect.top > 300);
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
    }
  }, [isOpen]);

  const selectedManager = useMemo(() => {
    if (!value) return null;
    return options.find((opt) => String(opt.emp_id) === String(value)) || null;
  }, [options, value]);

  // Alphabetical sort A to Z
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => a.name.localeCompare(b.name));
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return sortedOptions;
    const term = searchTerm.toLowerCase().trim();
    return sortedOptions.filter((opt) => {
      const empCode = opt.employee_code || `EMP-${String(opt.emp_id).padStart(4, '0')}`;
      return (
        opt.name.toLowerCase().includes(term) ||
        empCode.toLowerCase().includes(term) ||
        String(opt.emp_id).includes(term) ||
        (opt.role_name && opt.role_name.toLowerCase().includes(term))
      );
    });
  }, [sortedOptions, searchTerm]);

  const handleSelect = (empId: number | null) => {
    onChange(empId);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && isOpen) {
          setIsOpen(false);
        }
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-left transition-all rounded-xl border bg-slate-50 px-3.5 py-2.5 text-[13.5px] font-medium text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer ${
          error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
        } ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500 bg-white' : ''} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          {selectedManager ? (
            <span className="truncate text-slate-900 font-semibold">
              {selectedManager.name}{' '}
              <span className="text-slate-500 font-normal">
                ({selectedManager.employee_code || `EMP-${String(selectedManager.emp_id).padStart(4, '0')}`})
              </span>
            </span>
          ) : (
            <span className="truncate text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl transition-all ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
          role="listbox"
        >
          {/* Search Bar */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder:text-slate-400 transition"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0]!.emp_id);
                  }
                }
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* None / Self Option */}
          <div className="mb-1 border-b border-slate-100 pb-1">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center justify-between text-left px-3 py-2 text-xs rounded-xl transition ${
                !value
                  ? 'bg-blue-50/80 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-medium">None / Self</span>
                  <span className="block text-[11px] text-slate-400 font-normal">Top level reporting</span>
                </div>
              </div>
              {!value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 py-0.5 custom-scrollbar pr-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                No results found
              </div>
            ) : (
              filteredOptions.map((mgr) => {
                const isSelected = String(mgr.emp_id) === String(value);
                const empCode = mgr.employee_code || `EMP-${String(mgr.emp_id).padStart(4, '0')}`;
                const isInactive = mgr.status && mgr.status.toLowerCase() === 'inactive';
                const avatarColor = getAvatarColor(mgr.name);

                return (
                  <button
                    key={mgr.emp_id}
                    type="button"
                    onClick={() => handleSelect(mgr.emp_id)}
                    className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 text-blue-700'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                      {/* Avatar Circle */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor}`}
                      >
                        {getInitials(mgr.name)}
                      </div>

                      {/* Text info */}
                      <div className="overflow-hidden">
                        <span className="block text-xs font-bold text-slate-900 truncate">
                          {mgr.name}
                        </span>
                        <span className="block text-[11px] text-slate-500 font-normal truncate">
                          {empCode}
                          {mgr.role_name ? ` · ${mgr.role_name}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Right side: Inactive badge or Check */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isInactive && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

