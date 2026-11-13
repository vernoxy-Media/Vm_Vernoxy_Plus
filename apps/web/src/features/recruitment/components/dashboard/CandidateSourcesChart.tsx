import React from 'react';
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
  const totalFiltered = candidates.length;

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
    <div className="relative flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
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
          {STANDARD_SOURCES.map((source) => {
            const count = counts[source] || 0;
            const pct = calculatePercentage(count, totalFiltered);
            const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const barColor = SOURCE_COLORS[source] || '#3b82f6';

            return (
              <div
                key={source}
                className="group relative flex items-center gap-3 cursor-pointer py-0.5"
              >
                {/* Tooltip Overlay (CSS based, completely stable, zero layout shift) */}
                <div className="absolute right-0 -top-8 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl flex items-center gap-2.5 whitespace-nowrap">
                  <span className="font-semibold text-slate-100">{source}:</span>
                  <span className="font-bold text-white">{count} candidates</span>
                  <span className="font-bold text-indigo-400">({pct}%)</span>
                </div>

                {/* Category Label (Y-axis) */}
                <div className="w-36 shrink-0 text-right text-xs font-semibold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                  {source}
                </div>

                {/* Horizontal Bar Track */}
                <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden relative flex items-center">
                  {count > 0 && (
                    <div
                      className="absolute left-0 top-0 bottom-0 rounded-lg transition-all duration-300 group-hover:brightness-95"
                      style={{
                        width: `${Math.max(widthPct, 3)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  )}
                  {/* Inside/Adjacent Data Label */}
                  <span
                    className={`relative z-10 text-[11px] font-bold px-2.5 select-none ${
                      widthPct > 20 ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {count} {count > 0 && <span className="opacity-85 text-[10px]">({pct}%)</span>}
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
