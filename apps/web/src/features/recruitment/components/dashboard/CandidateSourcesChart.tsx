import React, { useState } from 'react';
import { CandidateItem } from '../../hooks/use-recruitment';
import {
  STANDARD_SOURCES,
  normalizeSource,
  calculatePercentage,
  SOURCE_COLORS,
  CandidateSourceName,
} from './dashboard.utils';

interface CandidateSourcesChartProps {
  candidates: CandidateItem[];
}

export const CandidateSourcesChart: React.FC<CandidateSourcesChartProps> = ({ candidates }) => {
  const [hoveredSource, setHoveredSource] = useState<{
    source: CandidateSourceName;
    count: number;
    pct: number;
    top: number;
  } | null>(null);

  const totalFiltered = candidates.length;

  // Count candidates for each of the 9 standard sources
  const counts: Record<CandidateSourceName, number> = {
    'Job Portal': 0,
    'LinkedIn': 0,
    'Company Website': 0,
    'Employee Referral': 0,
    'Consultancy': 0,
    'Campus': 0,
    'Walk-in': 0,
    'Social Media': 0,
    'Other': 0,
  };

  candidates.forEach((c) => {
    const s = normalizeSource(c.source);
    if (counts[s] !== undefined) {
      counts[s] += 1;
    } else {
      counts['Other'] += 1;
    }
  });

  const maxCount = Math.max(1, ...STANDARD_SOURCES.map((s) => counts[s]));

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md h-full">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Candidate Sources</h3>
          <p className="text-xs text-slate-500 mt-0.5">Where your applicants are coming from</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
            9 Sources
          </span>
        </div>
      </div>

      {totalFiltered === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">No candidates found for the selected filters.</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting or clearing your filters to view data.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center space-y-2.5 pt-1 relative">
          {/* Tooltip Overlay */}
          {hoveredSource && (
            <div
              className="absolute right-4 pointer-events-none z-30 px-3 py-2 bg-slate-900 text-white text-xs rounded-xl shadow-xl transition-all duration-150 animate-in fade-in"
              style={{ top: `${Math.max(10, hoveredSource.top - 20)}px` }}
            >
              <div className="font-semibold text-slate-100 border-b border-slate-700/60 pb-1 mb-1">
                {hoveredSource.source}
              </div>
              <div className="flex items-center justify-between gap-4 text-slate-300">
                <span>Candidates:</span>
                <span className="font-bold text-white">{hoveredSource.count}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-slate-300">
                <span>Percentage:</span>
                <span className="font-bold text-indigo-400">{hoveredSource.pct}%</span>
              </div>
            </div>
          )}

          {STANDARD_SOURCES.map((source) => {
            const count = counts[source] || 0;
            const pct = calculatePercentage(count, totalFiltered);
            const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const barColor = SOURCE_COLORS[source] || '#3b82f6';

            return (
              <div
                key={source}
                className="group flex items-center gap-3 cursor-pointer py-0.5"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
                  if (parentRect) {
                    setHoveredSource({
                      source,
                      count,
                      pct,
                      top: rect.top - parentRect.top,
                    });
                  }
                }}
                onMouseLeave={() => setHoveredSource(null)}
              >
                {/* Category Label (Y-axis) */}
                <div className="w-32 shrink-0 text-right text-xs font-semibold text-slate-700 truncate group-hover:text-indigo-600 transition">
                  {source}
                </div>

                {/* Horizontal Bar Track */}
                <div className="flex-1 h-5 bg-slate-100 rounded-lg overflow-hidden flex items-center relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500 ease-out group-hover:brightness-95"
                    style={{
                      width: `${Math.max(widthPct, count > 0 ? 3 : 0)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                  {/* Inside/Adjacent Data Label */}
                  <span
                    className={`text-[11px] font-bold px-2 transition select-none ${
                      widthPct > 20 ? 'text-white' : 'text-slate-700 font-extrabold'
                    }`}
                  >
                    {count} {count > 0 && <span className="opacity-80 text-[10px]">({pct}%)</span>}
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
