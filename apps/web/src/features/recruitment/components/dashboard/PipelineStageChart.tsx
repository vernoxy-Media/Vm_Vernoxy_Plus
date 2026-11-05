import React from 'react';
import { CandidateItem } from '../../hooks/use-recruitment';
import {
  OPEN_STAGES,
  ALL_STAGES,
  normalizeStage,
  calculatePercentage,
  STAGE_COLORS,
  RecruitmentStageName,
} from './dashboard.utils';

interface PipelineStageChartProps {
  candidates: CandidateItem[];
  selectedStageFilter: string;
}

export const PipelineStageChart: React.FC<PipelineStageChartProps> = ({
  candidates,
  selectedStageFilter,
}) => {
  const totalFiltered = candidates.length;

  const stagesToDisplay: RecruitmentStageName[] =
    selectedStageFilter === 'Open'
      ? [...OPEN_STAGES]
      : selectedStageFilter === 'All' || selectedStageFilter === ''
      ? [...ALL_STAGES]
      : ALL_STAGES.filter((s) => s.toLowerCase() === selectedStageFilter.toLowerCase()).length > 0
      ? ALL_STAGES.filter((s) => s.toLowerCase() === selectedStageFilter.toLowerCase())
      : [...OPEN_STAGES];

  const stageCounts: Record<RecruitmentStageName, number> = {
    New: 0,
    Screening: 0,
    Interviewing: 0,
    'On Hold': 0,
    Selected: 0,
    Onboarding: 0,
    Rejected: 0,
    Joined: 0,
    'Did not join': 0,
  };

  candidates.forEach((c) => {
    const s = normalizeStage(c.stage);
    if (stageCounts[s] !== undefined) {
      stageCounts[s] += 1;
    }
  });

  const maxCount = Math.max(1, ...stagesToDisplay.map((s) => stageCounts[s] || 0));
  const yAxisMax = Math.ceil(maxCount * 1.25) || 5;
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((yAxisMax / tickCount) * i));

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs h-full">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Candidate Pipeline by Stage</h3>
          <p className="text-xs text-slate-500 mt-0.5">Distribution of candidates across recruitment stages</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            {totalFiltered} Candidates
          </span>
        </div>
      </div>

      {totalFiltered === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">No candidates found for the selected filters.</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting or clearing your filters to view data.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-end pt-2 pb-1 relative min-h-[260px]">
          {/* Chart Container */}
          <div className="relative flex-1 flex w-full items-end">
            {/* Y-Axis Labels & Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
              {ticks.slice().reverse().map((tick) => (
                <div key={tick} className="flex items-center w-full">
                  <span className="w-8 text-right pr-2 text-[11px] font-medium text-slate-400 select-none">
                    {tick}
                  </span>
                  <div className="flex-1 border-b border-slate-100"></div>
                </div>
              ))}
            </div>

            {/* Bars Area */}
            <div className="flex-1 flex items-end justify-around pl-10 pr-2 pt-6 pb-2 z-10 w-full">
              {stagesToDisplay.map((stage) => {
                const count = stageCounts[stage] || 0;
                const pct = calculatePercentage(count, totalFiltered);
                const heightPct = yAxisMax > 0 ? (count / yAxisMax) * 100 : 0;
                const colors = STAGE_COLORS[stage] || { hex: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-700' };

                return (
                  <div
                    key={stage}
                    className="relative flex-1 flex flex-col items-center justify-end px-1 sm:px-2 group cursor-pointer"
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-16 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-3 py-2 bg-slate-900 text-white text-xs rounded-xl shadow-xl whitespace-nowrap">
                      <div className="font-semibold text-slate-100 border-b border-slate-700/60 pb-1 mb-1">
                        {stage}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-slate-300">
                        <span>Candidates:</span>
                        <span className="font-bold text-white">{count}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-slate-300">
                        <span>Percentage:</span>
                        <span className="font-bold text-blue-400">{pct}%</span>
                      </div>
                      <div className="absolute left-1/2 bottom-[-4px] -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>

                    {/* Count Data Label on top of Bar */}
                    <div
                      className={`mb-1.5 text-xs font-bold transition-colors ${
                        count > 0 ? 'text-slate-800 group-hover:text-blue-600' : 'text-slate-400'
                      }`}
                    >
                      {count}
                    </div>

                    {/* Vertical Bar */}
                    <div className="w-full max-w-[42px] h-[160px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end">
                      {count > 0 && (
                        <div
                          className="w-full rounded-t-lg transition-all duration-300 group-hover:brightness-95"
                          style={{
                            height: `${Math.max(heightPct, 6)}%`,
                            backgroundColor: colors.hex,
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-Axis Category Labels */}
          <div className="flex justify-around pl-10 pr-2 border-t border-slate-200 pt-2.5">
            {stagesToDisplay.map((stage) => (
              <div
                key={stage}
                className="flex-1 text-center truncate text-[11.5px] font-semibold text-slate-700 px-0.5"
                title={stage}
              >
                {stage}
              </div>
            ))}
          </div>

          <div className="text-center mt-2 text-[11px] font-medium text-slate-400">
            Recruitment Stage (X-axis)
          </div>
        </div>
      )}
    </div>
  );
};
