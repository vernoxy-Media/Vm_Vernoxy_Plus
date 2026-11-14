import React, { useState, useMemo } from 'react';
import { Users, UserCheck, UserPlus, UserX } from 'lucide-react';
import { useAllCandidatesQuery, CandidateItem } from '../../hooks/use-recruitment';
import { useRoleOptionsQuery, useDepartmentOptionsQuery } from '@/features/organization/hooks/use-organization';
import { DashboardFilterState, INITIAL_FILTER_STATE, filterCandidates, isOpenStage, normalizeStage } from './dashboard.utils';
import { DashboardFilterBar } from './DashboardFilterBar';
import { PipelineStageChart } from './PipelineStageChart';
import { CandidateSourcesChart } from './CandidateSourcesChart';
import { CandidatesByPositionChart } from './CandidatesByPositionChart';
import { ExperienceTypeChart } from './ExperienceTypeChart';
import {
  DashboardEmpty,
  DashboardError,
  DashboardHeader,
  DashboardSkeleton,
  KpiStat,
} from '@/shared/ui/dashboard/DashboardShell';

export const RecruitmentDashboardTab: React.FC = () => {
  const [filters, setFilters] = useState<DashboardFilterState>(INITIAL_FILTER_STATE);

  const { data: candidateData, isLoading, isError, refetch, isFetching } = useAllCandidatesQuery();
  const { data: roles = [] } = useRoleOptionsQuery();
  const { data: departments = [] } = useDepartmentOptionsQuery();

  const allCandidates: CandidateItem[] = candidateData?.items || [];

  // One filtered list feeds all four charts
  const filteredCandidates = useMemo(() => filterCandidates(allCandidates, filters), [allCandidates, filters]);

  const kpi = useMemo(() => {
    const stages = filteredCandidates.map((c) => normalizeStage(c.stage));
    const total = stages.length;
    const open = stages.filter(isOpenStage).length;
    const joined = stages.filter((s) => s === 'Joined').length;
    const rejected = stages.filter((s) => s === 'Rejected').length;
    return { total, open, joined, rejected, openPct: total ? Math.round((open / total) * 100) : 0 };
  }, [filteredCandidates]);

  const handleClearFilters = () => setFilters(INITIAL_FILTER_STATE);

  if (isLoading) return <DashboardSkeleton kpis={4} cards={4} />;

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 sm:space-y-6">
      <DashboardHeader
        title="Recruitment dashboard"
        subtitle={`${allCandidates.length} candidates · ${filteredCandidates.length} match the filters`}
        onRefresh={() => void refetch()}
        loading={isFetching}
      />

      {isError ? (
        <DashboardError title="The recruitment data could not be loaded" message="There was a problem reading the candidates from the server." onRetry={() => void refetch()} />
      ) : (
        <>
          <div className={`grid grid-cols-2 gap-3 transition-opacity sm:gap-3.5 lg:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}>
            <KpiStat label="Candidates" value={kpi.total} hint="Matching the filters" icon={Users} tone="blue" />
            <KpiStat label="In the pipeline" value={kpi.open} suffix={`${kpi.openPct}%`} percent={kpi.openPct} hint="New to onboarding" icon={UserPlus} tone="amber" />
            <KpiStat label="Joined" value={kpi.joined} hint="Started working" icon={UserCheck} tone="emerald" />
            <KpiStat label="Rejected" value={kpi.rejected} hint="Not taken forward" icon={UserX} tone="rose" />
          </div>

          <DashboardFilterBar
            filters={filters}
            onChangeFilters={setFilters}
            onClearFilters={handleClearFilters}
            roles={roles}
            departments={departments}
            totalFilteredCount={filteredCandidates.length}
            totalUnfilteredCount={allCandidates.length}
          />

          {filteredCandidates.length === 0 ? (
            <DashboardEmpty icon={Users} title="No candidates found for the selected filters." hint="Try another stage, position, source or search word." onClear={handleClearFilters} />
          ) : (
            <div className={`grid grid-cols-1 gap-4 transition-opacity duration-200 sm:gap-5 lg:grid-cols-2 ${isFetching ? 'opacity-70' : ''}`}>
              <div className="min-h-[380px] min-w-0">
                <PipelineStageChart candidates={filteredCandidates} selectedStageFilter={filters.stage} />
              </div>
              <div className="min-h-[380px] min-w-0">
                <CandidateSourcesChart candidates={filteredCandidates} />
              </div>
              <div className="min-h-[380px] min-w-0">
                <CandidatesByPositionChart candidates={filteredCandidates} />
              </div>
              <div className="min-h-[380px] min-w-0">
                <ExperienceTypeChart candidates={filteredCandidates} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
