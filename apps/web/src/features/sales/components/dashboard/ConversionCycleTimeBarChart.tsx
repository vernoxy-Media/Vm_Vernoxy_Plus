import React, { useState } from 'react';
import { Info, Clock } from 'lucide-react';
import { US08LeadConversionCycleTime } from '../../types/sales-dashboard.types';

interface ConversionCycleTimeBarChartProps {
  data?: US08LeadConversionCycleTime;
  compareBy: 'source' | 'owner';
  onCompareByChange: (c: 'source' | 'owner') => void;
}

export const ConversionCycleTimeBarChart: React.FC<ConversionCycleTimeBarChartProps> = ({
  data,
  compareBy,
  onCompareByChange,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState<any | null>(null);

  const groups = data?.groups || [];
  const maxDays = Math.max(...groups.map((g) => g.average_days), 10);
  const overallAvg = data?.overall_average_days || 0;
  const overallMedian = data?.overall_median_days || 0;

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Lead Conversion Cycle Time</h3>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                Avg: {overallAvg}d | Med: {overallMedian}d
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Days taken to convert from Date Added to Won On</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => onCompareByChange('source')}
              className={`rounded px-1.5 py-0.5 transition cursor-pointer ${
                compareBy === 'source' ? 'bg-white font-bold text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Source
            </button>
            <button
              type="button"
              onClick={() => onCompareByChange('owner')}
              className={`rounded px-1.5 py-0.5 transition cursor-pointer ${
                compareBy === 'owner' ? 'bg-white font-bold text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Owner
            </button>
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
                Horizontal bar chart showing average conversion cycle time in whole calendar days (Won on - Date Added). Fastest groups appear first.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-3 my-3">
        {hoveredGroup && (
          <div className="text-center text-[10px] font-bold text-slate-700">
            {hoveredGroup.name}: avg {hoveredGroup.average_days}d, med {hoveredGroup.median_days}d, range {hoveredGroup.min_days}d - {hoveredGroup.max_days}d ({hoveredGroup.converted_count} won)
          </div>
        )}

        {groups.map((g, idx) => {
          const widthPct = Math.round((g.average_days / maxDays) * 100);
          return (
            <div
              key={idx}
              className="group flex flex-col gap-1 cursor-pointer"
              onMouseEnter={() => setHoveredGroup(g)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                  {g.name} <span className="text-[10px] text-slate-400 font-normal">(n={g.converted_count})</span>
                </span>
                <span className="font-bold text-slate-900">{g.average_days} days</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-300 group-hover:bg-sky-600"
                  style={{ width: `${Math.max(widthPct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 text-center">
        Fastest converting {compareBy === 'source' ? 'sources' : 'owners'} appear at top
      </div>
    </div>
  );
};
