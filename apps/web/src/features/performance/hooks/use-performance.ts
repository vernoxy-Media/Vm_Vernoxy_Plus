import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

const API = '/api/v1/performance';

export type CycleType = 'YEARLY' | 'QUARTERLY' | 'MONTHLY';
export type CycleStatus = 'UPCOMING' | 'REVIEW_OPEN' | 'CLOSED';
export type QuestionType = 'STAR_RATING' | 'SHORT_ANSWER' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
export type ReviewPartStatus = 'PENDING' | 'SUBMITTED' | 'REOPENED';
export type ReviewPart = 'SELF' | 'MANAGER' | 'ADMIN';

export interface PerfCycleItem {
  cycle_id: number;
  cycle_name: string;
  name?: string;
  cycle_type: CycleType;
  year: number;
  quarter?: number | null;
  month?: number | null;
  start_date: string;
  end_date: string;
  review_start_date: string;
  review_end_date: string;
  status: CycleStatus;
  days_left?: number | null;
  can_edit?: boolean;
  forms_count?: number;
  reviews_count?: number;
  period_label?: string;
  window_label?: string;
}

export interface PerfQuestionItem {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;
  options?: Array<{ value: string; label: string }>;
  is_fixed: boolean;
  is_required: boolean;
  display_order?: number;
}

export interface PerfFormItem {
  form_id: number;
  form_name: string;
  cycle_id: number;
  cycle: { cycle_id: number; cycle_name: string; cycle_type: CycleType; status: CycleStatus } | null;
  department_ids: number[];
  departments: Array<{ dep_id: number; name: string }>;
  for_label: string;
  questions: PerfQuestionItem[];
  questions_label: string;
  is_published: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  can_edit: boolean;
  reviews_count: number;
}

export interface MyReviewResponse {
  is_admin: boolean;
  is_manager: boolean;
  is_project_manager: boolean;
  cycle: PerfCycleItem | null;
  form: { form_id: number; form_name: string; questions: PerfQuestionItem[] } | null;
  details?: { employee_name: string; emp_code: string; department_name: string; manager_name: string | null; cycle_type: CycleType };
  review: {
    review_id: number;
    status: ReviewPartStatus;
    ratings: Record<string, number>;
    answers: Record<string, any>;
    comment: string;
    average: number | null;
    submitted_at: string | null;
    reopened: boolean;
    reopened_reason: string | null;
    final_rating: number | null;
    final_pending: boolean;
  } | null;
  can_edit?: boolean;
  message?: string | null;
  project_ratings?: Array<{ project_id: number; project_name: string; rating: number }>;
  project_avg_rating?: number | null;
}

export interface TeamReviewItem {
  review_id: number | null;
  employee: { emp_id: number; name: string; emp_code: string; department_name: string; manager_name: string | null };
  has_manager: boolean;
  questions: PerfQuestionItem[];
  self: { status: ReviewPartStatus; submitted_at: string | null; ratings: Record<string, number>; answers: Record<string, any>; comment: string | null; average: number | null };
  mine: { status: ReviewPartStatus; ratings: Record<string, number>; answers: Record<string, any>; comment: string; average: number | null; submitted_at: string | null };
  done: boolean;
  can_edit: boolean;
  message: string | null;
}

export interface TeamReviewsResponse {
  mode: 'MANAGER' | 'ADMIN';
  cycle: PerfCycleItem | null;
  is_admin: boolean;
  is_manager: boolean;
  counts?: { total: number; done: number };
  items: TeamReviewItem[];
}

export interface PerfSummaryItem {
  review_id: number | null;
  emp_id: number;
  name: string;
  emp_code: string;
  department_name: string;
  manager_name: string | null;
  has_missing_manager: boolean;
  self_status: ReviewPartStatus;
  manager_status: ReviewPartStatus;
  admin_status: ReviewPartStatus;
  self_avg: number | null;
  manager_avg: number | null;
  admin_avg: number | null;
  final_rating: number | null;
  project_avg: number | null;
  status: 'COMPLETE' | 'PENDING';
  pending_by: string[];
  has_form: boolean;
}

export interface PerfSummaryResponse {
  cycle: PerfCycleItem | null;
  counts: { employees: number; completed: number; pending: number };
  items: PerfSummaryItem[];
  missing_manager_employees: Array<{ emp_id: number; name: string; department_name: string }>;
  departments_without_form: string[];
}

export interface ProjectItem {
  project_id: number;
  project_no?: string;
  project_name: string;
  project_manager_id: number;
  project_manager_name?: string;
}

export interface ProjectMembersResponse {
  project: { project_id: number; project_name: string; project_manager_name: string } | null;
  cycle: PerfCycleItem | null;
  submitted: boolean;
  can_edit: boolean;
  message: string | null;
  members: Array<{ emp_id: number; name: string; role_in_project: string; rating: number; comment: string; status: string | null }>;
}

function qs(params: Record<string, any>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** API problem details → message. */
export function perfErrMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  return err?.detail || err?.message || fallback;
}

/** API problem details → { field: message } for messages next to fields. */
export function perfFieldErrors(err: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of err?.errors || err?.invalid_params || []) {
    if (e && typeof e === 'object' && e.field && !out[e.field]) out[e.field] = e.message;
  }
  return out;
}

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  ['perf-cycles', 'perf-forms', 'perf-my-review', 'perf-team', 'perf-summary', 'perf-project-members', 'perf-coverage'].forEach((k) =>
    qc.invalidateQueries({ queryKey: [k] }),
  );
};

// ----------------------------------------------------------------------------- Cycles

export function usePerfCyclesQuery(filters: { cycle_type?: string; status?: string; year?: number; search?: string } = {}) {
  return useQuery<PerfCycleItem[]>({
    queryKey: ['perf-cycles', filters],
    queryFn: () => customFetch<PerfCycleItem[]>(`${API}/cycles${qs(filters)}`),
  });
}

