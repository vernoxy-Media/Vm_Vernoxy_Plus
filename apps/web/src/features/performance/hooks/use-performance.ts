import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

const API_BASE = '/api/v1/performance';

export interface PerfCycleItem {
  cycle_id: number;
  cycle_name: string;
  name?: string;
  cycle_type: 'YEARLY' | 'QUARTERLY' | 'MONTHLY';
  year: number;
  quarter?: number | null;
  month?: number | null;
  start_date: string;
  end_date: string;
  review_start_date: string;
  review_end_date: string;
  status: 'UPCOMING' | 'REVIEW_OPEN' | 'CLOSED';
  created_at: string;
  updated_at?: string;
  _count?: {
    perf_forms?: number;
    perf_reviews?: number;
  };
}

export interface PerfQuestionOption {
  value: string;
  label: string;
}

export interface PerfQuestionItem {
  id: string;
  title: string;
  description?: string;
  type: 'STAR_RATING' | 'SHORT_ANSWER' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  is_fixed: boolean;
  required: boolean;
  options?: PerfQuestionOption[];
}

export interface PerfFormItem {
  form_id: number;
  cycle_id: number;
  form_name: string;
  description?: string | null;
  department_ids: number[];
  questions: PerfQuestionItem[];
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  perf_cycles?: {
    cycle_id: number;
    cycle_name?: string;
    name?: string;
    cycle_type?: string;
    status: string;
  };
}

export interface PerfReviewEmployee {
  emp_id: number;
  name: string;
  employee_code?: string;
  email: string;
  profile_picture?: string | null;
  departments?: { name: string; dep_id: number } | null;
  roles?: { role_name: string; role_id: number } | null;
}

export interface PerfReviewItem {
  review_id: number;
  cycle_id: number;
  emp_id: number;
  manager_emp_id?: number | null;
  admin_emp_id?: number | null;
  self_ratings?: Record<string, number> | null;
  self_answers?: Record<string, any> | null;
  self_comments?: string | null;
  self_submitted_at?: string | null;
  manager_ratings?: Record<string, number> | null;
  manager_answers?: Record<string, any> | null;
  manager_comments?: string | null;
  manager_submitted_at?: string | null;
  admin_rating?: number | null;
  admin_comments?: string | null;
  admin_submitted_at?: string | null;
  final_rating?: number | null;
  status: 'PENDING' | 'SELF_SUBMITTED' | 'MANAGER_REVIEWED' | 'ADMIN_APPROVED' | 'CLOSED';
  is_locked: boolean;
  reopened_at?: string | null;
  reopened_by?: number | null;
  reopen_reason?: string | null;
  created_at: string;
  updated_at?: string;
  employees_perf_reviews_emp_idToemployees?: PerfReviewEmployee;
  employees_perf_reviews_manager_emp_idToemployees?: PerfReviewEmployee;
  perf_forms?: PerfFormItem;
  perf_cycles?: {
    cycle_id: number;
    name: string;
    status: string;
    review_start_date: string;
    review_end_date: string;
  };
}

export interface PerfSummaryItem {
  review_id: number;
  emp_id: number;
  name: string;
  employee_code?: string;
  email: string;
  department_name: string;
  designation: string;
  self_avg: number | null;
  manager_avg: number | null;
  project_avg?: number | null;
  final_rating: number | null;
  status: string;
  is_locked: boolean;
  cycle_id: number;
  cycle_name: string;
  reopened_at?: string | null;
  has_missing_manager?: boolean;
}

export interface CreatePerfCyclePayload {
  cycle_name?: string;
  cycle_type: 'YEARLY' | 'QUARTERLY' | 'MONTHLY';
  year: number;
  quarter?: number;
  month?: number;
  review_start_date?: string;
  review_end_date?: string;
}

export interface UpdatePerfCyclePayload {
  cycle_name?: string;
  status?: 'UPCOMING' | 'REVIEW_OPEN' | 'CLOSED';
  start_date?: string;
  end_date?: string;
  review_start_date?: string;
  review_end_date?: string;
}

export interface CreatePerfFormPayload {
  cycle_id: number;
  form_name: string;
  description?: string;
  department_ids?: number[];
  questions?: PerfQuestionItem[];
  is_published?: boolean;
}

export interface UpdatePerfFormPayload {
  form_name?: string;
  description?: string;
  department_ids?: number[];
  questions?: PerfQuestionItem[];
  is_published?: boolean;
}

export interface SubmitReviewPayload {
  ratings: Record<string, number>;
  answers?: Record<string, any>;
  comments?: string;
  is_draft?: boolean;
}

export interface AdminRatingPayload {
  final_rating: number;
  admin_comments?: string;
}

/* =========================================================================
   React Query Hooks: Cycles
   ========================================================================= */

