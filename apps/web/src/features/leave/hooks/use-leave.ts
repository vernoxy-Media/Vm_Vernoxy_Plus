import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

// =============================================================================
// Types
// =============================================================================

export type LeaveDuration = 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';
export type LeaveStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'CANCELLATION_REQUESTED'
  | 'CANCELLED';

export interface LookupOption {
  value: string;
  label: string;
  code: string;
}

export type LeaveLookups = Record<
  | 'leave_calendar_color'
  | 'leave_applies_to'
  | 'leave_credit_frequency'
  | 'leave_duration'
  | 'leave_request_status'
  | 'leave_year_start'
  | 'leave_year_end_processing'
  | 'leave_adjust_direction',
  LookupOption[]
>;

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
  is_used?: boolean;
  policies_count?: number;
  created_at?: string;
  updated_at?: string | null;
}

export interface LeavePolicyRule {
  rule_id?: number;
  policy_id?: number;
  leave_type_id: number;
  leave_type_name?: string;
  leave_type_code?: string;
  leave_type_status?: string;
  is_paid?: boolean;
  balance_tracked?: boolean;
  calendar_color?: string;
  days_per_year: number | null;
  credit_frequency: 'YEARLY' | 'MONTHLY' | 'FROM_APPROVED_OT';
  carry_forward_days: number;
  max_at_once: number | null;
  min_notice_days: number;
  backdated_days: number;
  attachment_after_days: number | null;
  allowed_during_probation: boolean;
  comp_off_expiry_days: number;
}

export interface LeavePolicy {
  policy_id: number;
  name: string;
  pro_rata: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  employees_count: number;
  leave_year_start?: string;
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
  leave_year_locked?: boolean;
}

export interface LeaveChangeLogItem {
  log_id: number;
  entity_type: string;
  entity_id: number;
  entity_name?: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string | null;
  changed_at: string;
}

export interface BalanceCard {
  leave_type_id: number;
  leave_type_name: string;
  leave_type_code: string;
  is_paid: boolean;
  balance_tracked: boolean;
  calendar_color: string;
  opening_balance?: number;
  credited: number | null;
  carried_forward?: number;
  adjusted?: number;
  lapsed?: number;
  taken: number;
  approved_ahead: number;
  pending: number;
  available: number | null;
  is_comp_off?: boolean;
  nearest_expiry: string | null;
}

export interface ApplyType {
  leave_type_id: number;
  name: string;
  code: string;
  is_paid: boolean;
  balance_tracked: boolean;
  half_day_allowed: boolean;
  description?: string | null;
  calendar_color: string;
  available: number | null;
  pending: number;
  max_at_once: number | null;
  min_notice_days: number;
  backdated_days: number;
  attachment_after_days: number | null;
}

export interface LeaveRequestItem {
  request_id: number;
  request_no: string;
  emp_id: number;
  emp_code?: string;
  employee_name?: string;
  department_name?: string | null;
  leave_type_id: number;
  leave_type_name: string;
  leave_type_code?: string;
  calendar_color?: string;
  is_paid: boolean;
  duration: LeaveDuration;
  from_date: string;
  to_date: string;
  leave_days: number;
  reason?: string;
  attachment_url?: string | null;
  is_short_notice: boolean;
  is_self_approved?: boolean;
  added_by_admin?: boolean;
  status: LeaveStatus;
  status_label: string;
  applied_at: string;
  decided_at?: string | null;
  decided_by_name?: string | null;
  decision_remarks?: string | null;
  cancellation_reason?: string | null;
  cancellation_remarks?: string | null;
  balance_after?: number | null;
  current_available?: number | null;
  can_withdraw: boolean;
  can_request_cancellation: boolean;
}

export interface MyLeaveData {
  employee: {
    emp_id: number;
    name: string;
    emp_code: string;
    department_name: string | null;
    status: string;
    joining_date: string;
    probation_end_date: string | null;
    reporting_manager_name: string | null;
  };
  has_policy: boolean;
  can_apply: boolean;
  policy_name: string | null;
  current_year: number;
  leave_year: number;
  leave_year_label: string;
  leave_year_range: { start: string; end: string };
  year_options: Array<{ value: number; label: string }>;
  balances: BalanceCard[];
  apply_types: ApplyType[];
  requests: LeaveRequestItem[];
}

