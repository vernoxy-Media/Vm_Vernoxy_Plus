import React, { useState } from 'react';
import { Info, TrendingUp, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { US03NewLeadsAddedTrend } from '../../types/sales-dashboard.types';

interface NewLeadsTrendAreaChartProps {
  data?: US03NewLeadsAddedTrend;
  groupBy: 'day' | 'week' | 'month';
  onGroupByChange: (g: 'day' | 'week' | 'month') => void;
}

export const NewLeadsTrendAreaChart: React.FC<NewLeadsTrendAreaChartProps> = ({
  data,
  groupBy,
  onGroupByChange,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ period: string; count: number } | null>(null);

  const periods = data?.periods || [];
  const trendTag = data?.trend_tag;

  // Max value for SVG scaling
  const maxCount = Math.max(...periods.map((p) => p.count), 5);
  const chartWidth = 320;
  const chartHeight = 130;
  const paddingX = 20;
  const paddingY = 20;

  // Build SVG points
  const points = periods.map((p, idx) => {
    const x = paddingX + (idx / Math.max(periods.length - 1, 1)) * (chartWidth - 2 * paddingX);
    const y = chartHeight - paddingY - (p.count / maxCount) * (chartHeight - 2 * paddingY);
    return { x, y, period: p.period, count: p.count };
  });

  const lineD = points.length > 0 ? `M ${points.map((pt) => `${pt.x},${pt.y}`).join(' L ')}` : '';
  const areaD =
    points.length > 0
      ? `${lineD} L ${points[points.length - 1].x},${chartHeight - paddingY} L ${points[0].x},${chartHeight - paddingY} Z`
      : '';

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs h-full">
      {/* Header with Title and Trend Tag */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">New Leads Added Trend</h3>
              {trendTag && (
                <span
                  className={`inline-flex shrink-0 items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    trendTag.color === 'green'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : trendTag.color === 'red'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}
                >
                  {trendTag.arrow === 'up' && <ArrowUp className="h-2.5 w-2.5" />}
                  {trendTag.arrow === 'down' && <ArrowDown className="h-2.5 w-2.5" />}
                  {trendTag.arrow === 'horizontal' && <ArrowRight className="h-2.5 w-2.5" />}
                  <span>
                    {trendTag.category} {trendTag.is_new ? '(New)' : `${trendTag.percentage}%`}
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 line-clamp-1">Lead generation rate vs previous equivalent period</p>
          </div>
        </div>

        {/* Group By selector and Info */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-semibold">
            {(['day', 'week', 'month'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGroupByChange(g)}
                className={`rounded px-1.5 py-0.5 capitalize transition cursor-pointer ${
                  groupBy === g ? 'bg-white font-bold text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <Info className="h-4 w-4" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-7 z-30 w-64 rounded-xl bg-slate-900 p-2.5 text-[11px] text-white shadow-xl">
                Area chart showing new leads created over time. The trend tag displays percentage change vs the prior equivalent period (±5% is steady).
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Area Chart SVG */}
      <div className="my-3 flex flex-col items-center justify-center">
        {periods.length === 0 ? (
          <div className="py-10 text-xs text-slate-400">No leads found for the selected filters.</div>
        ) : (
          <div className="relative w-full">
            {hoveredPoint && (
              <div className="absolute top-0 right-2 z-10 rounded-lg bg-slate-900/90 px-2 py-1 text-[10px] font-bold text-white shadow">
                {hoveredPoint.period}: <span className="text-blue-300">{hoveredPoint.count} leads</span>
              </div>
            )}
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36 overflow-visible">
              <defs>
                <linearGradient id="leadAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="#f1f5f9" strokeDasharray="3 3" />
              <line
                x1={paddingX}
                y1={chartHeight - paddingY}
                x2={chartWidth - paddingX}
                y2={chartHeight - paddingY}
                stroke="#e2e8f0"
              />

              {/* Area & Line */}
              {areaD && <path d={areaD} fill="url(#leadAreaGradient)" />}
              {lineD && <path d={lineD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />}

              {/* Data Markers */}
              {points.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.period === pt.period ? 5 : 3.5}
                    fill="#ffffff"
                    stroke="#2563eb"
                    strokeWidth="2"
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  <text x={pt.x} y={pt.y - 7} textAnchor="middle" className="text-[9px] font-bold fill-slate-700">
                    {pt.count}
                  </text>
                </g>
              ))}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between px-2 pt-1 text-[9px] font-medium text-slate-400">
              {periods.slice(0, 5).map((p, idx) => (
                <span key={idx} className="truncate max-w-[60px]">
                  {p.period}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 text-center">
        Periods with 0 leads are plotted as 0. Grouping: {groupBy.toUpperCase()}
      </div>
    </div>
  );
};
