import React, { useState, useMemo } from 'react';
import {
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useAllCandidatesQuery, CandidateItem } from '../../hooks/use-recruitment';
import { useRoleOptionsQuery, useDepartmentOptionsQuery } from '@/features/organization/hooks/use-organization';
import {
  DashboardFilterState,
  INITIAL_FILTER_STATE,
  filterCandidates,
} from './dashboard.utils';
import { DashboardFilterBar } from './DashboardFilterBar';
import { PipelineStageChart } from './PipelineStageChart';
import { CandidateSourcesChart } from './CandidateSourcesChart';
import { CandidatesByPositionChart } from './CandidatesByPositionChart';
import { ExperienceTypeChart } from './ExperienceTypeChart';

export const RecruitmentDashboardTab: React.FC = () => {
  // Global Filters state
  const [filters, setFilters] = useState<DashboardFilterState>(INITIAL_FILTER_STATE);

  // Data Queries
  const {
    data: candidateData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useAllCandidatesQuery();

  const { data: roles = [] } = useRoleOptionsQuery();
  const { data: departments = [] } = useDepartmentOptionsQuery();

  const allCandidates: CandidateItem[] = candidateData?.items || [];

  // Central Shared Filtered Dataset (all 4 charts use this exact dataset)
  const filteredCandidates = useMemo(() => {
    return filterCandidates(allCandidates, filters);
  }, [allCandidates, filters]);

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTER_STATE);
  };

  return (
    <div className="space-y-6">
      {/* Global Filters & Search Component */}
      <DashboardFilterBar
        filters={filters}
        onChangeFilters={setFilters}
        onClearFilters={handleClearFilters}
        roles={roles}
        departments={departments}
        totalFilteredCount={filteredCandidates.length}
        totalUnfilteredCount={allCandidates.length}
      />

      {/* Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-28 rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading dashboard data...</p>
          <p className="text-xs text-slate-400 mt-1">Calculating pipeline and sourcing statistics</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-slate-200 bg-white text-center px-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Failed to load recruitment data</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            There was an issue fetching candidate records from the server.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
          {/* 4 Dashboard Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Candidate Pipeline by Stage */}
            <div className="min-h-[380px]">
              <PipelineStageChart
                candidates={filteredCandidates}
                selectedStageFilter={filters.stage}
              />
            </div>

            {/* Chart 2: Candidate Sources */}
            <div className="min-h-[380px]">
              <CandidateSourcesChart
                candidates={filteredCandidates}
              />
            </div>

            {/* Chart 3: Candidates by Position */}
            <div className="min-h-[380px]">
              <CandidatesByPositionChart
                candidates={filteredCandidates}
              />
            </div>

            {/* Chart 4: Candidates by Experience Type */}
            <div className="min-h-[380px]">
              <ExperienceTypeChart
                candidates={filteredCandidates}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
