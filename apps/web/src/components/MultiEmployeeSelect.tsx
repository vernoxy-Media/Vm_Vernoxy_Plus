import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Users } from 'lucide-react';
import { Avatar } from './Avatar';

export interface AssignableEmployee {
  emp_id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  role_name?: string;
  department_name?: string;
}

export interface MultiEmployeeSelectProps {
  employees: AssignableEmployee[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  max?: number;
}

export const MultiEmployeeSelect: React.FC<MultiEmployeeSelectProps> = ({
  employees,
  selectedIds,
  onChange,
  label = 'Assignees',
  error,
  disabled = false,
  max = 50,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= max) return;
      onChange([...selectedIds, id]);
    }
  };

  const removeId = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((item) => item !== id));
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.role_name && e.role_name.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const selectedEmployees = employees.filter((e) => selectedIds.includes(e.emp_id));

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label} ({selectedIds.length}/{max})
          </label>
          <span className="text-xs text-slate-400">At least 1 required</span>
        </div>
      )}

      {/* Selected tags container & trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-h-[42px] w-full rounded-xl border bg-white p-1.5 flex flex-wrap items-center gap-1.5 cursor-pointer transition-all ${
          isOpen ? 'ring-2 ring-blue-100 border-blue-500' : 'border-slate-200 hover:border-slate-300'
        } ${error ? 'border-rose-400' : ''}`}
      >
        {selectedEmployees.length === 0 ? (
          <span className="text-sm text-slate-400 px-2 flex items-center gap-2">
            <Users className="w-4 h-4" /> Select assignees...
          </span>
        ) : (
          selectedEmployees.map((e) => (
            <span
              key={e.emp_id}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 text-blue-700 pl-1 pr-2 py-0.5 text-xs font-medium border border-blue-100"
            >
              <Avatar name={e.name} src={e.avatar_url} size={18} />
              <span className="truncate max-w-[120px]">{e.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(ev) => removeId(e.emp_id, ev)}
                  className="hover:text-blue-900 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {/* Dropdown popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-1">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-44 divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center">No employees found</div>
            ) : (
              filtered.map((emp) => {
                const isSelected = selectedIds.includes(emp.emp_id);
                return (
                  <div
                    key={emp.emp_id}
                    onClick={() => toggleSelect(emp.emp_id)}
                    className={`flex items-center justify-between p-2.5 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={emp.name} src={emp.avatar_url} size={28} />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{emp.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {emp.role_name || emp.department_name || emp.email}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
};
