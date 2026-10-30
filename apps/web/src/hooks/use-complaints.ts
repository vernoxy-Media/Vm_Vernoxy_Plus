import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { ComplaintPriority } from './use-complaint-settings';

export type ComplaintStatus = 'New' | 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type ClosureType = 'Resolved' | 'Without action' | 'Withdrawn';

export type CloseWithoutActionReason =
  | 'Duplicate'
  | 'Not a complaint'
  | 'Belongs to another process'
  | 'Not enough information'
  | 'Other';

export type ResolutionOutcome =
  | 'Resolved – issue fixed'
  | 'Resolved – explained'
  | 'Partly resolved'
  | 'Not upheld'
  | 'Action taken';

export interface ComplaintSummaryItem {
  complaint_id: number;
  complaint_no: string;
  complaint_date: string;
  subject: string;
  type_id: number;
  type_name: string;
  complainant_id?: number;
  complainant_name?: string;
  department_name: string;
  handler_name: string;
  status: ComplaintStatus;
  priority: string;
  is_confidential?: boolean;
  is_overdue: boolean;
  target_date?: string | null;
  created_at: string;
}

export interface MyComplaintsResponse {
  counters: {
    active: number;
    resolved_waiting: number;
    closed_this_year: number;
    overdue: number;
  };
  complaints: ComplaintSummaryItem[];
}

export interface AllComplaintsResponse {
  counters: {
    new_waiting: number;
    open_or_in_progress: number;
    overdue: number;
    avg_days_to_resolve_this_month: number;
  };
  complaints: ComplaintSummaryItem[];
}

export interface ComplaintActionItem {
  action_id: number;
  action_date: string;
  action_text: string;
  created_by_name: string;
  created_at: string;
  files: Array<{
    attachment_id: number;
    file_name: string;
    file_url: string;
    file_size_bytes: number;
    mime_type: string;
  }>;
}

export interface ComplaintRemarkItem {
  remark_id: number;
  remark_text: string;
  is_internal: boolean;
  created_by_id: number;
  created_by_name: string;
  created_at: string;
}

export interface ComplaintResolutionItem {
  resolution_id: number;
  cycle_number: number;
  outcome: ResolutionOutcome;
  resolution_details: string;
  root_cause?: string;
  resolved_by_name: string;
  resolved_at: string;
  confirmation_window_ends_at: string;
  employee_confirmation_status: 'Pending' | 'Confirmed' | 'Reopened' | 'No response';
  employee_confirmed_at?: string | null;
  employee_comment?: string | null;
  reopened_at?: string | null;
  reopen_reason?: string | null;
  files: Array<{
    attachment_id: number;
    file_name: string;
    file_url: string;
    file_size_bytes: number;
    mime_type: string;
  }>;
}

export interface ComplaintHistoryItem {
  history_id: number;
  event: string;
  performed_by_name: string;
  old_value?: string | null;
  new_value?: string | null;
  remarks?: string | null;
  is_internal: boolean;
  created_at: string;
}

export interface ComplaintDetailResponse {
  complaint_id: number;
  complaint_no: string;
  complainant_id: number;
  complainant_name: string;
  complainant_email?: string;
  complainant_mobile?: string;
  complaint_date: string;
  related_department_id: number;
  related_department_name: string;
  related_project_id?: number | null;
  related_project_name?: string | null;
  type_id: number;
  type_name: string;
  subject: string;
  description: string;
  is_confidential: boolean;
  status: ComplaintStatus;
  priority?: ComplaintPriority | null;
  handler_id?: number | null;
  handler_name?: string | null;
  assigned_at?: string | null;
  first_target_date?: string | null;
  target_date?: string | null;
  is_overdue: boolean;
  overdue_days: number;
  reopen_count: number;
  is_self_reviewed: boolean;
  closure_type?: ClosureType | null;
  closed_at?: string | null;
  closure_remarks?: string | null;
  close_without_action_reason?: CloseWithoutActionReason | null;
  close_without_action_remarks?: string | null;
  linked_complaint?: {
    complaint_id: number;
    complaint_no: string;
    subject: string;
    status: string;
  } | null;
  withdrawal_reason?: string | null;
  withdrawn_at?: string | null;
  created_at: string;
  attachments: Array<{
    attachment_id: number;
    file_name: string;
    file_url: string;
    file_size_bytes: number;
    mime_type: string;
  }>;
  actions: ComplaintActionItem[];
  remarks: ComplaintRemarkItem[];
  resolutions: ComplaintResolutionItem[];
  history: ComplaintHistoryItem[];
}

