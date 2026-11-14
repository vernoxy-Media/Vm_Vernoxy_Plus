import React, { useState } from 'react';
import { Info, BarChart } from 'lucide-react';
import { US05LeadSourcePerformance } from '../../types/sales-dashboard.types';

interface LeadSourcePerformanceBarChartProps {
  data?: US05LeadSourcePerformance;
}

export const LeadSourcePerformanceBarChart: React.FC<LeadSourcePerformanceBarChartProps> = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredSource, setHoveredSource] = useState<any | null>(null);

  const sources = data?.sources || [];
  const maxLeads = Math.max(...sources.map((s) => s.leads), 1);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <BarChart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Lead Source Performance</h3>
            <p className="text-[11px] text-slate-500">Leads, converted and lost by source</p>
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
              Clustered horizontal bars comparing all 8 lead sources: Leads (indigo), Converted (green) and Lost (red), with overall conversion rate % at the end.
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-slate-600 my-2">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-xs bg-indigo-600" /> Leads
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-xs bg-emerald-500" /> Converted
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-xs bg-rose-500" /> Lost
        </span>
        {hoveredSource && (
          <div className="text-center text-[10px] font-bold text-slate-700">
            {hoveredSource.source}: {hoveredSource.leads} leads ({hoveredSource.converted} won, {hoveredSource.lost} lost, {hoveredSource.open} open)
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="space-y-2.5 my-2">
        {sources.map((s, idx) => {
          const leadWidth = Math.round((s.leads / maxLeads) * 100);
          const convWidth = Math.round((s.converted / maxLeads) * 100);
          const lostWidth = Math.round((s.lost / maxLeads) * 100);

          return (
            <div
              key={idx}
              className="group flex flex-col gap-1 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              onMouseEnter={() => setHoveredSource(s)}
              onMouseLeave={() => setHoveredSource(null)}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 truncate max-w-[130px]">{s.source}</span>
                <span className="text-[10px] font-bold text-slate-900">
                  {s.conversion_rate !== null ? `${s.conversion_rate}% conv.` : 'N/A'}
                </span>
              </div>

              {/* Three clustered bars */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${Math.max(leadWidth, 2)}%` }} />
                  <span className="text-[9px] font-bold text-indigo-700">{s.leads}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.max(convWidth, s.converted > 0 ? 2 : 0)}%` }} />
                  <span className="text-[9px] font-bold text-emerald-700">{s.converted}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 rounded-full bg-rose-500 transition-all duration-300" style={{ width: `${Math.max(lostWidth, s.lost > 0 ? 2 : 0)}%` }} />
                  <span className="text-[9px] font-bold text-rose-700">{s.lost}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 text-center">
        Sorted from most leads to fewest
      </div>
    </div>
  );
};
