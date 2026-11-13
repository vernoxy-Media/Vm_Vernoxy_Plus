import React, { useState } from 'react';
import { Info, TrendingUp, AlertCircle } from 'lucide-react';
import { US11SalesProfitability } from '../../types/sales-dashboard.types';

interface SalesProfitabilityComboChartProps {
  data?: US11SalesProfitability;
}

export const SalesProfitabilityComboChart: React.FC<SalesProfitabilityComboChartProps> = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<any | null>(null);

  const months = data?.months || [];
  const totalProfitInr = data?.total_profit_inr || 0;
  const overallMargin = data?.overall_profit_margin_pct;
  const excludedCount = data?.excluded_leads_count || 0;

  const maxAmountLakh = Math.max(
    ...months.map((m) => Math.max(m.revenue_lakh, m.cost_lakh)),
    10
  );

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Sales Profitability</h3>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  totalProfitInr >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                Profit: ₹{(totalProfitInr / 100000).toFixed(2)} L ({overallMargin !== null ? `${overallMargin}%` : 'N/A'})
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Revenue, cost and profit margin % across months</p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label="KPI Information"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-7 z-30 w-72 rounded-xl bg-slate-900 p-2.5 text-[11px] text-white shadow-xl">
              Combo chart comparing Revenue (indigo columns) and Cost (amber columns) against Profit Margin % (green line). Converted leads with missing cost are excluded.
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-slate-600 my-2">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-xs bg-indigo-600" /> Revenue (₹ L)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" /> Cost (₹ L)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-4 rounded-full bg-emerald-500" /> Profit Margin %
        </span>
      </div>

      {/* Combo Chart Visualization */}
      <div className="my-2">
        {hoveredMonth && (
          <div className="text-center text-[10px] font-bold text-slate-700 mb-1">
            {hoveredMonth.month}: Rev ₹{hoveredMonth.revenue_inr.toLocaleString()}, Cost ₹{hoveredMonth.cost_inr.toLocaleString()}, Profit ₹{hoveredMonth.profit_inr.toLocaleString()}{' '}
            • Margin: <span className={hoveredMonth.profit_inr >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {hoveredMonth.profit_margin_pct !== null ? `${hoveredMonth.profit_margin_pct}%` : 'N/A'}
            </span>
          </div>
        )}

        <div className="flex items-end justify-between gap-2 h-36 px-2 border-b border-slate-200">
          {months.map((m, idx) => {
            const revHeight = Math.round((m.revenue_lakh / maxAmountLakh) * 100);
            const costHeight = Math.round((m.cost_lakh / maxAmountLakh) * 100);

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                onMouseEnter={() => setHoveredMonth(m)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {m.profit_margin_pct !== null && (
                  <span className={`text-[9px] font-extrabold mb-1 ${m.profit_margin_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.profit_margin_pct}%
                  </span>
                )}
                <div className="flex items-end gap-1 w-full justify-center">
                  {/* Revenue Column */}
                  <div
                    className="w-1/2 max-w-[14px] rounded-t bg-indigo-600 transition-all duration-300 group-hover:bg-indigo-700"
                    style={{ height: `${Math.max(revHeight, 2)}%` }}
                  />
                  {/* Cost Column */}
                  <div
                    className="w-1/2 max-w-[14px] rounded-t bg-amber-500 transition-all duration-300 group-hover:bg-amber-600"
                    style={{ height: `${Math.max(costHeight, 2)}%` }}
                  />
                </div>
                <span className="text-[9px] font-semibold text-slate-500 truncate max-w-[40px] mt-1">{m.month.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {excludedCount > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-0.5 my-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{excludedCount} converted leads excluded because product/production cost is missing.</span>
        </div>
      )}

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 text-center">
        Negative margins indicate operating losses (shown in red)
      </div>
    </div>
  );
};
