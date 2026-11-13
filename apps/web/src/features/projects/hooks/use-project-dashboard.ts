import { useState, useEffect, useCallback } from 'react';
import {
  fetchProjects,
  fetchAssignableEmployees,
  fetchSprintTasks,
  fetchProjectBugs,
} from '../api/projects.api';
import type { AssignableEmployee, ProjectItem } from '../types';
import type {
  EnrichedProjectItem,
  ProjectTaskDetail,
  ProjectBugDetail,
} from '../components/dashboard/project-dashboard.types';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Hours between two timestamps, 0 when either is missing or the order is wrong. */
function hoursBetween(from?: string | null, to?: string | null): number {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Number.isFinite(ms) && ms > 0 ? round1(ms / 3_600_000) : 0;
}

/**
 * Everything on the Project dashboard comes from the database: the projects (with the estimate and the time worked
 * on every task and sub-task), their tasks and their bugs. There is no revenue or expense data to read yet,
 * so `financials` stays empty and the two money charts say so instead of showing made-up numbers.
 */
export function useProjectDashboardData() {
  const [projects, setProjects] = useState<EnrichedProjectItem[]>([]);
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isError, setIsError] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsFetching(true);
      setIsError(false);

      const [fetchedProjects, fetchedEmployees] = await Promise.all([
        fetchProjects({ status: 'all' }),
        fetchAssignableEmployees(),
      ]);

      setEmployees(fetchedEmployees);

      const enrichedList: EnrichedProjectItem[] = await Promise.all(
        fetchedProjects.map(async (p: ProjectItem) => {
          const [rawTasks, rawBugs] = await Promise.all([
            fetchSprintTasks(p.project_id).catch(() => []),
            fetchProjectBugs(p.project_id).catch(() => []),
          ]);

          const tasks: ProjectTaskDetail[] = (rawTasks || []).map((t) => ({
            task_id: t.task_id,
            title: t.title,
            stage: t.stage || (t.status === 'completed' ? 'completed' : 'in_progress'),
            allocated_hours: round1((t.allocated_minutes || 0) / 60),
            actual_hours: round1((t.logged_seconds || 0) / 3600),
            assigned_employee_id: t.assignees?.[0]?.emp_id,
            assigned_employee_name: t.assignees?.[0]?.name,
          }));

          const bugs: ProjectBugDetail[] = (rawBugs || []).map((b) => {
            let dev = hoursBetween(b.dev_started_at, b.dev_ended_at);
            const qa = hoursBetween(b.qa_started_at, b.qa_ended_at);
            // Time was logged but not split into development and QA: show it as development time
            if (dev + qa === 0 && b.total_time_minutes > 0) dev = round1(b.total_time_minutes / 60);
            return {
              bug_id: b.bug_id,
              project_id: b.project_id,
              title: b.title,
              status: b.status,
              dev_hours: dev,
              qa_hours: qa,
              done_date: b.qa_ended_at || b.dev_ended_at || b.created_at,
            };
          });

          return {
            project_id: p.project_id,
            project_no: p.project_no,
            projectName: p.project_name,
            project_name: p.project_name,
            project_type: p.project_type,
            category: p.category,
            project_status: p.project_status,
            start_date: p.start_date,
            deadline: p.deadline,
            actual_end_date: p.actual_end_date,
            project_manager_id: p.project_manager_id,
            project_manager_name: p.project_manager_name || 'Project Manager',
            client_name: p.client_name,
            members: p.members || [],
            total_tasks_count: p.total_tasks_count ?? 0,
            completed_tasks_count: p.completed_tasks_count ?? 0,
            progress_percentage: p.progress_percentage ?? 0,
            estimated_hours: round1((p.total_estimated_minutes ?? 0) / 60),
            actual_hours: round1((p.actual_work_minutes ?? 0) / 60),
            tasks,
            financials: {},
            bugs,
          };
        }),
      );

      setProjects(enrichedList);
    } catch (err) {
      console.error('Error loading project dashboard dataset:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    projects,
    employees,
    isLoading,
    isFetching,
    isError,
    refetch: loadData,
  };
}
