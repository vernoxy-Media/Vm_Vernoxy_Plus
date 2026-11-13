import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Clock, ArrowUpRight } from 'lucide-react';
import { TenureCategoryItem, EmployeeDashboardFilters } from './dashboard.types';

interface TenureDistributionChartProps {
  categories: TenureCategoryItem[];
  totalActive: number;
  filters: EmployeeDashboardFilters;
}

export const TenureDistributionChart: React.FC<TenureDistributionChartProps> = ({
  categories,
  totalActive,
  filters,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const maxCount = Math.max(1, ...categories.map((c) => c.count));

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
      <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              6. Employee Tenure Distribution
            </h3>
            <p className="text-[11px] text-slate-500">Service duration of active workforce</p>
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
              <p className="font-semibold text-slate-100 mb-1">Employee Tenure Distribution</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Groups active employees into four completed service ranges using Joining Date. Automatically updates as time progresses. Missing or invalid joining dates are excluded.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Histogram Bar Chart */}
      <div className="flex-1 flex flex-col justify-end pt-4 pb-1">
        {totalActive === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs font-semibold text-slate-500">
              No employees found for the selected filters.
            </p>
          </div>
        ) : (
          <div className="w-full">
            {/* Chart Area */}
            <div className="relative h-40 w-full flex items-end justify-around gap-4 border-b border-slate-200 px-3 pb-1">
              {/* Reference Grid lines */}
              <div className="absolute inset-x-0 top-0 border-b border-dashed border-slate-200 pointer-events-none" />
              <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-100 pointer-events-none" />

              {categories.map((cat) => {
                const heightPct = maxCount > 0 ? (cat.count / maxCount) * 80 : 0;
                const isHovered = hoveredKey === cat.key;

                return (
                  <div
                    key={cat.key}
                    onMouseEnter={() => setHoveredKey(cat.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onClick={handleAllView}
                    className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer max-w-[64px]"
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-10 z-30 pointer-events-none px-2.5 py-1 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                        <span className="font-semibold">{cat.label}:</span>
                        <span className="font-bold text-teal-300">{cat.count} employees</span>
                        <span className="text-slate-300">({cat.percentage}%)</span>
                      </div>
                    )}

                    {/* Exact Count Above Bar */}
                    <span className="mb-1 text-xs font-bold text-slate-700 group-hover:text-teal-600 transition-colors">
                      {cat.count}
                    </span>

                    {/* Vertical Bar */}
                    <div
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                      className="w-full bg-gradient-to-t from-teal-600 to-cyan-500 rounded-t-lg transition-all duration-300 group-hover:from-teal-700 group-hover:to-cyan-600 shadow-xs"
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis Labels */}
            <div className="flex justify-around items-center pt-2 px-3">
              {categories.map((cat) => (
                <div
                  key={cat.key}
                  className={`flex-1 text-center text-xs font-semibold max-w-[64px] transition-colors ${
                    hoveredKey === cat.key ? 'text-teal-600 font-bold' : 'text-slate-600'
                  }`}
                >
                  {cat.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer / All View */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] text-slate-500">
          Active workforce with valid tenure: <strong className="text-slate-700">{totalActive}</strong>
        </span>

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
