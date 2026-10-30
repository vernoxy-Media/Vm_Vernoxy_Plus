import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

// =============================================================================
// Interfaces & Types
// =============================================================================

export type ExpenseType = 'Office Expense' | 'Personal Expense';

export type ClaimStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REIMBURSED';

export type RejectionReason =
  | 'Receipt missing or unclear'
  | 'Amount does not match receipt'
  | 'Not a business expense'
  | 'Not allowed under policy'
  | 'Above policy limit'
  | 'Duplicate claim'
  | 'Submitted too late'
  | 'Wrong category or type'
  | 'Other';

export type PaymentMode = 'Bank Transfer' | 'UPI' | 'Cash' | 'Cheque';

export interface ExpenseClaimSummary {
  claim_id: number;
  claim_no: string;
  emp_id: number;
  expense_date: string;
  category_id: number;
  expense_type: ExpenseType;
  amount: number;
  merchant_name?: string | null;
  description: string;
  status: ClaimStatus;
  is_above_limit: boolean;
  is_possible_duplicate: boolean;
  duplicate_reference_claim_id?: number | null;
  is_late: boolean;
  submitted_at?: string | null;
  approver_emp_id?: number | null;
  decided_at?: string | null;
  decided_by?: number | null;
  decision_remarks?: string | null;
  rejection_reason?: string | null;
  flags_acknowledged?: boolean;
  reimbursement_method?: 'DIRECT' | 'PAYROLL' | null;
  reimbursed_at?: string | null;
  reimbursed_by?: number | null;
  payment_mode?: PaymentMode | null;
  payment_reference_no?: string | null;
  payment_date?: string | null;
  payroll_run_id?: number | null;
  copied_from_claim_id?: number | null;
  created_at: string;
  category?: {
    category_id: number;
    name: string;
    code?: string | null;
    allowed_type: string;
    limit_per_claim?: number | null;
  };
  approver?: {
    emp_id: number;
    name: string;
    email: string;
  } | null;
  employee_name?: string;
  department_name?: string | null;
  category_name?: string;
}

export interface ExpenseClaimStats {
  totalClaimed: number;
  pendingApproval: number;
  approvedReady: number;
  reimbursedTotal: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  reimbursedCount: number;
}

export interface MyExpensesResponse {
  stats: ExpenseClaimStats;
  claims: ExpenseClaimSummary[];
}

export interface AttachmentItem {
  attachment_id: number;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  display_order: number;
  created_at: string;
}

export interface ClaimHistoryItem {
  history_id: number;
  claim_id: number;
  event: string;
  performed_by: number;
  performed_by_name: string;
  performed_at: string;
  remarks?: string | null;
  details?: string | null;
}

export interface ExpenseClaimDetails extends ExpenseClaimSummary {
  employee?: {
    emp_id: number;
    name: string;
    email: string;
    dep_id?: number;
    department_name?: string | null;
  };
  decided_by_user?: {
    emp_id: number;
    name: string;
    email: string;
  } | null;
  attachments: AttachmentItem[];
  history: ClaimHistoryItem[];
}

export interface CreateExpenseClaimPayload {
  expense_date: string;
  category_id: number;
  expense_type: ExpenseType;
  amount: number;
  merchant_name?: string;
  description: string;
  submit_immediately?: boolean;
  attachment_ids?: number[];
}

export interface UpdateExpenseClaimPayload {
  expense_date?: string;
  category_id?: number;
  expense_type?: ExpenseType;
  amount?: number;
  merchant_name?: string;
  description?: string;
  attachment_ids?: number[];
}

export interface ReviewClaimPayload {
  action: 'APPROVE' | 'REJECT';
  rejection_reason?: RejectionReason;
  decision_remarks?: string;
  flags_acknowledged?: boolean;
}

export interface ReopenClaimPayload {
  remarks?: string;
  target_status?: 'SUBMITTED' | 'DRAFT';
}

export interface DirectReimbursementPayload {
  payment_mode: PaymentMode;
  payment_reference_no: string;
  payment_date: string;
}

export interface PayrollReimbursementPayload {
  payroll_run_id?: number;
}

// =============================================================================
// React Query Hooks
// =============================================================================

export function useMyExpenses(status?: string) {
  return useQuery({
    queryKey: ['expenses', 'my', status || 'ALL'],
    queryFn: () => {
      const url =
        status && status !== 'ALL'
          ? `/api/v1/expense/claims/my?status=${encodeURIComponent(status)}`
          : '/api/v1/expense/claims/my';
      return customFetch<MyExpensesResponse>(url);
    },
  });
}

export function useExpenseClaimDetails(claimId: number | null) {
  return useQuery({
    queryKey: ['expenses', 'claim', claimId],
    queryFn: () => customFetch<ExpenseClaimDetails>(`/api/v1/expense/claims/${claimId}`),
    enabled: Boolean(claimId && claimId > 0),
  });
}

export function useCreateExpenseClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExpenseClaimPayload) =>
      customFetch<ExpenseClaimSummary>('/api/v1/expense/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateExpenseClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateExpenseClaimPayload }) =>
      customFetch<ExpenseClaimSummary>(`/api/v1/expense/claims/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'claim', vars.id] });
    },
  });
}

export function useSubmitDraftClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<ExpenseClaimSummary>(`/api/v1/expense/claims/${id}/submit`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'claim', id] });
    },
  });
}

export function useWithdrawClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<ExpenseClaimSummary>(`/api/v1/expense/claims/${id}/withdraw`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'claim', id] });
    },
  });
}

export function useDeleteDraftClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/expense/claims/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useCopyToDraftClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<ExpenseClaimSummary>(`/api/v1/expense/claims/${id}/copy-to-draft`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

// -----------------------------------------------------------------------------
// Approvals Queue Hooks
// -----------------------------------------------------------------------------

export function useApprovalsQueue() {
  return useQuery({
    queryKey: ['expenses', 'approvals-queue'],
    queryFn: () => customFetch<ExpenseClaimSummary[]>('/api/v1/expense/approvals/queue'),
  });
}

export function useReviewClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReviewClaimPayload }) =>
      customFetch<ExpenseClaimSummary>(`/api/v1/expense/approvals/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'claim', vars.id] });
    },
  });
}

