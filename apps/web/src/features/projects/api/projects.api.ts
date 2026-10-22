import { customFetch } from '@vernoxy-pulse/api-client';
import type {
  AssignableEmployee,
  CreateProjectPayload,
  CreateProjectTaskPayload,
  CreateSprintPayload,
  ProjectActivityLogItem,
  ProjectBugItem,
  CreateProjectBugPayload,
  ProjectDiscussionItem,
  ProjectItem,
  ProjectStatus,
  ProjectTaskItem,
  ProjectsFilterParams,
  SprintItem,
} from '../types';

const BASE_URL = '/api/v1/projects';

export async function fetchProjects(params?: ProjectsFilterParams): Promise<ProjectItem[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    query.set('status', params.status);
  }
  if (params?.project_type && params.project_type !== 'all') {
    query.set('project_type', params.project_type);
  }
  if (params?.project_manager_id) {
    query.set('project_manager_id', String(params.project_manager_id));
  }
  if (params?.start_date) {
    query.set('start_date', params.start_date);
  }
  if (params?.end_date) {
    query.set('end_date', params.end_date);
  }
  if (params?.search && params.search.trim().length > 0) {
    query.set('search', params.search.trim());
  }

  const qs = query.toString();
  const url = qs ? `${BASE_URL}?${qs}` : BASE_URL;

  try {
    return await customFetch<ProjectItem[]>(url);
  } catch (err) {
    console.warn('Failed to fetch projects:', err);
    return [];
  }
}

export async function fetchAssignableEmployees(): Promise<AssignableEmployee[]> {
  try {
    return await customFetch<AssignableEmployee[]>(`${BASE_URL}/assignable-employees`);
  } catch (err) {
    console.warn('Failed to fetch assignable employees:', err);
    return [];
  }
}

export async function fetchProjectDetail(projectId: number): Promise<ProjectItem> {
  return customFetch<ProjectItem>(`${BASE_URL}/${projectId}`);
}

export async function createProject(payload: CreateProjectPayload): Promise<ProjectItem> {
  return customFetch<ProjectItem>(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateProject(
  projectId: number,
  payload: Partial<CreateProjectPayload>
): Promise<ProjectItem> {
  return customFetch<ProjectItem>(`${BASE_URL}/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateProjectStatus(
  projectId: number,
  status: ProjectStatus,
  reason?: string
): Promise<ProjectItem> {
  return customFetch<ProjectItem>(`${BASE_URL}/${projectId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function fetchProjectSprints(projectId: number): Promise<SprintItem[]> {
  try {
    return await customFetch<SprintItem[]>(`${BASE_URL}/${projectId}/sprints`);
  } catch (err) {
    console.warn(`Failed to fetch sprints for project ${projectId}:`, err);
    return [];
  }
}

export async function createSprint(
  projectId: number,
  payload: CreateSprintPayload
): Promise<SprintItem> {
  return customFetch<SprintItem>(`${BASE_URL}/${projectId}/sprints`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateSprint(
  projectId: number,
  sprintId: number,
  payload: Partial<CreateSprintPayload>
): Promise<SprintItem> {
  return customFetch<SprintItem>(`${BASE_URL}/${projectId}/sprints/${sprintId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function fetchSprintTasks(
  projectId: number,
  sprintId?: number
): Promise<ProjectTaskItem[]> {
  const url = sprintId
    ? `${BASE_URL}/${projectId}/tasks?sprint_id=${sprintId}`
    : `${BASE_URL}/${projectId}/tasks`;
  try {
    return await customFetch<ProjectTaskItem[]>(url);
  } catch (err) {
    console.warn(`Failed to fetch tasks for project ${projectId}:`, err);
    return [];
  }
}

export async function createProjectTask(
  projectId: number,
  payload: CreateProjectTaskPayload
): Promise<ProjectTaskItem> {
  return customFetch<ProjectTaskItem>(`${BASE_URL}/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function fetchProjectDiscussions(projectId: number): Promise<ProjectDiscussionItem[]> {
  try {
    return await customFetch<ProjectDiscussionItem[]>(`${BASE_URL}/${projectId}/discussions`);
  } catch (err) {
    console.warn(`Failed to fetch discussions for project ${projectId}:`, err);
    return [];
  }
}

export async function createProjectDiscussion(
  projectId: number,
  message: string,
  attachments?: string[]
): Promise<ProjectDiscussionItem> {
  return customFetch<ProjectDiscussionItem>(`${BASE_URL}/${projectId}/discussions`, {
    method: 'POST',
    body: JSON.stringify({ message, attachments }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function fetchProjectActivityLogs(projectId: number): Promise<ProjectActivityLogItem[]> {
  try {
    return await customFetch<ProjectActivityLogItem[]>(`${BASE_URL}/${projectId}/activity-logs`);
  } catch (err) {
    console.warn(`Failed to fetch activity logs for project ${projectId}:`, err);
    return [];
  }
}

export async function fetchProjectBugs(projectId: number): Promise<ProjectBugItem[]> {
  try {
    return await customFetch<ProjectBugItem[]>(`${BASE_URL}/${projectId}/bugs`);
  } catch (err) {
    console.warn(`Failed to fetch bugs for project ${projectId}:`, err);
    return [];
  }
}

export async function createProjectBug(
  projectId: number,
  payload: CreateProjectBugPayload
): Promise<ProjectBugItem> {
  return customFetch<ProjectBugItem>(`${BASE_URL}/${projectId}/bugs`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function fetchProjectBugDetail(
  projectId: number,
  bugId: number
): Promise<ProjectBugItem> {
  return customFetch<ProjectBugItem>(`${BASE_URL}/${projectId}/bugs/${bugId}`);
}

export async function updateProjectBugStatus(
  projectId: number,
  bugId: number,
  status: string,
  note?: string
): Promise<ProjectBugItem> {
  return customFetch<ProjectBugItem>(`${BASE_URL}/${projectId}/bugs/${bugId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function addProjectBugComment(
  projectId: number,
  bugId: number,
  comment: string
): Promise<any> {
  return customFetch(`${BASE_URL}/${projectId}/bugs/${bugId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
    headers: { 'Content-Type': 'application/json' },
  });
}



