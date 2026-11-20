import React, { useState, useMemo } from 'react';
import { FolderKanban, AlertTriangle, Clock, Bug } from 'lucide-react';
import { useProjectDashboardData } from '../../hooks/use-project-dashboard';
import { ProjectDashboardFilters, INITIAL_PROJECT_DASHBOARD_FILTERS } from './project-dashboard.types';
import { filterProjects } from './project-dashboard.utils';
import { ProjectDashboardFilterBar } from './ProjectDashboardFilterBar';
import { ProjectStatusDonutChart } from './ProjectStatusDonutChart';
import { ProjectProgressBarChart } from './ProjectProgressBarChart';
import { ProjectsByCategoryBarChart } from './ProjectsByCategoryBarChart';
import { UpcomingDeadlinesTimelineChart } from './UpcomingDeadlinesTimelineChart';
import { EstimatedVsActualHoursChart } from './EstimatedVsActualHoursChart';
import { PersonWiseWorkHoursChart } from './PersonWiseWorkHoursChart';
import { BugResolutionTimeLineChart } from './BugResolutionTimeLineChart';
import { ActualExpensesLollipopChart } from './ActualExpensesLollipopChart';
import { ProjectProfitabilityDivergingChart } from './ProjectProfitabilityDivergingChart';
import {
  DASH_GRID,
  DashboardEmpty,
  DashboardError,
  DashboardHeader,
  DashboardSkeleton,
  KpiStat,
} from '@/shared/ui/dashboard/DashboardShell';
import { isPastDate } from '@/shared/utils/schedule.utils';

const hoursLabel = (h: number) => `${Math.round(h).toLocaleString()}h`;

export const ProjectDashboardTab: React.FC = () => {
  const [filters, setFilters] = useState<ProjectDashboardFilters>(INITIAL_PROJECT_DASHBOARD_FILTERS);
  const { projects, employees, isLoading, isFetching, isError, hasFinancials, refetch } = useProjectDashboardData();

  const handleClearFilters = () => setFilters(INITIAL_PROJECT_DASHBOARD_FILTERS);
  const filteredProjects = useMemo(() => filterProjects(projects, filters), [projects, filters]);

  const kpi = useMemo(() => {
    const open = filteredProjects.filter((p) => !['delivered', 'cancelled'].includes(p.project_status));
    const estimated = filteredProjects.reduce((n, p) => n + (p.estimated_hours || 0), 0);
    const actual = filteredProjects.reduce((n, p) => n + (p.actual_hours || 0), 0);
    return {
      total: filteredProjects.length,
      inProgress: filteredProjects.filter((p) => p.project_status === 'in_progress').length,
      overdue: open.filter((p) => isPastDate(p.deadline)).length,
      estimated,
      actual,
      openBugs: filteredProjects.reduce((n, p) => n + p.bugs.filter((b) => !['done', 'not_a_bug'].includes(b.status)).length, 0),
    };
  }, [filteredProjects]);

  if (isLoading) return <DashboardSkeleton kpis={4} cards={6} />;

  const overEstimate = kpi.estimated > 0 && kpi.actual > kpi.estimated;
  const hoursPct = kpi.estimated > 0 ? (kpi.actual / kpi.estimated) * 100 : 0;

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 pb-12 sm:space-y-6">
      <DashboardHeader
        title="Project dashboard"
        subtitle={`${projects.length} projects · ${filteredProjects.length} match the filters`}
        onRefresh={() => void refetch()}
        loading={isFetching}
      />

      {isError ? (
        <DashboardError title="The project data could not be loaded" message="There was a problem reading the projects from the server." onRetry={() => void refetch()} />
      ) : (
        <>
          <div className={`grid grid-cols-2 gap-3 transition-opacity sm:gap-3.5 lg:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}>
            <KpiStat label="Projects" value={kpi.total} hint={`${kpi.inProgress} in progress`} icon={FolderKanban} tone="blue" />
            <KpiStat label="Overdue" value={kpi.overdue} hint="Past the deadline, not delivered" icon={AlertTriangle} tone={kpi.overdue > 0 ? 'rose' : 'emerald'} />
            <KpiStat
              label="Hours worked"
              value={hoursLabel(kpi.actual)}
              suffix={kpi.estimated > 0 ? `of ${hoursLabel(kpi.estimated)}` : undefined}
              percent={hoursPct}
              hint={overEstimate ? 'Over the estimate' : 'Against the estimate'}
              icon={Clock}
              tone={overEstimate ? 'amber' : 'blue'}
            />
            <KpiStat label="Open bugs" value={kpi.openBugs} hint="Not done and not marked 'not a bug'" icon={Bug} tone="purple" />
          </div>

          <ProjectDashboardFilterBar
            filters={filters}
            onChangeFilters={setFilters}
            onClearFilters={handleClearFilters}
            projects={projects}
            employees={employees}
            totalFilteredCount={filteredProjects.length}
            totalUnfilteredCount={projects.length}
          />

          {filteredProjects.length === 0 ? (
            <DashboardEmpty
              icon={FolderKanban}
              title="No projects found for the selected filters."
              hint="Try another search word, status or date range."
              onClear={handleClearFilters}
            />
          ) : (
            <div className={`${DASH_GRID} transition-opacity duration-200 ${isFetching ? 'opacity-70' : ''}`}>
              <div className="min-h-[380px] min-w-0">
                <ProjectStatusDonutChart projects={filteredProjects} statusFilter={filters.status} />
              </div>
              <div className="min-h-[380px] min-w-0">
                <ProjectProgressBarChart projects={filteredProjects} statusFilter={filters.status} />
              </div>
              <div className="min-h-[380px] min-w-0">
                <ProjectsByCategoryBarChart projects={filteredProjects} />
              </div>
              <div className="min-h-[380px] min-w-0">
                <UpcomingDeadlinesTimelineChart projects={filteredProjects} />
              </div>
              <div className="min-h-[380px] min-w-0">
                <EstimatedVsActualHoursChart projects={filteredProjects} />
              </div>
              <div className="min-h-[380px] min-w-0">
                <PersonWiseWorkHoursChart projects={filteredProjects} defaultProjectId={filters.project} />
              </div>
              <div className="min-h-[380px] min-w-0">
                <BugResolutionTimeLineChart projects={filteredProjects} />
              </div>
              {/* Revenue, expense and profit are for the Admin only */}
              {hasFinancials && (
                <>
                  <div className="min-w-0">
                    <ActualExpensesLollipopChart projects={filteredProjects} />
                  </div>
                  <div className="min-w-0">
                    <ProjectProfitabilityDivergingChart projects={filteredProjects} />
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
