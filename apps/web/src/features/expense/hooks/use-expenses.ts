import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { customFetch, getAccessToken } from '@vernoxy-pulse/api-client';

// =============================================================================
// Types (Expense Management BFD 1.0)
// =============================================================================

export type ExpenseType = 'Office Expense' | 'Personal Expense';
export type ClaimStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
/** Labels come from the expense_payment_mode lookup. */
export type PaymentMode = string;

export interface ExpenseMe {
  emp_id: number;
  is_admin: boolean;
  is_accounts: boolean;
  is_approver: boolean;
  approver_department_ids: number[];
  can_use_claims: boolean;
  can_reimburse: boolean;
}

export interface LookupOption {
  code: string;
  label: string;
}

export interface ClaimFlag {
  code: 'ABOVE_LIMIT' | 'POSSIBLE_DUPLICATE' | 'LATE';
  label: string;
  message: string;
  claim_no?: string | null;
  claim_id?: number | null;
}

export interface MyClaimRow {
  claim_id: number;
  claim_no: string | null;
  expense_date: string | null;
  category_id: number | null;
  category_name: string | null;
  expense_type: string | null;
  amount: number | null;
  merchant_name: string | null;
  status: ClaimStatus;
  rejection_reason: string | null;
  decision_remarks: string | null;
  is_above_limit: boolean;
  is_possible_duplicate: boolean;
  is_late: boolean;
  receipts: number;
  can_delete: boolean;
  actions: Array<'EDIT' | 'DELETE' | 'WITHDRAW' | 'COPY' | 'VIEW'>;
}

export interface MyClaimsResponse {
  counters: {
    drafts: number;
    waiting_amount: number;
    waiting_count: number;
    approved_unpaid_amount: number;
    reimbursed_this_year: number;
  };
  has_any_claim: boolean;
  period: { month: string; from: string; to: string };
  total: number;
  page: number;
  page_size: number;
  rows: MyClaimRow[];
}

export interface MyClaimsFilter {
  month?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  category_id?: number;
  expense_type?: string;
  page?: number;
}

export interface FormCategory {
  category_id: number;
  name: string;
  allowed_type: 'OFFICE' | 'PERSONAL' | 'BOTH';
  limit_per_claim: number | null;
  receipt_rule: 'ALWAYS' | 'ABOVE_THRESHOLD';
  receipt_threshold_amount: number;
}

export interface FormOptions {
  employee: { emp_id: number; name: string; emp_code: string; department_name: string | null };
  categories: FormCategory[];
  types: Array<{ code: string; name: string }>;
  claim_window_days: number;
  after_claim_window_action: 'FLAG_AS_LATE' | 'STOP_SUBMISSION';
  today: string;
}

export interface ReceiptItem {
  attachment_id: number;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size_bytes: number;
}

export interface ClaimDetails {
  claim_id: number;
  claim_no: string | null;
  status: ClaimStatus;
  emp_id: number;
  employee: { emp_id: number; name: string; emp_code: string; department_name: string | null };
  expense_date: string | null;
  category_id: number | null;
  category: (FormCategory & { is_active: boolean }) | null;
  expense_type: string | null;
  amount: number | null;
  merchant_name: string | null;
  description: string | null;
  submitted_at: string | null;
  approver_name: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  decision_remarks: string | null;
  rejection_reason: string | null;
  is_self_approved: boolean;
  flags: ClaimFlag[];
  checks: Array<{ ok: boolean; label: string; claim_id?: number | null }>;
  copied_from_claim_id: number | null;
  reimbursement_method: 'DIRECT' | 'PAYROLL' | null;
  payment_mode: string | null;
  payment_reference_no: string | null;
  payment_date: string | null;
  payroll_run_id: number | null;
  bank: { bank_name: string | null; account_number: string | null; ifsc_code: string | null } | null;
  receipts: ReceiptItem[];
  history: Array<{ at: string; event: string; by: string | null; summary: string | null }>;
  permissions: {
    can_edit: boolean;
    can_withdraw: boolean;
    can_copy: boolean;
    can_delete: boolean;
    can_decide: boolean;
    self_approval: boolean;
    can_reopen: boolean;
    can_pay: boolean;
  };
}

export interface SaveClaimPayload {
  expense_date?: string;
  category_id?: number | null;
  expense_type?: string | null;
  amount?: number | null;
  merchant_name?: string | null;
  description?: string | null;
  attachment_ids?: number[];
  submit?: boolean;
  confirm_flags?: boolean;
  copied_from_claim_id?: number;
}