export interface Issue {
  field: string;
  code: string;
  message: string;
}

export interface LeavePreview {
  leave_days: number;
  days: Array<{ date: string; day_type: string; day_count: number; part: string; note: string }>;
  counted_dates: string[];
  excluded_notes: string[];
  balance_tracked: boolean;
  available: number | null;
  pending: number;
  balance_after: number | null;
  attachment_required: boolean;
  attachment_after_days: number | null;
  is_short_notice: boolean;
  errors: Issue[];
  warnings: Issue[];
}

export interface LeaveDetails {
  request: LeaveRequestItem & {
    days: Array<{ date: string; part: string; fraction: number }>;
    excluded_notes: string[];
    reporting_manager_name?: string | null;
    applied_by_name?: string | null;
    cancellation_decided_by_name?: string | null;
  };
  balance: {
    credited: number;
    taken: number;
    this_request: number;
    available: number;
    balance_after_approval: number;
    other_pending: number;
  } | null;
  checks: Array<{ ok: boolean; label: string; info?: boolean }>;
  history: Array<{
    history_id: number;
    event: string;
    summary: string;
    details: any;
    performed_at: string;
    performed_by_name: string;
  }>;
  actions: {
    can_approve: boolean;
    can_reject: boolean;
    can_agree_cancel: boolean;
    can_keep_leave: boolean;
    can_cancel_leave: boolean;
    can_withdraw: boolean;
    can_request_cancellation: boolean;
    own_leave_note: string | null;
  };
  viewer_role: 'ADMIN' | 'EMPLOYEE' | 'REPORTING_MANAGER';
}

export interface LeaveRequestsList {
  counters: {
    pending_count: number;
    cancellation_requests_count: number;
    on_leave_today_count: number;
    approved_this_month_count: number;
  } | null;
  total: number;
  page: number;
  page_size: number;
  requests: LeaveRequestItem[];
  team_size?: number;
}

export interface LeaveRequestsFilters {
  tab?: string;
  search?: string;
  leave_type_id?: number;
  department_id?: number;
  employee_id?: number;
  from_date?: string;
  to_date?: string;
  counter?: string;
  page?: number;
  page_size?: number;
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
  request_no?: string | null;
  performed_by_name: string;
  performed_at: string;
  leave_year?: number;
  expiry_date?: string | null;
}

export interface BalancesScreenData {
  leave_year: number;
  leave_year_label: string;
  types: Array<{ leave_type_id: number; name: string; code: string; balance_tracked: boolean }>;
  employees: Array<{
    emp_id: number;
    emp_code: string;
    employee_name: string;
    department_name: string | null;
    policy_name: string | null;
    balances: Array<{
      leave_type_id: number;
      name: string;
      code: string;
      balance_tracked: boolean;
      opening_balance: number;
      credited: number;
      taken: number;
      booked: number;
      lapsed: number;
      available: number | null;
    }>;
  }>;
}

export interface LeaveCalendarItem {
  request_id: number;
  request_no: string;
  emp_id: number;
  employee_name: string;
  department_name?: string;
  dep_id?: number;
  leave_type_id: number;
  leave_type_name: string;
  leave_type_code?: string;
  calendar_color: string;
  is_paid: boolean;
  duration: string;
  from_date: string;
  to_date: string;
  leave_days: number;
  dates?: string[];
}

export interface ReportTable {
  title: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, any>>;
}

export interface LeaveReportsFilters {
  report_type: string;
  month?: string;
  from_date?: string;
  to_date?: string;
  on_date?: string;
  leave_type_id?: number;
  paid_unpaid?: string;
  department_id?: number;
  employee_id?: number;
  status?: string;
  group_by?: string;
}

export interface LeaveReportData {
  report_type: string;
  period_label: string;
  totals?: { taken?: number; paid?: number; unpaid?: number; pending_requests?: number };
  trend?: Array<{ month: string; label: string; paid: number; unpaid: number }>;
  group_by?: string;
  breakdown?: Array<{ key: string; label: string; is_paid?: boolean; days: number; employees: number; average_days: number }>;
  days?: Array<{ date: string; emp_id: number; employee_name: string; department_name: string; leave_type_name: string; leave_type_code: string; part: string }>;
  table: ReportTable;
}