export function usePerfCyclesQuery(filters?: {
  cycle_type?: string;
  status?: string;
  year?: number;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.cycle_type) params.append('cycle_type', filters.cycle_type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.year) params.append('year', String(filters.year));
  if (filters?.search) params.append('search', filters.search);

  const queryStr = params.toString();
  const url = `${API_BASE}/cycles${queryStr ? `?${queryStr}` : ''}`;

  return useQuery<PerfCycleItem[]>({
    queryKey: ['perf-cycles', filters],
    queryFn: async () => {
      const res = await customFetch<{ data: PerfCycleItem[] } | PerfCycleItem[]>(url);
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    },
  });
}

export function usePerfActiveCycleQuery() {
  return useQuery<PerfCycleItem | null>({
    queryKey: ['perf-cycle-active'],
    queryFn: async () => {
      return customFetch<PerfCycleItem | null>(`${API_BASE}/cycles/active`);
    },
  });
}

export function useCreatePerfCycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePerfCyclePayload) => {
      return customFetch<PerfCycleItem>(`${API_BASE}/cycles`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['perf-cycle-active'] });
    },
  });
}

export function useUpdatePerfCycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cycleId, payload }: { cycleId: number; payload: UpdatePerfCyclePayload }) => {
      return customFetch<PerfCycleItem>(`${API_BASE}/cycles/${cycleId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['perf-cycle-active'] });
    },
  });
}

export function useDeletePerfCycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cycleId: number) => {
      return customFetch<{ success: boolean }>(`${API_BASE}/cycles/${cycleId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['perf-cycle-active'] });
    },
  });
}

/* =========================================================================
   React Query Hooks: Forms
   ========================================================================= */

export function usePerfFormsQuery(filters?: {
  cycle_id?: number;
  department_id?: number;
  is_published?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.cycle_id) params.append('cycle_id', String(filters.cycle_id));
  if (filters?.department_id) params.append('department_id', String(filters.department_id));
  if (typeof filters?.is_published === 'boolean') {
    params.append('is_published', String(filters.is_published));
  }

  const queryStr = params.toString();
  const url = `${API_BASE}/forms${queryStr ? `?${queryStr}` : ''}`;

  return useQuery<PerfFormItem[]>({
    queryKey: ['perf-forms', filters],
    queryFn: async () => {
      const res = await customFetch<{ data: PerfFormItem[] } | PerfFormItem[]>(url);
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    },
  });
}

export function useCreatePerfFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePerfFormPayload) => {
      return customFetch<PerfFormItem>(`${API_BASE}/forms`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-forms'] });
    },
  });
}

export function useUpdatePerfFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ formId, payload }: { formId: number; payload: UpdatePerfFormPayload }) => {
      return customFetch<PerfFormItem>(`${API_BASE}/forms/${formId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-forms'] });
    },
  });
}

export function useDeletePerfFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formId: number) => {
      return customFetch<{ success: boolean }>(`${API_BASE}/forms/${formId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-forms'] });
    },
  });
}

export function usePublishPerfFormMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formId: number) => {
      return customFetch<PerfFormItem>(`${API_BASE}/forms/${formId}/publish`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-forms'] });
    },
  });
}

/* =========================================================================
   React Query Hooks: Reviews & Evaluation Workflows
   ========================================================================= */

export function useMyPerfReviewQuery(cycleId?: number) {
  const url = `${API_BASE}/reviews/my${cycleId ? `?cycle_id=${cycleId}` : ''}`;
  return useQuery<{
    cycle: PerfCycleItem | null;
    form: PerfFormItem | null;
    review: PerfReviewItem | null;
    project_avg_rating?: number | null;
    project_ratings?: Array<{
      project_id: number;
      project_name?: string;
      project_code?: string;
      rating: number;
      feedback?: string;
    }>;
    is_window_open: boolean;
    role?: string;
    is_admin?: boolean;
    is_manager?: boolean;
    is_project_manager?: boolean;
    can_review_self?: boolean;
    can_review_team?: boolean;
    can_rate_projects?: boolean;
    can_view_summary?: boolean;
  }>({
    queryKey: ['perf-my-review', cycleId],
    queryFn: async () => {
      return customFetch<any>(url);
    },
  });
}

export function useSubmitSelfReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, payload }: { reviewId: number; payload: SubmitReviewPayload }) => {
      return customFetch<PerfReviewItem>(`${API_BASE}/reviews/${reviewId}/self-review`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-my-review'] });
      queryClient.invalidateQueries({ queryKey: ['perf-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['perf-summary'] });
    },
  });
}

export function usePerfReviewsQuery(
  filters?: {
    cycle_id?: number;
    department_id?: number;
    status?: string;
    search?: string;
  },
  options?: { enabled?: boolean },
) {
  const params = new URLSearchParams();
  if (filters?.cycle_id) params.append('cycle_id', String(filters.cycle_id));
  if (filters?.department_id) params.append('department_id', String(filters.department_id));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);

  const queryStr = params.toString();
  const url = `${API_BASE}/reviews${queryStr ? `?${queryStr}` : ''}`;

  return useQuery<PerfReviewItem[]>({
    queryKey: ['perf-reviews', filters],
    queryFn: async () => {
      const res = await customFetch<{ data: PerfReviewItem[] } | PerfReviewItem[]>(url);
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    },
    enabled: options?.enabled ?? true,
  });
}

