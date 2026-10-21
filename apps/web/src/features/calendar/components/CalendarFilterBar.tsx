import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Users, Check, ChevronDown, Search } from 'lucide-react';
import type { AssignableEmployee } from '../api/calendar.api';

export interface CalendarFilters {
  datePreset: 'all' | 'today' | 'yesterday';
  stage: 'all' | 'requested' | 'completed';
  projectId: number | 'all';
  taskTypeId: number | 'all';
  priority: string;
  selectedEmployeeIds: number[];
}

interface CalendarFilterBarProps {
  filters: CalendarFilters;
  onChange: (filters: CalendarFilters) => void;
  onReset: () => void;
  isAdmin: boolean;
  employees: AssignableEmployee[];
  taskTypes?: Array<{ id: number; label: string }>;
}

export const CalendarFilterBar: React.FC<CalendarFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  isAdmin,
  employees,
  taskTypes = [],
}) => {
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.email.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const toggleEmployee = (empId: number) => {
    const isSelected = filters.selectedEmployeeIds.includes(empId);
    let updated: number[];
    if (isSelected) {
      updated = filters.selectedEmployeeIds.filter((id) => id !== empId);
    } else {
      updated = [...filters.selectedEmployeeIds, empId];
    }
    onChange({ ...filters, selectedEmployeeIds: updated });
  };

  const selectAllEmployees = () => {
    onChange({ ...filters, selectedEmployeeIds: employees.map((e) => e.emp_id) });
  };

  const clearEmployees = () => {
    onChange({ ...filters, selectedEmployeeIds: [] });
  };

  const hasActiveFilters =
    filters.datePreset !== 'all' ||
    filters.stage !== 'all' ||
    filters.projectId !== 'all' ||
    filters.taskTypeId !== 'all' ||
    filters.priority !== 'all' ||
    (isAdmin && filters.selectedEmployeeIds.length > 0 && filters.selectedEmployeeIds.length < employees.length);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Date presets */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => onChange({ ...filters, datePreset: 'all' })}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              filters.datePreset === 'all'
                ? 'bg-white text-slate-800 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Month
          </button>
          <button
            onClick={() => onChange({ ...filters, datePreset: 'today' })}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              filters.datePreset === 'today'
                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onChange({ ...filters, datePreset: 'yesterday' })}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              filters.datePreset === 'yesterday'
                ? 'bg-white text-slate-800 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Yesterday
          </button>
        </div>

        {/* Stage Filter */}
        <select
          value={filters.stage}
          onChange={(e) => onChange({ ...filters, stage: e.target.value as any })}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Stage: All (Submitted & Approved)</option>
          <option value="requested">🟠 Submitted Only</option>
          <option value="completed">🟢 Approved Only</option>
        </select>

        {/* Priority Filter */}
        <select
          value={filters.priority}
          onChange={(e) => onChange({ ...filters, priority: e.target.value })}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Priority: All</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Task Type Filter if provided */}
        {taskTypes.length > 0 && (
          <select
            value={filters.taskTypeId}
            onChange={(e) =>
              onChange({
                ...filters,
                taskTypeId: e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10),
              })
            }
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Task Type: All</option>
            {taskTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        )}

        {/* Admin Multi-Select Employee Filter */}
        {isAdmin && employees.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
              className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {filters.selectedEmployeeIds.length === 0 || filters.selectedEmployeeIds.length === employees.length
                  ? 'Employees: All'
                  : `Employees: (${filters.selectedEmployeeIds.length})`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isEmployeeDropdownOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
                  <span className="font-bold text-slate-700">Filter Employees</span>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllEmployees}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      All
                    </button>
                    <button
                      onClick={clearEmployees}
                      className="text-slate-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredEmployees.map((emp) => {
                    const isChecked = filters.selectedEmployeeIds.includes(emp.emp_id);
                    return (
                      <div
                        key={emp.emp_id}
                        onClick={() => toggleEmployee(emp.emp_id)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {emp.name.charAt(0)}
                          </div>
                          <span className="truncate font-medium">{emp.name}</span>
                        </div>
                        {isChecked && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <p className="text-center text-slate-400 py-2">No employees found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reset Filter Button */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Filters
        </button>
      )}
    </div>
  );
};
