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
      if (max === 1) {
        onChange([id]);
        setIsOpen(false);
        return;
      }
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
          <label className="block text-[12px] font-semibold text-[#5E6C84]">
            {label} {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </label>
          <span className="text-[12px] text-[#7A869A]">At least 1 required</span>
        </div>
      )}

      {/* Selected tags container & trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-h-[36px] w-full rounded-[3px] border-2 p-1 flex flex-wrap items-center gap-1.5 cursor-pointer transition-colors ${
          isOpen ? 'border-[color:var(--ac-400,#4C9AFF)] bg-white' : 'border-[#DFE1E6] bg-[#FAFBFC] hover:bg-[#EBECF0]'
        } ${error ? 'border-[#FF8F73]' : ''}`}
      >
        {selectedEmployees.length === 0 ? (
          <span className="flex items-center gap-2 px-1.5 text-[14px] text-[#7A869A]">
            <Users className="w-4 h-4" /> Select assignees...
          </span>
        ) : (
          selectedEmployees.map((e) => (
            <span
              key={e.emp_id}
              className="inline-flex items-center gap-1.5 rounded-[3px] bg-[#DFE1E6] pl-1 pr-1.5 py-0.5 text-[13px] font-medium text-[#172B4D]"
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
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-[3px] bg-white shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-[3px] border-2 border-[#DFE1E6] py-1 pl-8 pr-3 text-[13px] focus:border-[color:var(--ac-400,#4C9AFF)] focus:outline-none"
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
                    className={`flex items-center justify-between p-2.5 text-xs cursor-pointer hover:bg-[#F4F5F7] transition-colors ${
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

      {error && <p role="alert" className="mt-1 text-[12px] text-[#BF2600]">{error}</p>}
    </div>
  );
};
