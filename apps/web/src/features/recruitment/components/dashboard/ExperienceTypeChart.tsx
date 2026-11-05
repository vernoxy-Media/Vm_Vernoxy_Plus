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

  const FRESHER_COLOR = '#3b82f6'; // Blue-500 (matching BRD illustration)
  const EXPERIENCED_COLOR = '#8b5cf6'; // Purple-500 (matching BRD illustration)

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
        <div className="flex-1 flex flex-col justify-center">
          {/* Main Content Area: Donut Chart on Left, Legend on Right with comfortable spacing */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-12 sm:gap-16 py-2">
            {/* Donut Chart with Center Total Value */}
            <div className="relative flex items-center justify-center shrink-0">
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

                {/* Fresher Segment */}
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

                {/* Experienced Segment */}
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

              {/* Centre Value: Total candidates count (as shown in BRD image: number and Total) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {totalFiltered}
                </span>
                <span className="text-xs font-semibold text-slate-500 mt-1">
                  Total
                </span>
              </div>
            </div>

            {/* Right Side Stacked Legend (Matches BRD reference layout exactly) */}
            <div className="flex flex-col justify-center gap-5 min-w-[140px]">
              {/* Fresher item */}
              <div
                className={`flex items-start gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                  hoveredType === 'Fresher' ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                }`}
                onMouseEnter={() => setHoveredType('Fresher')}
                onMouseLeave={() => setHoveredType(null)}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shrink-0 mt-1"></span>
                <div>
                  <div className="text-sm font-bold text-slate-800">Fresher</div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">
                    {fresherCount} ({fresherPct}%)
                  </div>
                </div>
              </div>

              {/* Experienced item */}
              <div
                className={`flex items-start gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                  hoveredType === 'Experienced' ? 'bg-purple-50 ring-1 ring-purple-200' : 'hover:bg-slate-50'
                }`}
                onMouseEnter={() => setHoveredType('Experienced')}
                onMouseLeave={() => setHoveredType(null)}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-purple-500 shrink-0 mt-1"></span>
                <div>
                  <div className="text-sm font-bold text-slate-800">Experienced</div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">
                    {experiencedCount} ({experiencedPct}%)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
