import React, { useState } from 'react';
import { Info, FileText } from 'lucide-react';
import { RegularizationStatusSummary } from './attendance-analytics.types';

interface RegularizationStatusGridProps {
  summary: RegularizationStatusSummary;
}

export const RegularizationStatusGrid: React.FC<RegularizationStatusGridProps> = ({
  summary,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const cards = [
    {
      key: 'pending',
      label: 'Pending',
      count: summary.pendingCount,
      percentage: summary.pendingPercentage,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      badgeBg: 'bg-amber-50 border-amber-200/70',
      trackColor: 'bg-amber-100/60',
    },
    {
      key: 'approved',
      label: 'Approved',
      count: summary.approvedCount,
      percentage: summary.approvedPercentage,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 border-emerald-200/70',
      trackColor: 'bg-emerald-100/60',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      count: summary.rejectedCount,
      percentage: summary.rejectedPercentage,
      color: 'bg-rose-500',
      textColor: 'text-rose-700',
      badgeBg: 'bg-rose-50 border-rose-200/70',
      trackColor: 'bg-rose-100/60',
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      count: summary.cancelledCount,
      percentage: summary.cancelledPercentage,
      color: 'bg-slate-400',
      textColor: 'text-slate-700',
      badgeBg: 'bg-slate-50 border-slate-200/70',
      trackColor: 'bg-slate-100/60',
    },
  ];

  return (
    <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              5. Regularization Request Status
            </h3>
            <p className="text-[11px] text-slate-500">2 × 2 status breakdown with progress</p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            onClick={() => setShowInfo(!showInfo)}
            aria-label="KPI Information"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <Info className="h-4 w-4" />
          </button>

          {showInfo && (
            <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-slate-200 bg-slate-900 p-3 text-xs text-white shadow-xl">
              <p className="font-semibold text-slate-100 mb-1">Regularization Request Status</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                2 × 2 grid showing Pending, Approved, Rejected, and Cancelled requests with horizontal progress indicators. Uses latest status of unique request IDs.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2 x 2 Status Cards Grid */}
      <div className="my-3 grid grid-cols-2 gap-3">
        {cards.map((c) => {
          const isHovered = hoveredCard === c.key;

          return (
            <div
              key={c.key}
              onMouseEnter={() => setHoveredCard(c.key)}
              onMouseLeave={() => setHoveredCard(null)}
              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200/90 hover:shadow-xs transition-all relative group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${c.textColor}`}>{c.label}</span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {c.percentage}%
                </span>
              </div>

              <div className="my-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {c.count}
                </span>
              </div>

              {/* Horizontal Progress Indicator */}
              <div className={`h-1.5 w-full rounded-full ${c.trackColor} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${c.color} transition-all duration-500`}
                  style={{ width: `${Math.max(c.percentage, c.count > 0 ? 4 : 0)}%` }}
                />
              </div>

              {/* Hover Tooltip */}
              {isHovered && (
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap pointer-events-none">
                  <div className="rounded-xl bg-slate-900/95 backdrop-blur-md px-2.5 py-1 text-white shadow-xl border border-slate-700/60 text-[10px] font-semibold">
                    {c.label}: {c.count} requests ({c.percentage}% of total)
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer / Total Requests */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-500 font-medium">Total Requests</span>
        <span className="text-base font-extrabold text-slate-900">
          {summary.totalRequests.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
