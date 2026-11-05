import React, { useState, useMemo } from 'react';
import {
  Loader2,
  AlertTriangle,
  RefreshCw,
  FolderKanban,
} from 'lucide-react';
import { useProjectDashboardData } from '../../hooks/use-project-dashboard';
import {
  ProjectDashboardFilters,
  INITIAL_PROJECT_DASHBOARD_FILTERS,
} from './project-dashboard.types';
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

export const ProjectDashboardTab: React.FC = () => {
  const [filters, setFilters] = useState<ProjectDashboardFilters>(
    INITIAL_PROJECT_DASHBOARD_FILTERS
  );

  const {
    projects,
    employees,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useProjectDashboardData();

  const handleClearFilters = () => {
    setFilters(INITIAL_PROJECT_DASHBOARD_FILTERS);
  };

  // Central filtered project dataset
  const filteredProjects = useMemo(() => {
    return filterProjects(projects, filters);
  }, [projects, filters]);

  return (
    <div className="space-y-5 pb-12 w-full min-w-0 max-w-full">
      {/* Global Filter Bar */}
      <ProjectDashboardFilterBar
        filters={filters}
        onChangeFilters={setFilters}
        onClearFilters={handleClearFilters}
        projects={projects}
        employees={employees}
        totalFilteredCount={filteredProjects.length}
        totalUnfilteredCount={projects.length}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-28 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-800">
            Loading Project Management Dashboard...
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Aggregating project timelines, hours, expenses, bugs, and profitability
          </p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-slate-200 bg-white text-center px-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Failed to load project records</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            There was an issue retrieving project metrics from the server.
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
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-slate-200 bg-white text-center px-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            No projects found for the selected filters.
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query, status, or date filters to view metrics.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
          {/* Nine Dashboard Charts in Responsive 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Row 1 */}
            {/* Chart 1: Project Status Overview (US02) */}
            <div className="min-h-[380px]">
              <ProjectStatusDonutChart
                projects={filteredProjects}
                statusFilter={filters.status}
              />
            </div>

            {/* Chart 2: Project Progress by Project (US03) */}
            <div className="min-h-[380px]">
              <ProjectProgressBarChart
                projects={filteredProjects}
                statusFilter={filters.status}
              />
            </div>

            {/* Chart 3: Projects by Category (US04) */}
            <div className="min-h-[380px]">
              <ProjectsByCategoryBarChart
                projects={filteredProjects}
              />
            </div>

            {/* Row 2 */}
            {/* Chart 4: Upcoming Project Deadlines (US05) */}
            <div className="min-h-[380px]">
              <UpcomingDeadlinesTimelineChart
                projects={filteredProjects}
              />
            </div>

            {/* Chart 5: Estimated vs Actual Work Hours by Project (US06) */}
            <div className="min-h-[380px]">
              <EstimatedVsActualHoursChart
                projects={filteredProjects}
              />
            </div>

            {/* Chart 6: Person-wise Work Hours (US07) */}
            <div className="min-h-[380px]">
              <PersonWiseWorkHoursChart
                projects={filteredProjects}
                defaultProjectId={filters.project}
              />
            </div>

            {/* Row 3 */}
            {/* Chart 7: Bug Resolution Time: Dev vs QA (US08) */}
            <div className="min-h-[380px]">
              <BugResolutionTimeLineChart
                projects={filteredProjects}
              />
            </div>

            {/* Chart 8: Actual Expenses by Project (US09) */}
            <div className="min-h-[380px]">
              <ActualExpensesLollipopChart
                projects={filteredProjects}
              />
            </div>

            {/* Chart 9: Project Profitability (US10) */}
            <div className="min-h-[380px]">
              <ProjectProfitabilityDivergingChart
                projects={filteredProjects}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
