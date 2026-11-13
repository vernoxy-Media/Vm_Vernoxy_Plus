import React, { useState } from 'react';
import { Info, GitCommit } from 'lucide-react';
import { US06ServiceFitDemand } from '../../types/sales-dashboard.types';

interface ServiceFitDemandDumbbellChartProps {
  data?: US06ServiceFitDemand;
}

export const ServiceFitDemandDumbbellChart: React.FC<ServiceFitDemandDumbbellChartProps> = ({ data }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredService, setHoveredService] = useState<any | null>(null);

  const services = data?.services || [];
  const maxLeads = Math.max(...services.map((s) => s.leads), 1);

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <GitCommit className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Service Fit Demand</h3>
            <p className="text-[11px] text-slate-500">Interest vs conversion gap across services</p>
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
              Dumbbell chart showing the gap between interest (indigo dot) and conversions (green dot). If a lead has multiple services, it is counted under each.
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-slate-600 my-2">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Leads (Demand)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Converted
        </span>
        {hoveredService && (
          <div className="text-center text-[10px] font-bold text-slate-700">
            {hoveredService.service}: {hoveredService.leads} leads ({hoveredService.converted} converted)
          </div>
        )}
      </div>

      {/* Dumbbell Rows */}
      <div className="space-y-4 my-3 px-2">
        {services.map((s, idx) => {
          const leadPos = Math.round((s.leads / maxLeads) * 80) + 10;
          const convPos = Math.round((s.converted / maxLeads) * 80) + 10;
          const minPos = Math.min(leadPos, convPos);
          const widthGap = Math.max(Math.abs(leadPos - convPos), 2);

          return (
            <div
              key={idx}
              className="flex flex-col gap-1 cursor-pointer group"
              onMouseEnter={() => setHoveredService(s)}
              onMouseLeave={() => setHoveredService(null)}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-800 truncate max-w-[150px]">{s.service}</span>
                <span className="text-[10px] font-bold text-slate-900">
                  {s.leads} leads / {s.converted} won{' '}
                  <span className="text-emerald-600">({s.conversion_rate !== null ? `${s.conversion_rate}%` : 'N/A'})</span>
                </span>
              </div>

              {/* Dumbbell bar */}
              <div className="relative h-6 w-full flex items-center">
                <div className="absolute inset-x-0 h-1 bg-slate-100 rounded-full" />
                {/* Connecting Line between the two dots */}
                <div
                  className="absolute h-1 bg-slate-400/80 rounded-full transition-all duration-300"
                  style={{ left: `${minPos}%`, width: `${widthGap}%` }}
                />
                {/* Converted Dot (Green) */}
                <div
                  className="absolute h-3.5 w-3.5 -ml-1.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs transition-all duration-300 group-hover:scale-110"
                  style={{ left: `${convPos}%` }}
                />
                {/* Leads Dot (Indigo) */}
                <div
                  className="absolute h-3.5 w-3.5 -ml-1.5 rounded-full bg-indigo-600 border-2 border-white shadow-xs transition-all duration-300 group-hover:scale-110"
                  style={{ left: `${leadPos}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 text-center">
        The longer the line between dots, the larger the conversion gap
      </div>
    </div>
  );
};
