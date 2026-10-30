import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

// =============================================================================
// Interfaces
// =============================================================================

export interface LeaveType {
  leave_type_id: number;
  name: string;
  code: string;
  is_paid: boolean;
  balance_tracked: boolean;
  half_day_allowed: boolean;
  applies_to: 'ALL' | 'FEMALE_ONLY' | 'MALE_ONLY';
  calendar_color: string;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at?: string | null;
}

export interface LeavePolicyRule {
  rule_id: number;
  policy_id: number;
  leave_type_id: number;
  leave_type_name?: string;
  leave_type_code?: string;
  is_paid?: boolean;
  calendar_color?: string;
  days_per_year?: number | null;
  credit_frequency: 'YEARLY' | 'MONTHLY' | 'FROM_APPROVED_OT';
  carry_forward_days: number;
  max_at_once?: number | null;
  min_notice_days: number;
  backdated_days: number;
  attachment_after_days?: number | null;
  allowed_during_probation: boolean;
  comp_off_expiry_days: number;
}

export interface LeavePolicy {
  policy_id: number;
  name: string;
  pro_rata: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  employees_count?: number;
  rules_count?: number;
  rules: LeavePolicyRule[];
}

export interface LeaveGeneralSettings {
  setting_id: number;
  leave_year_start: 'JANUARY_TO_DECEMBER' | 'APRIL_TO_MARCH';
  count_sandwich_leave: boolean;
  pending_reminder_hours: number;
  approve_after_leave_started: boolean;
  year_end_processing: 'AUTOMATIC' | 'MANUAL';
  comp_off_hours_per_day: number;
  updated_at: string;
  updated_by?: number | null;
}

export interface LeaveSettingsChangeLog {
  log_id: number;
  entity_type: string;
  entity_id: number;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
  changed_by: number;
  changed_by_name?: string | null;
  changed_at: string;
}

export interface LeaveBalanceItem {
  balance_id: number;
  emp_id: number;
  leave_type_id: number;
  leave_year: number;
  leave_type_name: string;
  leave_type_code: string;
  is_paid: boolean;
  balance_tracked: boolean;
  calendar_color: string;
  opening_balance: number;
  credited_days: number;
  carried_forward_days: number;
  days_taken: number;
  days_booked: number;
  available_balance: number;
  nearest_expiry?: string | null;
}

export interface LeaveRequestItem {
  request_id: number;
  request_no: string;
  emp_id: number;
  employee_name?: string;
  department_name?: string;
  leave_type_id: number;
  leave_type_name: string;
  leave_type_code: string;
  calendar_color: string;
  is_paid: boolean;
  duration: 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';
  from_date: string;
  to_date: string;
  leave_days: number;
  reason: string;
  attachment_url?: string | null;
  is_short_notice: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'CANCELLATION_REQUESTED' | 'CANCELLED';
  applied_at: string;
  applied_by: number;
  decided_at?: string | null;
  decided_by?: number | null;
  decision_remarks?: string | null;
  is_self_approved: boolean;
  cancellation_reason?: string | null;
  cancellation_requested_at?: string | null;
  cancellation_remarks?: string | null;
  current_available_balance?: number;
}

export interface MyLeaveOverviewResponse {
  employee: {
    emp_id: number;
    name: string;
    status: string;
    leave_policy_id?: number | null;
    policy_name?: string | null;
  };
  current_year: number;
  policy_name: string;
  balances: LeaveBalanceItem[];
  requests: LeaveRequestItem[];
}

export interface LeaveDayBreakdown {
  date: string;
  day_type: 'WORKING_DAY' | 'WEEKLY_OFF' | 'HOLIDAY';
  day_count: number;
  note: string;
}

export interface CalculateLeaveDaysResponse {
  leave_days: number;
  counted_days: number;
  days_breakdown: LeaveDayBreakdown[];
  is_short_notice: boolean;
  attachment_required: boolean;
  rule?: any;
}