export function useSubmitManagerReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, payload }: { reviewId: number; payload: SubmitReviewPayload }) => {
      return customFetch<PerfReviewItem>(`${API_BASE}/reviews/${reviewId}/manager-review`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['perf-summary'] });
    },
  });
}

export interface MissingManagerEmployee {
  emp_id: number;
  name: string;
  email: string;
  department_name?: string;
}

export interface PerfSummaryQueryResult {
  items: PerfSummaryItem[];
  missing_manager_employees: MissingManagerEmployee[];
}

export function usePerfSummaryQuery(
  filters?: {
    cycle_id?: number;
    department_id?: number;
    rating_filter?: string;
    search?: string;
  },
  options?: { enabled?: boolean },
) {
  const params = new URLSearchParams();
  if (filters?.cycle_id) params.append('cycle_id', String(filters.cycle_id));
  if (filters?.department_id) params.append('department_id', String(filters.department_id));
  if (filters?.rating_filter) params.append('rating_filter', filters.rating_filter);
  if (filters?.search) params.append('search', filters.search);

  const queryStr = params.toString();
  const url = `${API_BASE}/reviews/summary${queryStr ? `?${queryStr}` : ''}`;

  return useQuery<PerfSummaryQueryResult>({
    queryKey: ['perf-summary', filters],
    queryFn: async () => {
      const res = await customFetch<any>(url);
      if (Array.isArray(res)) {
        return { items: res, missing_manager_employees: [] };
      }
      return {
        items: res?.items || res?.data || [],
        missing_manager_employees: res?.missing_manager_employees || [],
      };
    },
    enabled: options?.enabled ?? true,
  });
}

export function useAdminRatingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, payload }: { reviewId: number; payload: AdminRatingPayload }) => {
      return customFetch<PerfReviewItem>(`${API_BASE}/reviews/${reviewId}/admin-rating`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-summary'] });
      queryClient.invalidateQueries({ queryKey: ['perf-reviews'] });
    },
  });
}

export function useReopenReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: number; reason: string }) => {
      return customFetch<PerfReviewItem>(`${API_BASE}/reviews/${reviewId}/reopen`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-summary'] });
      queryClient.invalidateQueries({ queryKey: ['perf-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['perf-my-review'] });
    },
  });
}

export function usePerfProjectRatingsQuery(filters?: { project_id?: number; cycle_id?: number }) {
  const params = new URLSearchParams();
  if (filters?.project_id) params.append('project_id', String(filters.project_id));
  if (filters?.cycle_id) params.append('cycle_id', String(filters.cycle_id));

  const queryStr = params.toString();
  const url = `${API_BASE}/reviews/project-ratings${queryStr ? `?${queryStr}` : ''}`;

  return useQuery<any[]>({
    queryKey: ['perf-project-ratings', filters],
    queryFn: async () => {
      const res = await customFetch<any[]>(url);
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    },
  });
}

export function useSubmitProjectRatingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      project_id: number;
      cycle_id: number;
      ratings: Array<{ emp_id: number; rating: number; comment?: string }>;
    }) => {
      return customFetch<any>(`${API_BASE}/reviews/project-ratings`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-project-ratings'] });
    },
  });
}

export interface ProjectItem {
  project_id: number;
  project_no: string;
  project_name: string;
  project_manager_id: number;
  employees_projects_project_manager_idToemployees?: {
    emp_id: number;
    name: string;
  };
}

export interface ProjectMemberRatingItem {
  member_id: number;
  emp_id: number;
  name: string;
  email?: string;
  role_in_project: string;
  rating: number;
  comment?: string;
  submitted_at?: string | null;
}

export function useMyProjectsQuery() {
  return useQuery<ProjectItem[]>({
    queryKey: ['perf-my-projects'],
    queryFn: async () => {
      const res = await customFetch<ProjectItem[]>(`${API_BASE}/projects`);
      return Array.isArray(res) ? res : [];
    },
  });
}

export function useProjectMembersRatingQuery(projectId?: number, cycleId?: number) {
  return useQuery<{
    project: any;
    members: ProjectMemberRatingItem[];
  }>({
    queryKey: ['perf-project-members', projectId, cycleId],
    queryFn: async () => {
      if (!projectId || !cycleId) return { project: null, members: [] };
      return customFetch<any>(`${API_BASE}/projects/${projectId}/members?cycle_id=${cycleId}`);
    },
    enabled: Boolean(projectId && cycleId),
  });
}

export function useSubmitBulkProjectRatingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      project_id: number;
      cycle_id: number;
      ratings: Array<{ emp_id: number; rating: number; comment?: string }>;
    }) => {
      return customFetch<any>(`${API_BASE}/projects/ratings`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perf-project-members'] });
      queryClient.invalidateQueries({ queryKey: ['perf-summary'] });
    },
  });
}