export interface LeaveDashboardData {
  employee: {
    has_policy: boolean;
    can_apply: boolean;
    balances: BalanceCard[];
    next_leave: { request_id: number; request_no: string; from_date: string; to_date: string; duration: string; leave_days: number; leave_type_name: string } | null;
  };
  admin?: {
    pending_count: number;
    cancellation_requests_count: number;
    on_leave_today: Array<{ emp_id: number; employee_name: string; department_name: string; leave_type_name: string; part: string; to_date: string }>;
  };
  manager?: {
    team_size: number;
    today: Array<{ emp_id: number; employee_name: string; leave_type_name: string; part: string; first_day: string; last_day: string }>;
    this_week: Array<{ emp_id: number; employee_name: string; leave_type_name: string; part: string; first_day: string; last_day: string }>;
  };
}

export interface EmployeeLeaveSummary {
  emp_id: number;
  employee: {
    emp_id: number;
    name: string;
    emp_code: string;
    department_name: string | null;
    status: string;
    joining_date: string;
    probation_end_date: string | null;
  };
  apply_types: ApplyType[];
  policy_id: number | null;
  policy_name: string | null;
  leave_year: number;
  leave_year_label: string;
  balances: BalanceCard[];
}

const qs = (params: Record<string, any>) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'ALL') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

// =============================================================================
// Invalidation helper
// =============================================================================