export interface ClaimListRow {
  claim_id: number;
  claim_no: string;
  emp_id: number;
  employee_name: string;
  department_name: string | null;
  expense_date: string;
  category_name: string | null;
  expense_type: string;
  amount: number;
  status: ClaimStatus;
  is_above_limit: boolean;
  is_possible_duplicate: boolean;
  is_late: boolean;
  is_self_approved: boolean;
  submitted_at: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  flags: string[];
}

export interface ClaimsListFilter {
  tab?: string;
  emp_id?: number;
  department_id?: number;
  category_id?: number;
  expense_type?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
}

export interface ClaimsListResponse {
  tab: string;
  tabs: string[];
  viewer: { is_admin: boolean; is_accounts: boolean; is_approver: boolean };
  counters: {
    waiting_count: number;
    waiting_amount: number;
    approved_this_month: number;
    oldest_waiting_days: number;
    approved_unpaid_amount: number;
    approved_unpaid_count: number;
  };
  total: number;
  page: number;
  page_size: number;
  rows: ClaimListRow[];
}

export interface ReimbursementRow {
  claim_id: number;
  claim_no: string;
  emp_id: number;
  employee_name: string;
  department_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  employee_status: string;
  expense_date: string;
  category_name: string | null;
  expense_type: string;
  amount: number;
  status: ClaimStatus;
  decided_at: string | null;
  reimbursement_method: 'DIRECT' | 'PAYROLL' | null;
  payroll_run_id: number | null;
  payroll_month: number | null;
  payroll_year: number | null;
  payroll_status: string | null;
  payment_date: string | null;
  payment_mode: string | null;
  payment_reference_no: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

const qs = (o: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

/** Reads a server error (problem+json) as one sentence. */
export function errorText(err: any, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  return err.detail || err.message || fallback;
}

/** Field errors from the server, keyed by field. */
export function fieldErrors(err: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of err?.errors || []) if (e?.field && e.field !== 'flags' && !out[e.field]) out[e.field] = e.message;
  return out;
}

/** The "Submit anyway?" answer is needed when the server returns FLAGS_CONFIRM. */
export function flagsToConfirm(err: any): ClaimFlag[] | null {
  if (err?.code !== 'FLAGS_CONFIRM') return null;
  return (err.errors || []).filter((e: any) => e.field === 'flags').map((e: any) => ({ code: e.code, label: e.code, message: e.message }));
}

/** Downloads a file from the API with the signed-in token. */
export async function downloadFile(url: string, filename: string) {
  const headers: Record<string, string> = { 'X-Requested-With': 'pulse-web' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, credentials: 'include' });
  if (!res.ok) {
    let msg = 'Download failed.';
    try {
      const j = await res.json();
      msg = j.detail || j.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/** Receipt upload; linked to the claim on Save/Submit. */
export async function uploadReceipt(file: File): Promise<ReceiptItem> {
  const form = new FormData();
  form.append('file', file);
  form.append('entity_type', 'EXPENSE_CLAIM');
  form.append('entity_id', '0');
  const r = await customFetch<any>('/api/v1/attachments/upload', { method: 'POST', body: form });
  return {
    attachment_id: r.attachment_id,
    file_name: r.file_name ?? file.name,
    file_url: r.file_url,
    mime_type: r.mime_type ?? file.type,
    file_size_bytes: Number(r.file_size_bytes ?? file.size),
  };
}

export const receiptUrl = (id: number) => `/api/v1/attachments/${id}/download`;

const BASE = '/api/v1/expense';
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

// =============================================================================
// Queries
// =============================================================================

export function useExpenseMe() {
  return useQuery({ queryKey: ['expenses', 'me'], queryFn: () => customFetch<ExpenseMe>(`${BASE}/me`), staleTime: 60_000 });
}

export function useExpenseLookups() {
  return useQuery({
    queryKey: ['expenses', 'lookups'],
    queryFn: () => customFetch<{ rejection_reasons: LookupOption[]; payment_modes: LookupOption[] }>(`${BASE}/lookups`),
    staleTime: 5 * 60_000,
  });
}

export function useMyClaims(filter: MyClaimsFilter) {
  return useQuery({
    queryKey: ['expenses', 'my', filter],
    queryFn: () => customFetch<MyClaimsResponse>(`${BASE}/claims/my${qs(filter)}`),
    placeholderData: keepPreviousData,
  });
}

export function useFormOptions(enabled = true) {
  return useQuery({ queryKey: ['expenses', 'form-options'], queryFn: () => customFetch<FormOptions>(`${BASE}/claims/form-options`), enabled });
}

export function useClaimDetails(claimId: number | null) {
  return useQuery({
    queryKey: ['expenses', 'claim', claimId],
    queryFn: () => customFetch<ClaimDetails>(`${BASE}/claims/${claimId}`),
    enabled: !!claimId,
  });
}

export function useClaimsList(filter: ClaimsListFilter, enabled = true) {
  return useQuery({
    queryKey: ['expenses', 'list', filter],
    queryFn: () => customFetch<ClaimsListResponse>(`${BASE}/claims${qs(filter)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useReimbursements(status: string, enabled = true) {
  return useQuery({
    queryKey: ['expenses', 'reimbursements', status],
    queryFn: () => customFetch<ReimbursementRow[]>(`${BASE}/reimbursements${qs({ status })}`),
    enabled,
  });
}

export function useDraftPayrollRuns(enabled = true) {
  return useQuery({
    queryKey: ['expenses', 'payroll-runs'],
    queryFn: () => customFetch<Array<{ payroll_run_id: number; payroll_month: number; payroll_year: number }>>(`${BASE}/reimbursements/payroll-runs`),
    enabled,
  });
}

export const exportClaimsList = (filter: ClaimsListFilter, date: string) =>
  downloadFile(`${BASE}/claims/export${qs({ ...filter, page: undefined })}`, `expense-claims-${date}.xlsx`);

export const downloadAllReceipts = (claimId: number, claimNo: string | null) =>
  downloadFile(`${BASE}/claims/${claimId}/receipts.zip`, `${(claimNo || `claim-${claimId}`).replace(/\//g, '-')}-receipts.zip`);

// =============================================================================
// Mutations
// =============================================================================

/** What claim actions return: just enough to show a message; lists refetch. */
export interface ClaimResult {
  claim_id: number;
  claim_no: string | null;
  status: ClaimStatus;
}

function useExpenseMutation<TVars, TOut = ClaimResult>(fn: (v: TVars) => Promise<TOut>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export const useSaveClaim = () =>
  useExpenseMutation(({ id, payload }: { id: number | null; payload: SaveClaimPayload }) =>
    customFetch<ClaimResult>(id ? `${BASE}/claims/${id}` : `${BASE}/claims`, json(id ? 'PUT' : 'POST', payload)),
  );

export const useSubmitClaim = () =>
  useExpenseMutation(({ id, confirm_flags }: { id: number; confirm_flags?: boolean }) =>
    customFetch<ClaimResult>(`${BASE}/claims/${id}/submit`, json('POST', { confirm_flags })),
  );

export const useWithdrawClaim = () =>
  useExpenseMutation(({ id, reason }: { id: number; reason?: string }) =>
    customFetch<ClaimResult>(`${BASE}/claims/${id}/withdraw`, json('POST', { reason: reason || undefined })),
  );

export const useDeleteClaim = () => useExpenseMutation((id: number) => customFetch<{ success: boolean }>(`${BASE}/claims/${id}`, { method: 'DELETE' }));

export const useCopyClaim = () => useExpenseMutation((id: number) => customFetch<ClaimResult>(`${BASE}/claims/${id}/copy`, json('POST', {})));

export const useApproveClaim = () =>
  useExpenseMutation(({ id, remarks, flags_acknowledged }: { id: number; remarks?: string; flags_acknowledged?: boolean }) =>
    customFetch<ClaimResult>(`${BASE}/claims/${id}/approve`, json('POST', { remarks: remarks || undefined, flags_acknowledged })),
  );

export const useRejectClaim = () =>
  useExpenseMutation(({ id, reason_code, remarks }: { id: number; reason_code: string; remarks: string }) =>
    customFetch<ClaimResult>(`${BASE}/claims/${id}/reject`, json('POST', { reason_code, remarks })),
  );

export const useReopenClaim = () =>
  useExpenseMutation(({ id, reason }: { id: number; reason: string }) => customFetch<ClaimResult>(`${BASE}/claims/${id}/reopen`, json('POST', { reason })));

export const useRecordPayment = () =>
  useExpenseMutation((p: { claim_ids: number[]; payment_date: string; payment_mode_code: string; payment_reference_no: string }) =>
    customFetch<{ success: boolean; count: number; total: number }>(`${BASE}/reimbursements/pay`, json('POST', p)),
  );

export const useAddToPayroll = () =>
  useExpenseMutation((p: { claim_ids: number[]; payroll_run_id: number }) =>
    customFetch<{ success: boolean; count: number }>(`${BASE}/reimbursements/payroll`, json('POST', p)),
  );

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


export function exportExpenseReports(filters: ExpenseReportsFilter) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  return downloadFile(`/api/v1/expense/reports/export?${p.toString()}`, `expense-report-${filters.from_date || filters.month || 'period'}.xlsx`);
}
