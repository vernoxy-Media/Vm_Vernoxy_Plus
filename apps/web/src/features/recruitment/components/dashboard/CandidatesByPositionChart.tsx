import React from 'react';
import { CandidateItem } from '../../hooks/use-recruitment';
import { calculatePercentage } from './dashboard.utils';

interface CandidatesByPositionChartProps {
  candidates: CandidateItem[];
}

export const CandidatesByPositionChart: React.FC<CandidatesByPositionChartProps> = ({ candidates }) => {
  const totalFiltered = candidates.length;

  // Group candidates strictly by their saved Position Applied For (role_name from candidate record)
  const positionMap = new Map<string, number>();

  candidates.forEach((c) => {
    const positionName = (c.role_name || '').trim() || 'Unspecified';
    positionMap.set(positionName, (positionMap.get(positionName) || 0) + 1);
  });

  const sorted = Array.from(positionMap.entries())
    .map(([position, count]) => ({ position, count }))
    .sort((a, b) => b.count - a.count);

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
    <div className="relative flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
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
          {displayPositions.map((item, idx) => {
            const pct = calculatePercentage(item.count, totalFiltered);
            const widthPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const barColor = item.position === 'Other' ? '#94a3b8' : POSITION_COLORS[idx % POSITION_COLORS.length];

            return (
              <div
                key={item.position}
                className="group relative flex items-center gap-3 cursor-pointer py-0.5"
              >
                {/* Tooltip Overlay (CSS based, completely stable, zero layout shift) */}
                <div className="absolute right-0 -top-8 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl flex items-center gap-2.5 whitespace-nowrap">
                  <span className="font-semibold text-slate-100">{item.position}:</span>
                  <span className="font-bold text-white">{item.count} candidates</span>
                  <span className="font-bold text-blue-400">({pct}%)</span>
                </div>

                {/* Position Title (Y-axis) */}
                <div
                  className="w-36 shrink-0 text-right text-xs font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors"
                  title={item.position}
                >
                  {item.position}
                </div>

                {/* Horizontal Bar Track */}
                <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden relative flex items-center">
                  {item.count > 0 && (
                    <div
                      className="absolute left-0 top-0 bottom-0 rounded-lg transition-all duration-300 group-hover:brightness-95"
                      style={{
                        width: `${Math.max(widthPct, 3)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  )}
                  {/* Count & Percentage Label */}
                  <span
                    className={`relative z-10 text-[11px] font-bold px-2.5 select-none ${
                      widthPct > 20 ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {item.count} {item.count > 0 && <span className="opacity-85 text-[10px]">({pct}%)</span>}
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
