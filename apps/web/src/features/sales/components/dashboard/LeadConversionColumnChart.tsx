import React, { useState } from 'react';
import { Info, BarChart2 } from 'lucide-react';
import { US04LeadToClientConversionTrend } from '../../types/sales-dashboard.types';

interface LeadConversionColumnChartProps {
  data?: US04LeadToClientConversionTrend;
}

export const LeadConversionColumnChart: React.FC<LeadConversionColumnChartProps> = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<any | null>(null);

  const months = data?.months || [];
  const totalConverted = data?.total_converted || 0;
  const maxVal = Math.max(...months.map((m) => m.count), 5);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Lead-to-Client Conversion Trend</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                Total: {totalConverted}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Monthly converted clients based on Won On date</p>
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
              Vertical column chart showing client acquisition output by month. Counts each converted lead once in the month of its Won On date.
            </div>
          )}
        </div>
      </div>

      {/* Columns Visual */}
      <div className="my-4 flex flex-col justify-end">
        {hoveredMonth && (
          <div className="text-center text-[11px] font-bold text-slate-700 mb-2">
            {hoveredMonth.month}: <span className="text-emerald-600">{hoveredMonth.count} clients</span>
            {hoveredMonth.change_from_prev !== undefined && (
              <span className={`ml-1 text-[10px] ${hoveredMonth.change_from_prev >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ({hoveredMonth.change_from_prev >= 0 ? `+${hoveredMonth.change_from_prev}` : hoveredMonth.change_from_prev} vs prev)
              </span>
            )}
          </div>
        )}

        <div className="flex items-end justify-between gap-2 h-36 px-2 border-b border-slate-200">
          {months.map((m, idx) => {
            const heightPct = Math.round((m.count / maxVal) * 100);
            const isHovered = hoveredMonth?.month === m.month;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group"
                onMouseEnter={() => setHoveredMonth(m)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                <span className="text-[10px] font-bold text-slate-700 opacity-80 group-hover:opacity-100">{m.count}</span>
                <div
                  className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                    isHovered ? 'bg-emerald-500 shadow-md' : 'bg-emerald-600/80 hover:bg-emerald-600'
                  }`}
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                />
                <span className="text-[9px] font-semibold text-slate-500 truncate max-w-[42px] mt-1">{m.month.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 text-center">
        Shows last 6 months client conversions
      </div>
    </div>
  );
};
