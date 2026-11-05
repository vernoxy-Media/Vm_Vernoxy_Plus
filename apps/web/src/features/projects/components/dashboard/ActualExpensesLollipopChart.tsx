import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, Receipt, ArrowUpRight } from 'lucide-react';
import {
  computeActualExpenses,
  ProjectExpenseItem,
} from './project-dashboard.utils';
import { EnrichedProjectItem } from './project-dashboard.types';

interface ActualExpensesLollipopChartProps {
  projects: EnrichedProjectItem[];
}

export const ActualExpensesLollipopChart: React.FC<ActualExpensesLollipopChartProps> = ({
  projects,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredExpense, setHoveredExpense] = useState<ProjectExpenseItem | null>(null);

  const { totalExpense, totalExpenseFormatted, items } = computeActualExpenses(projects);
  const displayed = items.slice(0, 7);

  const maxExpense = Math.max(...displayed.map((i) => i.actualExpense), 100000);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              8. Actual Expenses by Project
            </h3>
            <p className="text-[11px] text-slate-500">
              Total Portfolio Expense: <span className="font-bold text-slate-800">{totalExpenseFormatted}</span>
            </p>
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
              <p className="font-semibold text-slate-100 mb-1">Actual Expenses by Project</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Sum of approved expense records for each project in ₹ Lakh. Sorted highest to lowest. Shows share of total portfolio expenditure.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lollipop Chart Visual */}
      <div className="my-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {displayed.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-slate-400">
            No expense records found
          </div>
        ) : (
          displayed.map((item) => {
            const widthPercent = (item.actualExpense / maxExpense) * 75;

            return (
              <div
                key={item.projectId}
                className="space-y-1 relative group cursor-pointer"
                onMouseEnter={() => setHoveredExpense(item)}
                onMouseLeave={() => setHoveredExpense(null)}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={item.projectName}>
                    {item.projectName}
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {item.expenseInLakh}
                  </span>
                </div>

                {/* Lollipop Line + Circle Marker */}
                <div className="relative h-2 w-full bg-slate-50 rounded-full flex items-center">
                  {/* Stem Line */}
                  <div
                    className="h-1 bg-indigo-300 rounded-l-full transition-all duration-300"
                    style={{ width: `${Math.max(widthPercent, 2)}%` }}
                  ></div>

                  {/* Lollipop Circle Marker */}
                  <div
                    className="w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs -ml-1 transition-all duration-300 shrink-0"
                    title={`${item.projectName}: ${item.expenseInLakh}`}
                  ></div>
                </div>

                {/* Tooltip */}
                {hoveredExpense?.projectId === item.projectId && (
                  <div className="absolute left-1/2 -top-8 -translate-x-1/2 z-20 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white shadow-md pointer-events-none">
                    {item.projectName}: {item.expenseInLakh} (₹{item.actualExpense.toLocaleString('en-IN')}) &bull; {item.shareOfTotal}% of total
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer / All View */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-[11px] text-slate-500">
          Total: ₹{totalExpense.toLocaleString('en-IN')}
        </span>
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
        >
          <span>All View</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