export function useCyclePreviewQuery(p: { cycle_type: CycleType; year: number; quarter?: number; month?: number }, enabled = true) {
  return useQuery<{ cycle_name: string; start_date: string; end_date: string; review_start_date: string; review_end_date: string; status: CycleStatus }>({
    queryKey: ['perf-cycle-preview', p],
    queryFn: () => customFetch<any>(`${API}/cycles/preview${qs(p)}`),
    enabled,
  });
}

export function useCreatePerfCycleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { cycle_type: CycleType; year: number; quarter?: number; month?: number }) =>
      customFetch<PerfCycleItem>(`${API}/cycles`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdatePerfCycleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, payload }: { cycleId: number; payload: { cycle_type: CycleType; year: number; quarter?: number; month?: number } }) =>
      customFetch<PerfCycleItem>(`${API}/cycles/${cycleId}`, { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeletePerfCycleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cycleId: number) => customFetch<{ success: boolean }>(`${API}/cycles/${cycleId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAll(qc),
  });
}

// ----------------------------------------------------------------------------- Forms

export function usePerfFormsQuery(filters: { cycle_id?: number; cycle_type?: string; department_id?: number; status?: string; search?: string } = {}, enabled = true) {
  return useQuery<PerfFormItem[]>({
    queryKey: ['perf-forms', filters],
    queryFn: () => customFetch<PerfFormItem[]>(`${API}/forms${qs(filters)}`),
    enabled,
  });
}

export function useFixedQuestionsQuery(enabled = true) {
  return useQuery<PerfQuestionItem[]>({
    queryKey: ['perf-fixed-questions'],
    queryFn: () => customFetch<PerfQuestionItem[]>(`${API}/forms/fixed-questions`),
    staleTime: Infinity,
    enabled,
  });
}

export function useFormCoverageQuery(cycleId?: number) {
  return useQuery<Array<{ dep_id: number; name: string }>>({
    queryKey: ['perf-coverage', cycleId],
    queryFn: () => customFetch<any>(`${API}/forms/coverage/${cycleId}`),
    enabled: Boolean(cycleId),
  });
}

export interface FormPayload {
  form_name: string;
  cycle_id: number;
  department_ids: number[];
  questions: PerfQuestionItem[];
}

export function useSavePerfFormMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, payload }: { formId?: number; payload: FormPayload }) =>
      customFetch<PerfFormItem>(formId ? `${API}/forms/${formId}` : `${API}/forms`, {
        method: formId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function usePublishPerfFormMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, publish }: { formId: number; publish: boolean }) =>
      customFetch<PerfFormItem>(`${API}/forms/${formId}/${publish ? 'publish' : 'unpublish'}`, { method: 'POST' }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeletePerfFormMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formId: number) => customFetch<{ success: boolean }>(`${API}/forms/${formId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAll(qc),
  });
}

// ----------------------------------------------------------------------------- Reviews

export function useMyPerfReviewQuery(cycleId?: number) {
  return useQuery<MyReviewResponse>({
    queryKey: ['perf-my-review', cycleId],
    queryFn: () => customFetch<MyReviewResponse>(`${API}/reviews/my${qs({ cycle_id: cycleId })}`),
  });
}

export function useTeamReviewsQuery(p: { cycle_id?: number; as?: 'MANAGER' | 'ADMIN'; department_id?: number }, enabled = true) {
  return useQuery<TeamReviewsResponse>({
    queryKey: ['perf-team', p],
    queryFn: () => customFetch<TeamReviewsResponse>(`${API}/reviews/team${qs(p)}`),
    enabled,
  });
}

export function usePerfSummaryQuery(p: { cycle_id?: number; department_id?: number }, enabled = true) {
  return useQuery<PerfSummaryResponse>({
    queryKey: ['perf-summary', p],
    queryFn: () => customFetch<PerfSummaryResponse>(`${API}/reviews/summary${qs(p)}`),
    enabled,
  });
}

export function useSubmitReviewMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      part,
      reviewId,
      payload,
    }: {
      part: ReviewPart;
      reviewId: number;
      payload: { ratings: Record<string, number>; answers: Record<string, any>; comment?: string; is_draft: boolean };
    }) =>
      customFetch<any>(`${API}/reviews/${reviewId}/${part === 'SELF' ? 'self' : part === 'MANAGER' ? 'manager' : 'admin'}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useReopenReviewMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, part, reason }: { reviewId: number; part: ReviewPart; reason: string }) =>
      customFetch<any>(`${API}/reviews/${reviewId}/reopen`, { method: 'POST', body: JSON.stringify({ part, reason }) }),
    onSuccess: () => invalidateAll(qc),
  });
}

// ----------------------------------------------------------------------------- Project Rating

export function useMyProjectsQuery(enabled = true) {
  return useQuery<ProjectItem[]>({
    queryKey: ['perf-my-projects'],
    queryFn: () => customFetch<ProjectItem[]>(`${API}/projects`),
    enabled,
  });
}

export function useProjectMembersRatingQuery(projectId?: number, cycleId?: number) {
  return useQuery<ProjectMembersResponse>({
    queryKey: ['perf-project-members', projectId, cycleId],
    queryFn: () => customFetch<ProjectMembersResponse>(`${API}/projects/${projectId}/members?cycle_id=${cycleId}`),
    enabled: Boolean(projectId && cycleId),
  });
}

export function useSaveProjectRatingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { project_id: number; cycle_id: number; is_draft: boolean; ratings: Array<{ emp_id: number; rating: number; comment?: string }> }) =>
      customFetch<any>(`${API}/projects/ratings`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateAll(qc),
  });
}
