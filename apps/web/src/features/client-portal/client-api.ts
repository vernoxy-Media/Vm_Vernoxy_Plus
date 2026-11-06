const BASE = '/api/v1/client-portal';
const TOKEN_KEY = 'pulse_client_token';

export interface ClientUser {
  client_user_id: number;
  name: string;
  email: string;
  client_id: number;
  client_name: string;
  must_change_password: boolean;
}

export interface ClientProject {
  project_id: number;
  project_no: string;
  project_name: string;
  project_status: string;
  start_date: string;
  deadline: string;
  actual_end_date: string | null;
  manager_name: string | null;
  tasks_total: number;
  tasks_done: number;
  progress_percent: number;
  open_bugs: number;
}

export interface ClientProjectDetail extends ClientProject {
  tasks_by_stage: { to_do: number; in_progress: number; on_hold: number; in_review: number; done: number };
  sprints: Array<{ sprint_id: number; name: string; status: string; start_date: string; end_date: string; tasks_total: number; tasks_done: number; progress_percent: number }>;
}

export const clientToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ClientApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('X-Requested-With', 'pulse-web');
  if (init.body) headers.set('Content-Type', 'application/json');
  const token = clientToken.get();
  if (auth && token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const raw = body?.detail ?? body?.message;
    const message = Array.isArray(raw) ? raw.join(' ') : typeof raw === 'string' ? raw : 'Something went wrong. Please try again.';
    if (res.status === 401 && auth) clientToken.clear();
    throw new ClientApiError(message, res.status);
  }
  return body as T;
}

export const clientApi = {
  login: (email: string, password: string) =>
    call<{ access_token: string; must_change_password: boolean; user: Omit<ClientUser, 'must_change_password'> }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false),
  forgot: (email: string) => call<{ message: string }>('/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }, false),
  reset: (email: string, code: string, new_password: string) => call<void>('/password/reset', { method: 'POST', body: JSON.stringify({ email, code, new_password }) }, false),
  me: () => call<ClientUser>('/me'),
  changePassword: (current_password: string, new_password: string) => call<void>('/password/change', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),
  projects: () => call<ClientProject[]>('/projects'),
  project: (id: number) => call<ClientProjectDetail>(`/projects/${id}`),
};
