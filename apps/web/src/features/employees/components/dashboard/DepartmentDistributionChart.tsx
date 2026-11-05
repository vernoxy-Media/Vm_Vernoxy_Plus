import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Building2, ArrowUpRight } from 'lucide-react';
import { DepartmentDistributionItem, EmployeeDashboardFilters } from './dashboard.types';

interface DepartmentDistributionChartProps {
  departments: DepartmentDistributionItem[];
  filters: EmployeeDashboardFilters;
}

export const DepartmentDistributionChart: React.FC<DepartmentDistributionChartProps> = ({
  departments,
  filters,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxCount = Math.max(1, ...departments.map((d) => d.count));
  const totalCount = departments.reduce((acc, curr) => acc + curr.count, 0);

  const handleAllView = (depId?: number) => {
    const params = new URLSearchParams();
    params.set('status', 'Active');
    if (depId) params.set('dep_id', String(depId));
    else if (filters.department !== 'All') params.set('dep_id', filters.department);
    if (filters.search) params.set('q', filters.search);
    navigate(`/admin/employees?${params.toString()}`);
  };

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              2. Department-wise Employee Distribution
            </h3>
            <p className="text-[11px] text-slate-500">Active employees across nine departments</p>
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
              <p className="font-semibold text-slate-100 mb-1">Department Distribution</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Shows active employees assigned to each department in predefined Department Master order. Employees with multiple departments are counted once under each assigned department.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Bar Chart */}
      <div className="flex-1 space-y-2 py-1">
        {departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs font-semibold text-slate-500">
              No employees found for the selected filters.
            </p>
          </div>
        ) : (
          departments.map((item, idx) => {
            const widthPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.departmentName}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleAllView(item.depId)}
                className="group relative flex items-center gap-2 cursor-pointer py-0.5 rounded-lg hover:bg-slate-50/80 px-1 transition-colors"
                title={`${item.departmentName}: ${item.count} Active employees (${item.percentage}%)`}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute right-2 -top-7 z-30 pointer-events-none px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg flex items-center gap-2 whitespace-nowrap">
                    <span className="font-semibold">{item.departmentName}:</span>
                    <span className="font-bold text-blue-300">{item.count} active</span>
                    <span className="text-slate-300">({item.percentage}%)</span>
                  </div>
                )}

                {/* Y-axis: Department Name */}
                <div className="w-36 shrink-0 text-right text-[11.5px] font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                  {item.departmentName}
                </div>

                {/* Horizontal Bar Track */}
                <div className="flex-1 h-5 bg-slate-100 rounded-md overflow-hidden relative flex items-center">
                  {item.count > 0 ? (
                    <div
                      style={{ width: `${Math.max(4, widthPct)}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md transition-all duration-300 group-hover:from-blue-600 group-hover:to-indigo-700"
                    />
                  ) : (
                    <div className="h-full w-0" />
                  )}
                </div>

                {/* X-axis Count Label */}
                <div className="w-7 shrink-0 text-left text-xs font-bold text-slate-800">
                  {item.count}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Card Footer / All View */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] text-slate-500">
          Total department allocations: <strong className="text-slate-700">{totalCount}</strong>
        </span>

        <button
          type="button"
          onClick={() => handleAllView()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <span>All View</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
