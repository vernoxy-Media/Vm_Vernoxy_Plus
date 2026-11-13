import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Layers, ArrowUpRight } from 'lucide-react';
import {
  MultipleDepartmentCategoryItem,
  EmployeeDashboardFilters,
} from './dashboard.types';

interface MultipleDepartmentWaffleChartProps {
  categories: MultipleDepartmentCategoryItem[];
  totalEligible: number;
  filters: EmployeeDashboardFilters;
}

export const MultipleDepartmentWaffleChart: React.FC<MultipleDepartmentWaffleChartProps> = ({
  categories,
  totalEligible,
  filters,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredCategoryKey, setHoveredCategoryKey] = useState<string | null>(null);

  const handleAllView = () => {
    const params = new URLSearchParams();
    params.set('status', 'Active');
    if (filters.department !== 'All') params.set('dep_id', filters.department);
    if (filters.designation !== 'All') params.set('role_id', filters.designation);
    if (filters.search) params.set('q', filters.search);
    navigate(`/admin/employees?${params.toString()}`);
  };

  // Generate 100 squares for the 10x10 Waffle Chart
  // Distribute 100 squares based on percentages
  const squares: Array<{ key: string; color: string; categoryLabel: string; count: number; percentage: number }> = [];

  if (totalEligible > 0) {
    let squaresRemaining = 100;
    categories.forEach((cat, index) => {
      // For the last non-zero category, assign remaining to avoid rounding discrepancy
      let countOfSquares = Math.round((cat.count / totalEligible) * 100);
      if (index === categories.length - 1) {
        countOfSquares = Math.max(0, squaresRemaining);
      } else {
        countOfSquares = Math.min(countOfSquares, squaresRemaining);
        squaresRemaining -= countOfSquares;
      }

      for (let i = 0; i < countOfSquares; i++) {
        squares.push({
          key: cat.key,
          color: cat.color,
          categoryLabel: cat.label,
          count: cat.count,
          percentage: cat.percentage,
        });
      }
    });

    // Pad if total < 100
    while (squares.length < 100) {
      squares.push({
        key: 'empty',
        color: '#e2e8f0',
        categoryLabel: 'None',
        count: 0,
        percentage: 0,
      });
    }
  } else {
    // 100 empty placeholder squares when count is 0
    for (let i = 0; i < 100; i++) {
      squares.push({
        key: 'empty',
        color: '#f1f5f9',
        categoryLabel: 'No data',
        count: 0,
        percentage: 0,
      });
    }
  }

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              3. Employees with Multiple Department Assignments
            </h3>
            <p className="text-[11px] text-slate-500">Cross-department resource distribution</p>
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
              <p className="font-semibold text-slate-100 mb-1">Multiple Department Assignments</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Displays distribution of active employees across one, two, or three or more departments. Waffle chart squares represent proportion of eligible workforce.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Waffle Grid */}
      <div className="flex-1 flex flex-col justify-center items-center py-2">
        {totalEligible === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs font-semibold text-slate-500">
              No employees found for the selected filters.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-[280px]">
            {/* 10x10 Grid */}
            <div className="grid grid-cols-10 gap-1.5 p-2 bg-slate-50/70 rounded-xl border border-slate-100">
              {squares.map((sq, i) => {
                const isHighlighted = hoveredCategoryKey ? hoveredCategoryKey === sq.key : true;
                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: sq.color,
                      opacity: isHighlighted ? 1 : 0.25,
                    }}
                    onMouseEnter={() => sq.key !== 'empty' && setHoveredCategoryKey(sq.key)}
                    onMouseLeave={() => setHoveredCategoryKey(null)}
                    title={
                      sq.key !== 'empty'
                        ? `${sq.categoryLabel}: ${sq.count} employees (${sq.percentage}%)`
                        : 'No employees'
                    }
                    className="aspect-square rounded-[3px] transition-all duration-150 cursor-pointer hover:scale-115 hover:shadow-xs"
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Legend with Counts and Percentages */}
        <div className="mt-4 w-full space-y-1.5 border-t border-slate-100 pt-3">
          {categories.map((cat) => {
            const isHovered = hoveredCategoryKey === cat.key;
            return (
              <div
                key={cat.key}
                onMouseEnter={() => setHoveredCategoryKey(cat.key)}
                onMouseLeave={() => setHoveredCategoryKey(null)}
                className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  isHovered ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-[3px]"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-slate-700">{cat.label}:</span>
                  <span className="font-bold text-slate-900">{cat.percentage}%</span>
                </div>
                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                  {cat.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Footer / All View */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] text-slate-500">
          Total active employees: <strong className="text-slate-700">{totalEligible}</strong>
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
