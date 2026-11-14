import React, { useState } from 'react';
import { Info, IndianRupee } from 'lucide-react';
import { US10RevenueGenerated } from '../../types/sales-dashboard.types';

interface RevenueWaterfallChartProps {
  data?: US10RevenueGenerated;
}

export const RevenueWaterfallChart: React.FC<RevenueWaterfallChartProps> = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<any | null>(null);

  const months = data?.months || [];
  const totalRevLakh = data?.total_revenue_lakh || 0;
  const totalRevInr = data?.total_revenue_inr || 0;
  const withoutRevCount = data?.converted_leads_without_revenue || 0;

  const maxLakh = Math.max(totalRevLakh, 10);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <IndianRupee className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Revenue Generated</h3>
              <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                ₹{totalRevLakh} L
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Monthly revenue contribution and cumulative total</p>
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
            <div className="absolute right-0 top-7 z-30 w-64 rounded-xl bg-slate-900 p-2.5 text-[11px] text-white shadow-xl">
              Waterfall chart displaying how each month adds to overall revenue. Each monthly step floats on the running total, ending with a green Total column.
            </div>
          )}
        </div>
      </div>

      {/* Waterfall Visualization */}
      <div className="my-3 flex flex-col justify-end">
        {hoveredBar && (
          <div className="text-center text-[10px] font-bold text-slate-700 mb-1.5">
            {hoveredBar.month}: <span className="text-blue-600">₹{hoveredBar.revenue_inr.toLocaleString()}</span> ({hoveredBar.revenue_lakh} L){' '}
            • Running: ₹{hoveredBar.running_total_lakh} L ({hoveredBar.converted_count} won)
          </div>
        )}

        <div className="flex items-end justify-between gap-1.5 h-36 px-2 border-b border-slate-200">
          {months.map((m, idx) => {
            const bottomPct = Math.round(((m.running_total_lakh - m.revenue_lakh) / maxLakh) * 100);
            const heightPct = Math.round((m.revenue_lakh / maxLakh) * 100);

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group relative"
                onMouseEnter={() => setHoveredBar(m)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <div className="w-full relative h-full flex flex-col justify-end">
                  <div
                    className="w-full max-w-[24px] mx-auto rounded bg-blue-600 transition-all duration-300 group-hover:bg-blue-700"
                    style={{
                      height: `${Math.max(heightPct, 3)}%`,
                      marginBottom: `${Math.max(bottomPct, 0)}%`,
                    }}
                  />
                </div>
                <span className="text-[9px] font-semibold text-slate-500 truncate max-w-[36px] mt-1">{m.month.split(' ')[0]}</span>
              </div>
            );
          })}

          {/* Final Total Column */}
          <div
            className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
            onMouseEnter={() =>
              setHoveredBar({
                month: 'Total',
                revenue_inr: totalRevInr,
                revenue_lakh: totalRevLakh,
                running_total_lakh: totalRevLakh,
                converted_count: months.reduce((a, b) => a + b.converted_count, 0),
              })
            }
            onMouseLeave={() => setHoveredBar(null)}
          >
            <div
              className="w-full max-w-[24px] rounded-t bg-emerald-500 transition-all duration-300 group-hover:bg-emerald-600"
              style={{ height: `${Math.round((totalRevLakh / maxLakh) * 100)}%` }}
            />
            <span className="text-[9px] font-bold text-emerald-700 mt-1">Total</span>
          </div>
        </div>
      </div>

      {withoutRevCount > 0 && (
        <div className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-0.5 text-center my-1">
          Note: {withoutRevCount} converted leads have no revenue amount recorded (counted as ₹0).
        </div>
      )}

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 text-center">
        Amounts in ₹ Lakh (L). Hover for full monetary values
      </div>
    </div>
  );
};
