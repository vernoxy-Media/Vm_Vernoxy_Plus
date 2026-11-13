import React, { useState } from 'react';
import { Info, MessageSquare } from 'lucide-react';
import { US09ConversationActivityTrend } from '../../types/sales-dashboard.types';

interface ConversationActivityTrendChartProps {
  data?: US09ConversationActivityTrend;
  groupBy: 'day' | 'week' | 'month';
  onGroupByChange: (g: 'day' | 'week' | 'month') => void;
}

const LINE_CONFIG = [
  { key: 'call', label: 'Call', color: '#2563eb' }, // blue
  { key: 'email', label: 'Email', color: '#10b981' }, // emerald
  { key: 'whatsapp', label: 'WhatsApp', color: '#f59e0b' }, // amber
  { key: 'meeting', label: 'Meeting', color: '#8b5cf6' }, // violet
  { key: 'site_visit', label: 'Site Visit', color: '#ec4899' }, // pink
];

export const ConversationActivityTrendChart: React.FC<ConversationActivityTrendChartProps> = ({
  data,
  groupBy,
  onGroupByChange,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  const periods = data?.periods || [];
  const peakPeriod = data?.peak_period;

  const maxVal = Math.max(...periods.map((p) => Math.max(p.call, p.email, p.whatsapp, p.meeting, p.site_visit)), 5);
  const chartWidth = 320;
  const chartHeight = 130;
  const paddingX = 20;
  const paddingY = 20;

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Conversation Activity Trend</h3>
              {peakPeriod && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Peak: {peakPeriod}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">Outreach volume across 5 conversation types</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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
              aria-label="KPI Information"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <Info className="h-4 w-4" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-7 z-30 w-64 rounded-xl bg-slate-900 p-2.5 text-[11px] text-white shadow-xl">
                Multi-series line chart with data points for Call, Email, WhatsApp, Meeting and Site Visit. Includes peak marker for busiest period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-semibold text-slate-600 my-2">
        {LINE_CONFIG.map((c) => (
          <span key={c.key} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} /> {c.label}
          </span>
        ))}
      </div>

      {/* Chart SVG */}
      <div className="my-2">
        {hoveredPoint && (
          <div className="text-center text-[10px] font-bold text-slate-700 mb-1">
            {hoveredPoint.period}: Call {hoveredPoint.call}, Email {hoveredPoint.email}, WA {hoveredPoint.whatsapp}, Meeting {hoveredPoint.meeting}, Site {hoveredPoint.site_visit} (Total {hoveredPoint.total})
          </div>
        )}

        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-36 overflow-visible">
          {/* Grid lines */}
          <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#e2e8f0" />
          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="#f1f5f9" strokeDasharray="3 3" />

          {/* Lines for each type */}
          {LINE_CONFIG.map((line) => {
            const pts = periods.map((p, idx) => {
              const val = (p as any)[line.key] || 0;
              const x = paddingX + (idx / Math.max(periods.length - 1, 1)) * (chartWidth - 2 * paddingX);
              const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - 2 * paddingY);
              return { x, y, ...p };
            });
            const dStr = pts.length > 0 ? `M ${pts.map((pt) => `${pt.x},${pt.y}`).join(' L ')}` : '';

            return (
              <g key={line.key}>
                {dStr && <path d={dStr} fill="none" stroke={line.color} strokeWidth="2" strokeLinecap="round" />}
                {pts.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.period === pt.period ? 4.5 : 2.5}
                    fill="#ffffff"
                    stroke={line.color}
                    strokeWidth="1.5"
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </g>
            );
          })}
        </svg>

        <div className="flex justify-between px-2 pt-1 text-[9px] font-medium text-slate-400">
          {periods.slice(0, 5).map((p, idx) => (
            <span key={idx} className="truncate max-w-[60px]">
              {p.period}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 text-center">
        Completed follow-ups are recorded and counted as conversations
      </div>
    </div>
  );
};
