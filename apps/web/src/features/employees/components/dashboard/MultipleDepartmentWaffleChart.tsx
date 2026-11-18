import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Layers, ArrowUpRight, ChevronDown } from 'lucide-react';
import {
  MultipleDepartmentCategoryItem,
  EmployeeDashboardFilters,
} from './dashboard.types';

interface MultipleDepartmentWaffleChartProps {
  categories: MultipleDepartmentCategoryItem[];
  totalEligible: number;
  filters: EmployeeDashboardFilters;
}

/** Employees by number of departments, shown as a horizontal bar chart. */
export const MultipleDepartmentWaffleChart: React.FC<MultipleDepartmentWaffleChartProps> = ({
  categories,
  totalEligible,
  filters,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredCategoryKey, setHoveredCategoryKey] = useState<string | null>(null);
  // Which bar is expanded to list its employees; "Two departments" starts open
  const [openKey, setOpenKey] = useState<string | null>('two');

  const handleAllView = () => {
    const params = new URLSearchParams();
    params.set('status', 'Active');
    if (filters.department !== 'All') params.set('dep_id', filters.department);
    if (filters.designation !== 'All') params.set('role_id', filters.designation);
    if (filters.search) params.set('q', filters.search);
    navigate(`/admin/employees?${params.toString()}`);
  };

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-shadow hover:shadow-md sm:p-5 h-full">
      {/* Card Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Employees with Multiple Department Assignments
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
                Displays distribution of active employees across one, two, or three or more departments. Bar length represents the share of the eligible workforce.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="flex-1 flex flex-col justify-center py-2">
        {totalEligible === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs font-semibold text-slate-500">
              No employees found for the selected filters.
            </p>
          </div>
        ) : (
          <div className="w-full space-y-4 py-2" role="list" aria-label="Employees by number of departments">
            {categories.map((cat) => {
              const isDimmed = hoveredCategoryKey !== null && hoveredCategoryKey !== cat.key;
              const canExpand = cat.count > 0;
              const isOpen = canExpand && openKey === cat.key;
              return (
                <div
                  key={cat.key}
                  role="listitem"
                  onMouseEnter={() => setHoveredCategoryKey(cat.key)}
                  onMouseLeave={() => setHoveredCategoryKey(null)}
                  className={`transition-opacity duration-150 ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                >
                  <button
                    type="button"
                    disabled={!canExpand}
                    aria-expanded={isOpen}
                    onClick={() => setOpenKey(isOpen ? null : cat.key)}
                    title={canExpand ? `Click to see who is in ${cat.label.toLowerCase()}` : undefined}
                    className={`block w-full text-left ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        {canExpand && (
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        )}
                        {cat.label}
                      </span>
                      <span className="text-slate-500">
                        <strong className="text-slate-900">{cat.count}</strong> · {cat.percentage}%
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, cat.percentage))}%`,
                          minWidth: cat.count > 0 ? '6px' : 0,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                      {cat.employees.map((emp) => (
                        <li
                          key={emp.empId}
                          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-white px-2.5 py-1.5 text-xs"
                        >
                          <span className="font-semibold text-slate-800">{emp.name}</span>
                          <span className="flex flex-wrap justify-end gap-1">
                            {emp.departments.map((d, i) => (
                              <span
                                key={d}
                                className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                                style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
                                title={i === 0 ? 'Primary department' : undefined}
                              >
                                {d}
                              </span>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