export interface AdminLeaveRequestsResponse {
  counters: {
    pending_count: number;
    cancellation_requests_count: number;
    on_leave_today_count: number;
    approved_this_month_count: number;
  };
  requests: LeaveRequestItem[];
}

export interface LeaveLedgerEntry {
  ledger_id: number;
  emp_id: number;
  leave_type_id: number;
  leave_type_name: string;
  leave_type_code: string;
  entry_type: string;
  days: number;
  balance_after: number;
  note: string;
  reference_request_id?: number | null;
  performed_by?: number | null;
  performed_by_name?: string | null;
  performed_at: string;
}

// =============================================================================
// Query & Mutation Hooks
// =============================================================================

export function useLeaveTypesQuery() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: () => customFetch<LeaveType[]>('/api/v1/leave/settings/types'),
  });
}

export function useCreateLeaveTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LeaveType>) =>
      customFetch<LeaveType>('/api/v1/leave/settings/types', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-types'] });
      qc.invalidateQueries({ queryKey: ['leave-policies'] });
      qc.invalidateQueries({ queryKey: ['leave-change-log'] });
    },
  });
}

export function useUpdateLeaveTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LeaveType> }) =>
      customFetch<LeaveType>(`/api/v1/leave/settings/types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-types'] });
      qc.invalidateQueries({ queryKey: ['leave-policies'] });
      qc.invalidateQueries({ queryKey: ['leave-change-log'] });
    },
  });
}

export function useToggleLeaveTypeStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<LeaveType>(`/api/v1/leave/settings/types/${id}/toggle`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-types'] });
      qc.invalidateQueries({ queryKey: ['leave-change-log'] });
    },
  });
}

export function useDeleteLeaveTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean; message: string }>(`/api/v1/leave/settings/types/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-types'] });
      qc.invalidateQueries({ queryKey: ['leave-change-log'] });
    },
  });
}

export function useLeavePoliciesQuery() {
  return useQuery({
    queryKey: ['leave-policies'],
    queryFn: () => customFetch<LeavePolicy[]>('/api/v1/leave/settings/policies'),
  });
}

export function useCreateLeavePolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      customFetch<LeavePolicy>('/api/v1/leave/settings/policies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-policies'] });
      qc.invalidateQueries({ queryKey: ['leave-change-log'] });
    },
  });
}

