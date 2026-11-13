import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Users, ArrowUpRight } from 'lucide-react';
import { EmployeeDashboardFilters } from './dashboard.types';

interface ActiveEmployeeCountCardProps {
  count: number;
  filters: EmployeeDashboardFilters;
}

export const ActiveEmployeeCountCard: React.FC<ActiveEmployeeCountCardProps> = ({
  count,
  filters,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleAllView = () => {
    const params = new URLSearchParams();
    params.set('status', 'Active');
    if (filters.search) params.set('q', filters.search);
    if (filters.department !== 'All') params.set('dep_id', filters.department);
    if (filters.designation !== 'All') params.set('role_id', filters.designation);
    navigate(`/admin/employees?${params.toString()}`);
  };

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">1. Active Employee Count</h3>
            <p className="text-[11px] text-slate-500">Currently active workforce</p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            aria-label="KPI Information"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>

          {showTooltip && (
            <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
              <p className="font-semibold text-slate-100 mb-1">Active Employee Count</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Displays the total number of employees currently working in the company. Each active employee is counted once using their unique Emp ID. Inactive employees are excluded.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main KPI Value */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-4">
        <p className="text-xs font-medium text-slate-500 mb-2">Currently active employees</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight">
            {count}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Active
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          {count === 1 ? '1 active team member' : `${count} active team members across organization`}
        </p>
      </div>

      {/* Card Footer / All View */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Status:</span>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            Active Only
          </span>
        </div>

        <button
          type="button"
          onClick={handleAllView}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <span>All View</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