export interface CreateComplaintPayload {
  subject: string;
  complaint_type_id: number;
  complaint_date: string;
  related_department_id: number;
  related_project_id?: number;
  description: string;
  remarks?: string;
  is_confidential?: boolean;
  attachment_ids?: number[];
}

export interface AcceptAndAssignPayload {
  handler_id: number;
  priority: ComplaintPriority;
  target_date: string;
  remarks?: string;
}

export interface CloseWithoutActionPayload {
  reason: CloseWithoutActionReason;
  remarks: string;
  linked_complaint_id?: number;
}

export interface AddActionPayload {
  action_date: string;
  action_text: string;
  attachment_ids?: number[];
}

export interface AddRemarkPayload {
  remark_text: string;
  is_internal?: boolean;
}

export interface RecordResolutionPayload {
  outcome: ResolutionOutcome;
  resolution_details: string;
  root_cause?: string;
  attachment_ids?: number[];
}

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

export function useMyComplaintsQuery(year?: number, status?: string, typeId?: number) {
  return useQuery({
    queryKey: ['complaints', 'my', { year, status, typeId }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (year) params.append('year', String(year));
      if (status) params.append('status', status);
      if (typeId) params.append('typeId', String(typeId));
      const qs = params.toString();
      return customFetch<MyComplaintsResponse>(qs ? `/api/v1/complaints/my?${qs}` : '/api/v1/complaints/my');
    },
  });
}

export function useCreateComplaintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateComplaintPayload) =>
      customFetch<ComplaintDetailResponse>('/api/v1/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

export function useAllComplaintsQuery(filters: {
  tab?: 'Active' | 'New' | 'Resolved' | 'Closed' | 'All';
  type_id?: number;
  department_id?: number;
  priority?: string;
  handler_id?: number;
  from_date?: string;
  to_date?: string;
  search?: string;
} = {}) {
  return useQuery({
    queryKey: ['complaints', 'all', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.tab) params.append('tab', filters.tab);
      if (filters.type_id) params.append('type_id', String(filters.type_id));
      if (filters.department_id) params.append('department_id', String(filters.department_id));
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.handler_id) params.append('handler_id', String(filters.handler_id));
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      if (filters.search) params.append('search', filters.search);
      const qs = params.toString();
      return customFetch<AllComplaintsResponse>(qs ? `/api/v1/complaints?${qs}` : '/api/v1/complaints');
    },
  });
}

export function useComplaintDetailsQuery(id?: number | null) {
  return useQuery({
    queryKey: ['complaints', 'detail', id],
    queryFn: () => customFetch<ComplaintDetailResponse>(`/api/v1/complaints/${id}`),
    enabled: !!id,
  });
}

export function useAcceptAndAssignMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AcceptAndAssignPayload }) =>
      customFetch<any>(`/api/v1/complaints/${id}/accept-and-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useCloseWithoutActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CloseWithoutActionPayload }) =>
      customFetch<any>(`/api/v1/complaints/${id}/close-without-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useReassignHandlerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, handler_id, reason }: { id: number; handler_id: number; reason: string }) =>
      customFetch<any>(`/api/v1/complaints/${id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handler_id, reason }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useChangePriorityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority, reason }: { id: number; priority: ComplaintPriority; reason: string }) =>
      customFetch<any>(`/api/v1/complaints/${id}/change-priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority, reason }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useChangeTargetDateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, target_date, reason }: { id: number; target_date: string; reason: string }) =>
      customFetch<any>(`/api/v1/complaints/${id}/change-target-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_date, reason }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useChangeConfidentialityMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_confidential, reason }: { id: number; is_confidential: boolean; reason?: string }) =>
      customFetch<any>(`/api/v1/complaints/${id}/change-confidentiality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_confidential, reason }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useStartWorkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<any>(`/api/v1/complaints/${id}/start-work`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', id] });
    },
  });
}

