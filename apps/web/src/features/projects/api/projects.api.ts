import { customFetch } from '@vernoxy-pulse/api-client';
import type {
  AssignableEmployee,
  ClientOption,
  CreateProjectPayload,
  CreateProjectTaskPayload,
  CreateSprintPayload,
  DeliveryReadiness,
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
  reason?: string,
  /** Admin only: deliver even though work is still open (a reason is required). */
  force?: boolean
): Promise<ProjectItem> {
  return customFetch<ProjectItem>(`${BASE_URL}/${projectId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason, force }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** What is still open in the project, for the delivery check. */
export async function fetchDeliveryReadiness(projectId: number): Promise<DeliveryReadiness> {
  return customFetch<DeliveryReadiness>(`${BASE_URL}/${projectId}/delivery-readiness`);
}

/** A bug from any project that is assigned to, or was reported by, the signed-in employee. */
export interface MyBugItem {
  bug_id: number;
  bug_code: string;
  project_id: number;
  project_no: string | null;
  project_name: string | null;
  task_id?: number | null;
  title: string;
  priority: string;
  status: string;
  assigned_to: number | null;
  assigned_to_name: string;
  reported_by: number | null;
  reported_by_name: string;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
}

/** Admin: pass an employee id, or 'all', to see their bugs instead of your own. */
export async function fetchMyBugs(employeeId?: string): Promise<MyBugItem[]> {
  return customFetch<MyBugItem[]>(`${BASE_URL}/my-bugs${employeeId ? `?employee_id=${encodeURIComponent(employeeId)}` : ''}`);
}

/** Clients to choose from when creating or editing a project. */
export async function fetchClientOptions(): Promise<ClientOption[]> {
  return customFetch<ClientOption[]>(`${BASE_URL}/client-options`);
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
  attachments?: string[],
  tagged_employee_ids?: number[]
): Promise<ProjectDiscussionItem> {
  return customFetch<ProjectDiscussionItem>(`${BASE_URL}/${projectId}/discussions`, {
    method: 'POST',
    body: JSON.stringify({ message, attachments, tagged_employee_ids }),
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

export const BUG_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export async function createProjectBug(
  projectId: number,
  payload: CreateProjectBugPayload
): Promise<ProjectBugItem> {
  const { attachment_file, ...body } = payload;
  if (attachment_file) {
    // BFD 3.5: Attachment is optional, a screenshot or document of at most 5 MB.
    if (attachment_file.size > BUG_ATTACHMENT_MAX_BYTES) {
      throw new Error('The attachment cannot be larger than 5 MB.');
    }
    const form = new FormData();
    form.append('file', attachment_file);
    form.append('entity_type', 'project_bug');
    form.append('entity_id', '0');
    const uploaded = await customFetch<{ attachment_id: number; file_url?: string }>('/api/v1/attachments/upload', {
      method: 'POST',
      body: form,
    });
    body.attachment_url = `/api/v1/attachments/${uploaded.attachment_id}/download`;
  }
  return customFetch<ProjectBugItem>(`${BASE_URL}/${projectId}/bugs`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Change the start / due date of a bug. A date left out stays; null clears it. */
export async function updateBugDates(
  projectId: number,
  bugId: number,
  dates: { start_date?: string | null; due_date?: string | null },
): Promise<ProjectBugItem> {
  return customFetch<ProjectBugItem>(`${BASE_URL}/${projectId}/bugs/${bugId}/dates`, {
    method: 'PATCH',
    body: JSON.stringify(dates),
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




/** Moves a task (with its sub-tasks) into a sprint, or back to the backlog when sprintId is null. */
export async function moveTaskToSprint(projectId: number, taskId: number, sprintId: number | null): Promise<void> {
  await customFetch(`${BASE_URL}/${projectId}/tasks/${taskId}/sprint`, {
    method: 'PATCH',
    body: JSON.stringify({ sprint_id: sprintId }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Completes a sprint; unfinished tasks go to moveToSprintId, or to the backlog when it is null. */
export async function completeSprint(
  projectId: number,
  sprintId: number,
  moveToSprintId: number | null,
): Promise<{ sprint: SprintItem; moved_tasks: number }> {
  return customFetch<{ sprint: SprintItem; moved_tasks: number }>(`${BASE_URL}/${projectId}/sprints/${sprintId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ move_to_sprint_id: moveToSprintId }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export interface AddSubTaskPayload {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  allocated_minutes: number;
  assignee_ids: number[];
  start_date?: string;
  due_date?: string;
  task_type_id?: number;
  other_task_type?: string;
}

/** Adds a sub-task to a task that already exists. The parent's estimate becomes the total of its sub-tasks. */
export async function addSubTask(projectId: number, taskId: number, payload: AddSubTaskPayload): Promise<void> {
  await customFetch(`${BASE_URL}/${projectId}/tasks/${taskId}/sub-tasks`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}
