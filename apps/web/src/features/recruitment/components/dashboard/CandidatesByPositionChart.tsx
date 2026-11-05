import React, { useState } from 'react';
import { CandidateItem } from '../../hooks/use-recruitment';
import { calculatePercentage } from './dashboard.utils';

interface CandidatesByPositionChartProps {
  candidates: CandidateItem[];
}

export const CandidatesByPositionChart: React.FC<CandidatesByPositionChartProps> = ({ candidates }) => {
  const [hoveredPosition, setHoveredPosition] = useState<{
    position: string;
    count: number;
    pct: number;
    top: number;
  } | null>(null);

  const totalFiltered = candidates.length;

  // Group candidates strictly by their saved Position Applied For (role_name from candidate record)
  const positionMap = new Map<string, number>();

  candidates.forEach((c) => {
    // Note: Use candidate's role_name (Position applied for), NEVER final_role_name or employee designation!
    const positionName = (c.role_name || '').trim() || 'Unspecified';
    positionMap.set(positionName, (positionMap.get(positionName) || 0) + 1);
  });

  // Sort descending by candidate count
  const sorted = Array.from(positionMap.entries())
    .map(([position, count]) => ({ position, count }))
    .sort((a, b) => b.count - a.count);

  // Group remaining positions as "Other" if there are more than 7 positions
  let displayPositions: { position: string; count: number }[] = [];
  if (sorted.length > 7) {
    const top6 = sorted.slice(0, 6);
    const otherCount = sorted.slice(6).reduce((acc, curr) => acc + curr.count, 0);
    displayPositions = [...top6, { position: 'Other', count: otherCount }];
  } else {
    displayPositions = sorted;
  }

  const maxCount = Math.max(1, ...displayPositions.map((p) => p.count));

  const POSITION_COLORS = [
    '#2563eb', // Blue
    '#4f46e5', // Indigo
    '#7c3aed', // Violet
    '#0284c7', // Sky
    '#0d9488', // Teal
    '#059669', // Emerald
    '#d97706', // Amber
    '#94a3b8', // Slate / Other
  ];

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md h-full">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Candidates by Position</h3>
          <p className="text-xs text-slate-500 mt-0.5">Application volume per position applied for</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            {displayPositions.length} Positions
          </span>
        </div>
      </div>

      {totalFiltered === 0 || displayPositions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">No candidates found for the selected filters.</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting or clearing your filters to view data.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center space-y-3 pt-1 relative">
          {/* Tooltip Overlay */}
          {hoveredPosition && (
            <div
              className="absolute right-4 pointer-events-none z-30 px-3 py-2 bg-slate-900 text-white text-xs rounded-xl shadow-xl transition-all duration-150 animate-in fade-in"
              style={{ top: `${Math.max(10, hoveredPosition.top - 20)}px` }}
            >
              <div className="font-semibold text-slate-100 border-b border-slate-700/60 pb-1 mb-1">
                {hoveredPosition.position}
              </div>
              <div className="flex items-center justify-between gap-4 text-slate-300">
                <span>Candidates:</span>
                <span className="font-bold text-white">{hoveredPosition.count}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-slate-300">
                <span>Percentage:</span>
                <span className="font-bold text-blue-400">{hoveredPosition.pct}%</span>
              </div>
            </div>
          )}

          {displayPositions.map((item, idx) => {
            const pct = calculatePercentage(item.count, totalFiltered);
            const widthPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const barColor = item.position === 'Other' ? '#94a3b8' : POSITION_COLORS[idx % POSITION_COLORS.length];

            return (
              <div
                key={item.position}
                className="group flex items-center gap-3 cursor-pointer py-0.5"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
                  if (parentRect) {
                    setHoveredPosition({
                      position: item.position,
                      count: item.count,
                      pct,
                      top: rect.top - parentRect.top,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredPosition(null)}
              >
                {/* Position Title (Y-axis) */}
                <div className="w-36 shrink-0 text-right text-xs font-semibold text-slate-700 truncate group-hover:text-blue-600 transition" title={item.position}>
                  {item.position}
                </div>

                {/* Horizontal Bar */}
                <div className="flex-1 h-5 bg-slate-100 rounded-lg overflow-hidden flex items-center relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500 ease-out group-hover:brightness-95"
                    style={{
                      width: `${Math.max(widthPct, item.count > 0 ? 3 : 0)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                  {/* Count & Percentage Label */}
                  <span
                    className={`text-[11px] font-bold px-2 transition select-none ${
                      widthPct > 20 ? 'text-white' : 'text-slate-700 font-extrabold'
                    }`}
                  >
                    {item.count} {item.count > 0 && <span className="opacity-80 text-[10px]">({pct}%)</span>}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-slate-100 px-1">
            <span>0</span>
            <span className="font-medium text-slate-400">Number of Candidates (X-axis)</span>
            <span>{maxCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};