// -----------------------------------------------------------------------------
// Admin Reopen Hook
// -----------------------------------------------------------------------------

export function useReopenClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReopenClaimPayload }) =>
      customFetch<ExpenseClaimSummary>(`/api/v1/expense/claims/${id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'claim', vars.id] });
    },
  });
}

// -----------------------------------------------------------------------------
// Reimbursement Queue Hooks
// -----------------------------------------------------------------------------

export function useReimbursementQueue(status?: string) {
  return useQuery({
    queryKey: ['expenses', 'reimbursements-queue', status || 'APPROVED'],
    queryFn: () => {
      const url = status
        ? `/api/v1/expense/reimbursements/queue?status=${encodeURIComponent(status)}`
        : '/api/v1/expense/reimbursements/queue';
      return customFetch<ExpenseClaimSummary[]>(url);
    },
  });
}

export function useProcessDirectReimbursement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DirectReimbursementPayload }) =>
      customFetch<ExpenseClaimSummary>(`/api/v1/expense/reimbursements/${id}/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'claim', vars.id] });
    },
  });
}

export function useAddToPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: PayrollReimbursementPayload }) =>
      customFetch<ExpenseClaimSummary>(`/api/v1/expense/reimbursements/${id}/add-to-payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'claim', vars.id] });
    },
  });
}

export function useRemoveFromPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<ExpenseClaimSummary>(`/api/v1/expense/reimbursements/${id}/remove-from-payroll`, {
        method: 'POST',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'claim', id] });
    },
  });
}

// =============================================================================
// Expense Reports (Section 11)
// =============================================================================

export interface ExpenseReportsFilter {
  report_type?: 'monthly' | 'date_range' | 'employee' | 'category' | 'approvals' | 'rejected' | 'reimbursement';
  month?: string;
  from_date?: string;
  to_date?: string;
  date_basis?: 'EXPENSE_DATE' | 'APPROVAL_DATE' | 'REIMBURSEMENT_DATE';
  department_id?: number;
  emp_id?: number;
  category_id?: number;
  expense_type?: string;
  status?: string;
  group_by?: 'category' | 'department' | 'employee';
}

export interface ExpenseReportTrendItem {
  month: string;
  label: string;
  total_amount: number;
  claim_count: number;
  office_amount: number;
  personal_amount: number;
  is_selected: boolean;
}

export interface ExpenseReportBreakdownItem {
  id: number | null;
  name: string;
  claims_count: number;
  office_amount: number;
  personal_amount: number;
  total_amount: number;
  share_percentage: number;
}

export interface ExpenseApproverPerformanceItem {
  approver_id: number;
  approver_name: string;
  claims_decided: number;
  claims_approved: number;
  claims_rejected: number;
  avg_days_to_decide: number;
  waiting_now: number;
  oldest_waiting_days: number;
}

export interface ExpenseReportClaimItem {
  claim_id: number;
  claim_no: string;
  emp_id: number;
  employee_name: string;
  department_id: number | null;
  department_name: string;
  expense_date: string;
  category_id: number;
  category_name: string;
  category_limit: number | null;
  expense_type: string;
  amount: number;
  merchant_name: string | null;
  description: string;
  status: ClaimStatus;
  is_above_limit: boolean;
  is_possible_duplicate: boolean;
  is_late: boolean;
  is_self_approved: boolean;
  submitted_at: string | null;
  approver_id: number | null;
  approver_name: string;
  decided_at: string | null;
  rejection_reason: string | null;
  decision_remarks: string | null;
  reimbursement_method: 'DIRECT' | 'PAYROLL' | null;
  payment_mode: PaymentMode | null;
  payment_reference_no: string | null;
  payment_date: string | null;
}

export interface ExpenseReportsResponse {
  period: {
    month: string;
    from_date: string;
    to_date: string;
    date_basis: string;
  };
  totals: {
    total_amount: number;
    total_claims: number;
    office_amount: number;
    office_count: number;
    personal_amount: number;
    personal_count: number;
    rejected_amount: number;
    rejected_count: number;
  };
  trend: ExpenseReportTrendItem[];
  breakdown: ExpenseReportBreakdownItem[];
  approvals_summary: ExpenseApproverPerformanceItem[];
  claims: ExpenseReportClaimItem[];
}

export function useExpenseReports(filters: ExpenseReportsFilter = {}) {
  return useQuery({
    queryKey: ['expenses', 'reports', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.report_type) params.append('report_type', filters.report_type);
      if (filters.month) params.append('month', filters.month);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      if (filters.date_basis) params.append('date_basis', filters.date_basis);
      if (filters.department_id) params.append('department_id', String(filters.department_id));
      if (filters.emp_id) params.append('emp_id', String(filters.emp_id));
      if (filters.category_id) params.append('category_id', String(filters.category_id));
      if (filters.expense_type) params.append('expense_type', filters.expense_type);
      if (filters.status) params.append('status', filters.status);
      if (filters.group_by) params.append('group_by', filters.group_by);

      const qs = params.toString();
      const url = qs ? `/api/v1/expense/reports?${qs}` : '/api/v1/expense/reports';
      return customFetch<ExpenseReportsResponse>(url);
    },
  });
}