function useInvalidateLeave() {
  const qc = useQueryClient();
  return () => {
    for (const key of [
      'my-leave',
      'admin-leave-requests',
      'team-leave-requests',
      'leave-request-details',
      'leave-ledger',
      'leave-balances',
      'leave-dashboard',
      'leave-calendar',
      'leave-reports',
      'employee-leave-summary',
      'attendance',
    ]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

function useInvalidateSettings() {
  const qc = useQueryClient();
  return () => {
    for (const key of ['leave-types', 'leave-policies', 'leave-general-settings', 'leave-change-log', 'my-leave']) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

// =============================================================================
// Lookups & Settings
// =============================================================================

export function useLeaveLookupsQuery() {
  return useQuery({
    queryKey: ['leave-lookups'],
    queryFn: () => customFetch<LeaveLookups>('/api/v1/leave/settings/lookups'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeaveTypesQuery() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: () => customFetch<LeaveType[]>('/api/v1/leave/settings/types'),
  });
}

export function useCreateLeaveTypeMutation() {
  const inv = useInvalidateSettings();
  return useMutation({
    mutationFn: (data: Partial<LeaveType>) =>
      customFetch<LeaveType>('/api/v1/leave/settings/types', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: inv,
  });
}

export function useUpdateLeaveTypeMutation() {
  const inv = useInvalidateSettings();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LeaveType> }) =>
      customFetch<LeaveType>(`/api/v1/leave/settings/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: inv,
  });
}

export function useToggleLeaveTypeStatusMutation() {
  const inv = useInvalidateSettings();
  return useMutation({
    mutationFn: (id: number) => customFetch<LeaveType>(`/api/v1/leave/settings/types/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: inv,
  });
}

export function useDeleteLeaveTypeMutation() {
  const inv = useInvalidateSettings();
  return useMutation({
    mutationFn: (id: number) => customFetch<any>(`/api/v1/leave/settings/types/${id}`, { method: 'DELETE' }),
    onSuccess: inv,
  });
}

export function useLeavePoliciesQuery() {
  return useQuery({
    queryKey: ['leave-policies'],
    queryFn: () => customFetch<LeavePolicy[]>('/api/v1/leave/settings/policies'),
  });
}

export function useCreateLeavePolicyMutation() {
  const inv = useInvalidateSettings();
  return useMutation({
    mutationFn: (data: any) =>
      customFetch<LeavePolicy>('/api/v1/leave/settings/policies', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: inv,
  });
}

export function useUpdateLeavePolicyMutation() {
  const inv = useInvalidateSettings();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      customFetch<LeavePolicy>(`/api/v1/leave/settings/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: inv,
  });
}

export function useCopyLeavePolicyMutation() {
  const inv = useInvalidateSettings();
  return useMutation({
    mutationFn: ({ id, new_name }: { id: number; new_name: string }) =>
      customFetch<LeavePolicy>(`/api/v1/leave/settings/policies/${id}/copy`, {
        method: 'POST',
        body: JSON.stringify({ new_name }),
      }),
    onSuccess: inv,
  });
}

export function useLeaveGeneralSettingsQuery() {
  return useQuery({
    queryKey: ['leave-general-settings'],
    queryFn: () => customFetch<LeaveGeneralSettings>('/api/v1/leave/settings/general'),
  });
}

export function useUpdateLeaveGeneralSettingsMutation() {
  const inv = useInvalidateSettings();
  return useMutation({
    mutationFn: (data: Partial<LeaveGeneralSettings>) =>
      customFetch<LeaveGeneralSettings>('/api/v1/leave/settings/general', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: inv,
  });
}

export function useLeaveSettingsChangeLogQuery(enabled = true) {
  return useQuery({
    queryKey: ['leave-change-log'],
    queryFn: () => customFetch<LeaveChangeLogItem[]>('/api/v1/leave/settings/change-log'),
    enabled,
  });
}

// =============================================================================
// My Leave & apply
// =============================================================================

export function useMyLeaveQuery(year?: number) {
  return useQuery({
    queryKey: ['my-leave', year],
    queryFn: () => customFetch<MyLeaveData>(`/api/v1/leave/my${year ? `?year=${year}` : ''}`),
  });
}

export function useLeavePreviewMutation() {
  return useMutation({
    mutationFn: (data: {
      leave_type_id: number;
      from_date: string;
      to_date: string;
      duration: LeaveDuration;
      emp_id?: number;
    }) => customFetch<LeavePreview>('/api/v1/leave/calculate', { method: 'POST', body: JSON.stringify(data) }),
  });
}

export interface ApplyPayload {
  leave_type_id: number;
  from_date: string;
  to_date: string;
  duration: LeaveDuration;
  reason: string;
  attachment_url?: string;
  attachment_name?: string;
}

export function useApplyLeaveMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: (data: ApplyPayload) =>
      customFetch<LeaveRequestItem>('/api/v1/leave/apply', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: inv,
  });
}

export function useAddLeaveForEmployeeMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: (data: ApplyPayload & { emp_id: number; remarks?: string }) =>
      customFetch<LeaveRequestItem>('/api/v1/leave/admin/add-for-employee', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: inv,
  });
}

export function useWithdrawLeaveMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      customFetch<any>(`/api/v1/leave/requests/${id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    onSuccess: inv,
  });
}

export function useRequestLeaveCancellationMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: ({ id, cancellation_reason }: { id: number; cancellation_reason: string }) =>
      customFetch<any>(`/api/v1/leave/requests/${id}/request-cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellation_reason }),
      }),
    onSuccess: inv,
  });
}

// =============================================================================
// Requests (Admin / Team) and decisions
// =============================================================================

export function useAdminLeaveRequestsQuery(filters: LeaveRequestsFilters, enabled = true) {
  return useQuery({
    queryKey: ['admin-leave-requests', filters],
    queryFn: () => customFetch<LeaveRequestsList>(`/api/v1/leave/requests${qs(filters)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTeamLeaveRequestsQuery(filters: LeaveRequestsFilters, enabled = true) {
  return useQuery({
    queryKey: ['team-leave-requests', filters],
    queryFn: () => customFetch<LeaveRequestsList>(`/api/v1/leave/team/requests${qs(filters)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useLeaveRequestDetailsQuery(id?: number | null) {
  return useQuery({
    queryKey: ['leave-request-details', id],
    queryFn: () => customFetch<LeaveDetails>(`/api/v1/leave/requests/${id}`),
    enabled: Boolean(id),
  });
}

export function useApproveLeaveRequestMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      customFetch<LeaveDetails>(`/api/v1/leave/requests/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(remarks ? { remarks } : {}),
      }),
    onSuccess: inv,
  });
}

export function useRejectLeaveRequestMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      customFetch<LeaveDetails>(`/api/v1/leave/requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ remarks }) }),
    onSuccess: inv,
  });
}

export function useDecideLeaveCancellationMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: ({ id, agree, remarks }: { id: number; agree: boolean; remarks?: string }) =>
      customFetch<LeaveDetails>(`/api/v1/leave/requests/${id}/decide-cancellation`, {
        method: 'POST',
        body: JSON.stringify({ agree, ...(remarks ? { remarks } : {}) }),
      }),
    onSuccess: inv,
  });
}

export function useAdminCancelLeaveMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      customFetch<LeaveDetails>(`/api/v1/leave/requests/${id}/admin-cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: inv,
  });
}

// =============================================================================
// Ledger, balances, adjustments
// =============================================================================

export function useLeaveLedgerQuery(params: { empId?: number; typeId?: number; year?: number }, enabled = true) {
  return useQuery({
    queryKey: ['leave-ledger', params],
    queryFn: () => customFetch<LeaveLedgerEntry[]>(`/api/v1/leave/ledger${qs(params)}`),
    enabled,
  });
}

export function useAllLeaveBalancesQuery(params: { year?: number; search?: string; department_id?: number } = {}, enabled = true) {
  return useQuery({
    queryKey: ['leave-balances', params],
    queryFn: () => customFetch<BalancesScreenData>(`/api/v1/leave/balances${qs(params)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useEmployeeLeaveSummaryQuery(empId?: number) {
  return useQuery({
    queryKey: ['employee-leave-summary', empId],
    queryFn: () => customFetch<EmployeeLeaveSummary>(`/api/v1/leave/employees/${empId}/summary`),
    enabled: Boolean(empId),
  });
}

export function useAdjustLeaveBalanceMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: (data: { emp_id: number; leave_type_id: number; direction: 'CREDIT' | 'DEBIT'; days: number; note: string }) =>
      customFetch<any>('/api/v1/leave/admin/adjust-balance', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: inv,
  });
}

export function useBulkAdjustLeaveBalanceMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: (data: { emp_ids: number[]; leave_type_id: number; days: number; note: string }) =>
      customFetch<{ credited: number; skipped: Array<{ emp_id: number; reason: string }> }>(
        '/api/v1/leave/admin/bulk-adjust-balance',
        { method: 'POST', body: JSON.stringify(data) },
      ),
    onSuccess: inv,
  });
}

export function useSetOpeningBalanceMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: (data: { emp_id: number; leave_type_id: number; opening_balance: number; note: string }) =>
      customFetch<any>('/api/v1/leave/admin/opening-balance', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: inv,
  });
}

export function useAssignEmployeePolicyMutation() {
  const inv = useInvalidateLeave();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empId, policyId }: { empId: number; policyId: number }) =>
      customFetch<any>(`/api/v1/leave/admin/employee-policy/${empId}`, {
        method: 'PUT',
        body: JSON.stringify({ policy_id: policyId }),
      }),
    onSuccess: (_d, v) => {
      inv();
      qc.invalidateQueries({ queryKey: ['employee', v.empId] });
      qc.invalidateQueries({ queryKey: ['leave-policies'] });
    },
  });
}

export function useRunYearEndMutation() {
  const inv = useInvalidateLeave();
  return useMutation({
    mutationFn: (leave_year: number) =>
      customFetch<any>('/api/v1/leave/admin/year-end', { method: 'POST', body: JSON.stringify({ leave_year }) }),
    onSuccess: inv,
  });
}

// =============================================================================
// Calendar, reports, dashboard
// =============================================================================

export function useLeaveCalendarQuery(month?: string, departmentId?: number) {
  return useQuery({
    queryKey: ['leave-calendar', month, departmentId],
    queryFn: () =>
      customFetch<LeaveCalendarItem[]>(`/api/v1/leave/calendar${qs({ month, department_id: departmentId })}`),
  });
}

export function useLeaveReportsQuery(filters: LeaveReportsFilters) {
  return useQuery({
    queryKey: ['leave-reports', filters],
    queryFn: () => customFetch<LeaveReportData>(`/api/v1/leave/reports${qs(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export function useLeaveDashboardQuery() {
  return useQuery({
    queryKey: ['leave-dashboard'],
    queryFn: () => customFetch<LeaveDashboardData>('/api/v1/leave/dashboard'),
  });
}

export function leaveExportUrl(path: string, params: Record<string, any>) {
  return `/api/v1/leave/${path}${qs(params)}`;
}
