import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

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

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleDepartment = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onChange(departments.map((d) => d.dep_id));
  };

  const clearAll = () => {
    onChange([]);
  };

  // Label for the trigger
  const selectedDepartments = departments.filter((d) => selectedIds.includes(d.dep_id));

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-left flex items-center justify-between transition cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
          error ? 'border-red-400 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 mr-2">
          {selectedDepartments.length === 0 ? (
            <span className="text-xs sm:text-sm text-slate-400 font-normal truncate">
              {placeholder}
            </span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                {selectedDepartments.length === 1
                  ? selectedDepartments[0].name
                  : `${selectedDepartments[0].name}, ${selectedDepartments[1].name}${
                      selectedDepartments.length > 2
                        ? ` (+${selectedDepartments.length - 2} more)`
                        : ''
                    }`}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                {selectedDepartments.length}
              </span>
            </div>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
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
          <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
            {filteredDepartments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No departments found</p>
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
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </div>
                      <span className="truncate">{dept.name}</span>
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