export function useAddActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddActionPayload }) =>
      customFetch<any>(`/api/v1/complaints/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useAddRemarkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddRemarkPayload }) =>
      customFetch<any>(`/api/v1/complaints/${id}/remarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useRecordResolutionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RecordResolutionPayload }) =>
      customFetch<any>(`/api/v1/complaints/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useConfirmResolutionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment?: string }) =>
      customFetch<any>(`/api/v1/complaints/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useReopenComplaintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      customFetch<any>(`/api/v1/complaints/${id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useSendBackMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks, target_date }: { id: number; remarks: string; target_date?: string }) =>
      customFetch<any>(`/api/v1/complaints/${id}/send-back`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks, target_date }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useCloseComplaintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      customFetch<any>(`/api/v1/complaints/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

export function useWithdrawComplaintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      customFetch<any>(`/api/v1/complaints/${id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'detail', vars.id] });
    },
  });
}

// -----------------------------------------------------------------------------
// Reports Hook (BFD Section 11)
// -----------------------------------------------------------------------------

export interface ComplaintReportsResponse {
  period: {
    month: string;
    from_date: string;
    to_date: string;
    date_basis: string;
  };
  totals: {
    received: number;
    closed: number;
    avg_time_to_resolve_days: number;
    overdue_now: number;
    reopened: number;
  };
  trend: Array<{
    month: string;
    label: string;
    received: number;
    closed: number;
    is_selected: boolean;
  }>;
  breakdown: Array<{
    name: string;
    received: number;
    closed: number;
    active: number;
    overdue: number;
    avg_days: number;
  }>;
  complaints: Array<{
    complaint_id: number;
    complaint_no: string;
    complaint_date: string;
    complainant_name: string;
    department_name: string;
    type_name: string;
    priority: string;
    handler_name: string;
    status: string;
    target_date?: string | null;
    resolved_at?: string | null;
    outcome?: string | null;
    closure_type?: string | null;
    reopen_count: number;
    is_self_reviewed: boolean;
  }>;
}

export function useComplaintReportsQuery(filters: {
  report_type?: string;
  month?: string;
  from_date?: string;
  to_date?: string;
  date_basis?: 'SUBMITTED' | 'RESOLVED' | 'CLOSED';
  department_id?: number;
  handler_id?: number;
  complaint_type_id?: number;
  priority?: string;
  status?: string;
  group_by?: 'type' | 'department' | 'handler';
} = {}) {
  return useQuery({
    queryKey: ['complaints', 'reports', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.report_type) params.append('report_type', filters.report_type);
      if (filters.month) params.append('month', filters.month);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      if (filters.date_basis) params.append('date_basis', filters.date_basis);
      if (filters.department_id) params.append('department_id', String(filters.department_id));
      if (filters.handler_id) params.append('handler_id', String(filters.handler_id));
      if (filters.complaint_type_id) params.append('complaint_type_id', String(filters.complaint_type_id));
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.status) params.append('status', filters.status);
      if (filters.group_by) params.append('group_by', filters.group_by);
      const qs = params.toString();
      return customFetch<ComplaintReportsResponse>(qs ? `/api/v1/complaints/reports?${qs}` : '/api/v1/complaints/reports');
    },
  });
}

export function useProjectsListQuery() {
  return useQuery({
    queryKey: ['projects', 'simple-list'],
    queryFn: async () => {
      try {
        const res = await customFetch<any>('/api/v1/projects');
        return Array.isArray(res) ? res : ((res as any)?.items || []);
      } catch {
        return [];
      }
    },
  });
}