export function useUpdateLeavePolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      customFetch<LeavePolicy>(`/api/v1/leave/settings/policies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-policies'] });
      qc.invalidateQueries({ queryKey: ['leave-change-log'] });
    },
  });
}

export function useCopyLeavePolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, new_name }: { id: number; new_name: string }) =>
      customFetch<LeavePolicy>(`/api/v1/leave/settings/policies/${id}/copy`, {
        method: 'POST',
        body: JSON.stringify({ new_name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-policies'] });
      qc.invalidateQueries({ queryKey: ['leave-change-log'] });
    },
  });
}

export function useLeaveGeneralSettingsQuery() {
  return useQuery({
    queryKey: ['leave-general-settings'],
    queryFn: () => customFetch<LeaveGeneralSettings>('/api/v1/leave/settings/general'),
  });
}

export function useUpdateLeaveGeneralSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LeaveGeneralSettings>) =>
      customFetch<LeaveGeneralSettings>('/api/v1/leave/settings/general', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-general-settings'] });
      qc.invalidateQueries({ queryKey: ['leave-change-log'] });
    },
  });
}

export function useLeaveSettingsChangeLogQuery() {
  return useQuery({
    queryKey: ['leave-change-log'],
    queryFn: () => customFetch<LeaveSettingsChangeLog[]>('/api/v1/leave/settings/change-log'),
  });
}

// -----------------------------------------------------------------------------
// Employee Hooks
// -----------------------------------------------------------------------------

export function useMyLeaveQuery(year?: number) {
  return useQuery({
    queryKey: ['my-leave', year],
    queryFn: () => customFetch<MyLeaveOverviewResponse>(`/api/v1/leave/my${year ? `?year=${year}` : ''}`),
  });
}

export function useCalculateLeaveDaysMutation() {
  return useMutation({
    mutationFn: (data: { leave_type_id: number; from_date: string; to_date: string; duration: string }) =>
      customFetch<CalculateLeaveDaysResponse>('/api/v1/leave/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useApplyLeaveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      leave_type_id: number;
      from_date: string;
      to_date: string;
      duration: string;
      reason: string;
      attachment_url?: string;
    }) =>
      customFetch<LeaveRequestItem>('/api/v1/leave/apply', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['admin-leave-requests'] });
    },
  });
}

export function useWithdrawLeaveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) =>
      customFetch<{ success: boolean; message: string }>(`/api/v1/leave/requests/${requestId}/withdraw`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['admin-leave-requests'] });
    },
  });
}

export function useRequestLeaveCancellationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, cancellation_reason }: { requestId: number; cancellation_reason: string }) =>
      customFetch<{ success: boolean; message: string }>(`/api/v1/leave/requests/${requestId}/request-cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellation_reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['admin-leave-requests'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Admin Hooks
// -----------------------------------------------------------------------------

export function useAdminLeaveRequestsQuery(tab: string = 'Pending', search?: string) {
  return useQuery({
    queryKey: ['admin-leave-requests', tab, search],
    queryFn: () => {
      const q = new URLSearchParams();
      if (tab) q.set('tab', tab);
      if (search) q.set('search', search);
      return customFetch<AdminLeaveRequestsResponse>(`/api/v1/leave/requests?${q.toString()}`);
    },
  });
}

export function useLeaveRequestDetailsQuery(id?: number) {
  return useQuery({
    queryKey: ['leave-request-details', id],
    queryFn: () => customFetch<any>(`/api/v1/leave/requests/${id}`),
    enabled: Boolean(id),
  });
}

export function useApproveLeaveRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      customFetch<any>(`/api/v1/leave/requests/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ remarks }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });
}

export function useRejectLeaveRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      customFetch<any>(`/api/v1/leave/requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ remarks }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      qc.invalidateQueries({ queryKey: ['my-leave'] });
    },
  });
}

export function useDecideLeaveCancellationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, agree, remarks }: { id: number; agree: boolean; remarks: string }) =>
      customFetch<any>(`/api/v1/leave/requests/${id}/decide-cancellation`, {
        method: 'POST',
        body: JSON.stringify({ agree, remarks }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });
}

export function useAdminCancelLeaveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      customFetch<any>(`/api/v1/leave/requests/${id}/admin-cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });
}

export function useAddLeaveForEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      customFetch<any>('/api/v1/leave/admin/add-for-employee', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-leave-requests'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
    },
  });
}

export function useAdjustLeaveBalanceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      emp_id: number;
      leave_type_id: number;
      direction: 'CREDIT' | 'DEBIT';
      days: number;
      note: string;
    }) =>
      customFetch<any>('/api/v1/leave/admin/adjust-balance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-ledger'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      qc.invalidateQueries({ queryKey: ['my-leave'] });
    },
  });
}

export function useLeaveLedgerQuery(empId?: number, typeId?: number) {
  return useQuery({
    queryKey: ['leave-ledger', empId, typeId],
    queryFn: () => {
      const q = new URLSearchParams();
      if (empId) q.set('empId', String(empId));
      if (typeId) q.set('typeId', String(typeId));
      return customFetch<LeaveLedgerEntry[]>(`/api/v1/leave/ledger?${q.toString()}`);
    },
  });
}

export function useAllLeaveBalancesQuery(year?: number) {
  return useQuery({
    queryKey: ['all-leave-balances', year],
    queryFn: () => customFetch<any[]>(`/api/v1/leave/balances${year ? `?year=${year}` : ''}`),
  });
}
