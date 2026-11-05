import React, { useState } from 'react';
import { CandidateItem } from '../../hooks/use-recruitment';
import { normalizeExperienceType, calculatePercentage } from './dashboard.utils';

interface ExperienceTypeChartProps {
  candidates: CandidateItem[];
}

export const ExperienceTypeChart: React.FC<ExperienceTypeChartProps> = ({ candidates }) => {
  const [hoveredType, setHoveredType] = useState<'Fresher' | 'Experienced' | null>(null);

  const totalFiltered = candidates.length;

  let fresherCount = 0;
  let experiencedCount = 0;

  candidates.forEach((c) => {
    const type = normalizeExperienceType(c.experience_type);
    if (type === 'Fresher') fresherCount += 1;
    else experiencedCount += 1;
  });

  const fresherPct = calculatePercentage(fresherCount, totalFiltered);
  const experiencedPct = totalFiltered > 0 ? Math.round((100 - fresherPct) * 10) / 10 : 0;

  // Donut SVG parameters
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Segment strokeDasharray calculations
  const fresherStroke = totalFiltered > 0 ? (fresherCount / totalFiltered) * circumference : 0;
  const expStroke = totalFiltered > 0 ? (experiencedCount / totalFiltered) * circumference : 0;
  const fresherOffset = 0;
  const expOffset = -fresherStroke;

  const FRESHER_COLOR = '#06b6d4'; // Cyan-500
  const EXPERIENCED_COLOR = '#4f46e5'; // Indigo-600

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Candidates by Experience Type</h3>
          <p className="text-xs text-slate-500 mt-0.5">Ratio of freshers to experienced candidates</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-100">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
            2 Categories
          </span>
        </div>
      </div>

      {totalFiltered === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">No candidates found for the selected filters.</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting or clearing your filters to view data.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center pt-2 pb-2">
          {/* Tooltip Badge */}
          <div className="h-7 mb-2 flex items-center justify-center">
            {hoveredType ? (
              <div className="px-3 py-1 bg-slate-900 text-white text-xs rounded-xl shadow-md flex items-center gap-2.5">
                <span className="font-semibold text-slate-200">{hoveredType}:</span>
                <span className="font-bold text-white">
                  {hoveredType === 'Fresher' ? fresherCount : experiencedCount} candidates
                </span>
                <span className="font-bold text-cyan-400">
                  ({hoveredType === 'Fresher' ? fresherPct : experiencedPct}%)
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-medium text-slate-400">Hover a segment for details</span>
            )}
          </div>

          {/* Donut Chart with Center Total Value */}
          <div className="relative flex items-center justify-center">
            <svg
              width={size}
              height={size}
              className="transform -rotate-90 origin-center"
            >
              {/* Background circle track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />

              {/* Fresher Segment - Stroke width remains constant to prevent layout shaking */}
              {fresherCount > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={FRESHER_COLOR}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${fresherStroke} ${circumference}`}
                  strokeDashoffset={fresherOffset}
                  className="cursor-pointer transition-opacity duration-150"
                  style={{ opacity: hoveredType === 'Experienced' ? 0.45 : 1 }}
                  onMouseEnter={() => setHoveredType('Fresher')}
                  onMouseLeave={() => setHoveredType(null)}
                />
              )}

              {/* Experienced Segment - Stroke width remains constant to prevent layout shaking */}
              {experiencedCount > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={EXPERIENCED_COLOR}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${expStroke} ${circumference}`}
                  strokeDashoffset={expOffset}
                  className="cursor-pointer transition-opacity duration-150"
                  style={{ opacity: hoveredType === 'Fresher' ? 0.45 : 1 }}
                  onMouseEnter={() => setHoveredType('Experienced')}
                  onMouseLeave={() => setHoveredType(null)}
                />
              )}
            </svg>

            {/* Centre Value: Total candidates count */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {totalFiltered}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                Total Candidates
              </span>
            </div>
          </div>

          {/* Legend with Category Names, Colors, Counts, and Percentages */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 w-full pt-3 border-t border-slate-100">
            {/* Fresher legend item */}
            <div
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                hoveredType === 'Fresher' ? 'bg-cyan-50 ring-1 ring-cyan-200' : 'hover:bg-slate-50'
              }`}
              onMouseEnter={() => setHoveredType('Fresher')}
              onMouseLeave={() => setHoveredType(null)}
            >
              <span className="w-3.5 h-3.5 rounded-md bg-cyan-500 shrink-0"></span>
              <div className="text-xs">
                <span className="font-bold text-slate-800">Fresher:</span>{' '}
                <span className="font-semibold text-slate-600">{fresherCount}</span>{' '}
                <span className="text-cyan-700 font-bold">({fresherPct}%)</span>
              </div>
            </div>

            {/* Experienced legend item */}
            <div
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                hoveredType === 'Experienced' ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'
              }`}
              onMouseEnter={() => setHoveredType('Experienced')}
              onMouseLeave={() => setHoveredType(null)}
            >
              <span className="w-3.5 h-3.5 rounded-md bg-indigo-600 shrink-0"></span>
              <div className="text-xs">
                <span className="font-bold text-slate-800">Experienced:</span>{' '}
                <span className="font-semibold text-slate-600">{experiencedCount}</span>{' '}
                <span className="text-indigo-700 font-bold">({experiencedPct}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
