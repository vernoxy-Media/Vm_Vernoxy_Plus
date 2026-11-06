import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch, getAccessToken } from '@vernoxy-pulse/api-client';

// =============================================================================
// Types (Salary & Payroll BFD 1.0)
// =============================================================================

export type RunStatus = 'NOT_STARTED' | 'DRAFT' | 'LOCKED' | 'PAID';
export type PaidAs = 'FULL' | 'HALF' | 'UNPAID' | 'NOT_APPLICABLE';

export interface PayrollMe {
  emp_id: number;
  is_admin: boolean;
  is_accounts: boolean;
  can_use_payroll: boolean;
  can_approve_ot: boolean;
  can_edit_settings: boolean;
  can_unlock: boolean;
}

export interface PayrollMonthItem {
  payroll_run_id: number | null;
  payroll_year: number;
  payroll_month: number;
  month_name: string;
  date_range: string;
  status: RunStatus;
  total_employees: number;
  gross_earnings: number;
  employee_pf_total: number;
  employer_pf_total: number;
  total_salary: number;
  attendance_locked: boolean;
  attendance_locked_at: string | null;
  released_slips_count: number;
}

export interface PayrollRunsResponse {
  year: number;
  years: number[];
  summary: { current_run_month: string | null; current_run_status: RunStatus; total_employees: number; total_salary: number; warnings_count: number };
  total: number;
  page: number;
  page_size: number;
  runs: PayrollMonthItem[];
}

export interface Issue {
  level: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
}

export interface PayrollEmployeeItem {
  payroll_employee_id: number;
  emp_id: number;
  employee_code: string;
  employee_name: string;
  department_names: string | null;
  role_name: string | null;
  shift_name: string | null;
  monthly_salary: number;
  daily_rate: number;
  pf_applicable: boolean;
  uan: string | null;
  payment_mode: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH';
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  total_working_days: number;
  present_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  absent_days: number;
  missing_punch_days: number;
  not_employed_days: number;
  full_days: number;
  half_days: number;
  paid_days: number;
  lop_days: number;
  basic_salary: number;
  ot_hours: number;
  ot_rate: number;
  ot_amount: number;
  pf_wage: number;
  employee_pf: number;
  employer_pf: number;
  total_additions: number;
  total_deductions: number;
  adj_net: number;
  gross_earnings: number;
  total_salary: number;
  flag: 'NONE' | 'ERROR' | 'WARNING' | 'JOINED_IN_MONTH' | 'LEFT_IN_MONTH' | 'ADJUSTED';
  validation_message: string | null;
  issues: Issue[];
  is_paid: boolean;
  paid_on: string | null;
  payment_reference: string | null;
  adjustment_count: number;
}

export interface PayrollOtItem {
  payroll_ot_entry_id: number;
  emp_id: number;
  employee_code: string;
  employee_name: string;
  attendance_date: string;
  day_type: string;
  worked_hours: number;
  proposed_hours: number;
  approved_hours: number;
  ot_rate: number | null;
  ot_amount: number | null;
  ot_paid_as: 'SALARY' | 'COMP_OFF';
  status: 'PENDING' | 'APPROVED' | 'REDUCED' | 'REJECTED';
  comment: string | null;
  approver_name: string | null;
  approver?: string;
  can_decide?: boolean;
}

export interface PayrollAdjustmentItem {
  payroll_adjustment_id: number;
  type: 'DAY_ADJUSTMENT' | 'ADDITION' | 'DEDUCTION';
  amount: number;
  effect: number;
  related_date: string | null;
  old_paid_as: PaidAs | null;
  new_paid_as: PaidAs | null;
  reason: string;
  note: string | null;
  reference_number: string | null;
  attachment_url: string | null;
  is_active: boolean;
  removed_reason: string | null;
  removed_at: string | null;
  created_at: string;
  emp_id: number;
  employee_name: string;
  employee_code: string;
  category_label: string | null;
  created_by_name: string | null;
}

export interface LockCheck {
  key: string;
  ok: boolean;
  label: string;
}

export interface PayrollRunInfo {
  payroll_run_id: number;
  payroll_year: number;
  payroll_month: number;
  month_label: string;
  status: Exclude<RunStatus, 'NOT_STARTED'>;
  calculated_at: string | null;
  calculated_by_name: string | null;
  locked_at: string | null;
  locked_by_name: string | null;
  unlock_reason: string | null;
  payment_date: string | null;
  attendance_locked: boolean;
  attendance_locked_at: string | null;
  data_changed: boolean;
  total_employees: number;
  gross_earnings: number;
  employee_pf_total: number;
  employer_pf_total: number;
  total_salary: number;
  paid_count: number;
  full_day_hours: number | string;
}

export interface CheckItem {
  emp_id: number | null;
  employee_code: string;
  employee_name: string;
  code: string;
  message: string;
}

export interface PayrollRegisterResponse {
  run: PayrollRunInfo;
  employees: PayrollEmployeeItem[];
  departments: string[];
  ot_entries: PayrollOtItem[];
  adjustments: PayrollAdjustmentItem[];
  checks: { errors: CheckItem[]; warnings: CheckItem[]; lock_checks: LockCheck[]; can_lock: boolean };
}

export interface PayrollDayItem {
  payroll_employee_day_id: number;
  attendance_date: string;
  attendance_code: string;
  day_type: 'WORKING_DAY' | 'WEEKLY_OFF' | 'HOLIDAY' | 'NOT_EMPLOYED';
  is_working_day: boolean;
  holiday_name: string | null;
  paid_as: PaidAs;
  original_paid_as: PaidAs | null;
  daily_rate: number;
  calculated_amount: number;
  is_adjusted: boolean;
}

export interface EmployeeSalarySheetResponse {
  run: PayrollRunInfo;
  employee: PayrollEmployeeItem & { ot_eligible: boolean; ot_label: string | null };
  previous_emp_id: number | null;
  next_emp_id: number | null;
  full_day_hours: number;
  days: PayrollDayItem[];
  adjustments: PayrollAdjustmentItem[];
  ot_entries: PayrollOtItem[];
  history: Array<{ history_id: number; action: string; reason: string | null; performed_at: string; performed_by_name: string | null; run_level: boolean }>;
}

export interface AdjustmentCategory {
  category_id: number;
  kind: 'ADDITION' | 'DEDUCTION';
  code: string;
  label: string;
  is_active: boolean;
  in_use: boolean;
}

export interface PayrollSettings {
  settings_id: number;
  default_employee_pf_pct: number;
  default_employer_pf_pct: number;
  apply_pf_wage_limit: boolean;
  pf_wage_limit: number;
  missing_punch_default: 'UNPAID' | 'FULL';
  ot_rounding: 'NONE' | 'FIFTEEN' | 'THIRTY';
  total_salary_rounding: 'NEAREST_RUPEE' | 'NONE';
  pay_day: number;
  accounts_emp_ids: number[];
  accounts_users: Array<{ emp_id: number; name: string }>;
  company_name: string | null;
  company_address: string | null;
  adjustment_categories: AdjustmentCategory[];
  paid_leave_types: Array<{ name: string; is_paid: boolean }>;
  full_day_hours: number;
  payroll_month: string;
}

export interface Eligibility {
  year: number;
  month: number;
  month_label: string;
  period: { start: string; end: string };
  run_exists: boolean;
  attendance_locked: boolean;
  attendance_message: string;
  total_employees_included: number;
  breakdown: {
    active_all_month: number;
    joined: Array<{ emp_id: number; emp_code: string; name: string; date: string }>;
    left: Array<{ emp_id: number; emp_code: string; name: string; date: string }>;
    onboarding: number;
  };
  employees: Array<{ emp_id: number; emp_code: string; name: string; status: string; department: string | null }>;
  checks: Array<{ level: 'OK' | 'WARNING' | 'ERROR'; ok: boolean; label: string }>;
  available_months: Array<{ year: number; month: number; label: string; run_status: string | null }>;
}

export interface SalarySlip {
  payroll_slip_id?: number;
  slip_number: string;
  status: 'GENERATED' | 'RELEASED' | 'REPLACED' | 'PREVIEW';
  content_html: string;
  released_at?: string | null;
  released_to_email?: string | null;
  preview?: boolean;
}

export interface MySlipItem {
  payroll_slip_id: number;
  slip_number: string;
  status: 'RELEASED' | 'REPLACED';
  released_at: string | null;
  payroll_year: number;
  payroll_month: number;
  month_label: string;
  total_salary: number;
}

export interface PayrollReport {
  type: string;
  title: string;
  columns: Array<{ header: string; key: string; money?: boolean }>;
  rows: Array<Record<string, any>>;
  totals?: Record<string, number>;
}

// =============================================================================
// Helpers
// =============================================================================

const BASE = '/api/v1/payroll';
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
const qs = (o: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && p.append(k, String(v)));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export function errorText(err: any, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  return err.detail || err.message || fallback;
}

export function fieldErrors(err: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of err?.errors || []) if (e?.field && !out[e.field]) out[e.field] = e.message;
  return out;
}

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

export const reportUrl = (type: string, params: Record<string, any>) => `${BASE}/reports/${type}${qs(params)}`;
export const bankFileUrl = (year: number, month: number) => `${BASE}/${year}/${month}/bank-file`;

// =============================================================================
// Queries
// =============================================================================

export const usePayrollMe = () =>
  useQuery({ queryKey: ['payroll', 'me'], queryFn: () => customFetch<PayrollMe>(`${BASE}/me`), staleTime: 60_000 });

export const usePayrollRunsQuery = (year?: number, status?: string, page = 1) =>
  useQuery({
    queryKey: ['payroll', 'runs', year, status, page],
    queryFn: () => customFetch<PayrollRunsResponse>(`${BASE}/runs${qs({ year, status: status && status !== 'ALL' ? status : undefined, page })}`),
    placeholderData: keepPreviousData,
  });

export const useStartableMonths = (enabled = true) =>
  useQuery({ queryKey: ['payroll', 'startable'], queryFn: () => customFetch<Eligibility['available_months']>(`${BASE}/startable-months`), enabled });

export const useStartPayrollEligibilityQuery = (year?: number, month?: number) =>
  useQuery({
    queryKey: ['payroll', 'eligibility', year, month],
    queryFn: () => customFetch<Eligibility>(`${BASE}/${year}/${month}/eligibility`),
    enabled: Boolean(year && month),
  });

export const usePayrollRegisterQuery = (year: number, month: number) =>
  useQuery({
    queryKey: ['payroll', 'register', year, month],
    queryFn: () => customFetch<PayrollRegisterResponse>(`${BASE}/${year}/${month}`),
    enabled: Boolean(year && month),
    refetchInterval: 60_000, // two users on one run: see each other's saves
  });

export const useEmployeeSalarySheetQuery = (year: number, month: number, empId?: number) =>
  useQuery({
    queryKey: ['payroll', 'sheet', year, month, empId],
    queryFn: () => customFetch<EmployeeSalarySheetResponse>(`${BASE}/${year}/${month}/employee/${empId}`),
    enabled: Boolean(year && month && empId),
  });

export const usePayrollSettingsQuery = (enabled = true) =>
  useQuery({ queryKey: ['payroll', 'settings'], queryFn: () => customFetch<PayrollSettings>(`${BASE}/settings`), enabled });

export const useOtApprovals = (year: number, month: number) =>
  useQuery({
    queryKey: ['payroll', 'ot-approvals', year, month],
    queryFn: () => customFetch<{ run: { status: string; month_label: string } | null; entries: PayrollOtItem[] }>(`${BASE}/ot-approvals${qs({ year, month })}`),
  });

export const useSalarySlipQuery = (year: number, month: number, empId?: number, enabled = true) =>
  useQuery({
    queryKey: ['payroll', 'slip', year, month, empId],
    queryFn: () => customFetch<SalarySlip>(`${BASE}/${year}/${month}/employee/${empId}/slip`),
    enabled: enabled && Boolean(empId),
  });

export const useMySlips = () => useQuery({ queryKey: ['payroll', 'my-slips'], queryFn: () => customFetch<MySlipItem[]>(`${BASE}/my-slips`) });

export const useSlipById = (slipId: number | null) =>
  useQuery({
    queryKey: ['payroll', 'slip-by-id', slipId],
    queryFn: () => customFetch<SalarySlip>(`${BASE}/slips/${slipId}`),
    enabled: Boolean(slipId),
  });

export const usePayrollReport = (type: string, params: Record<string, any>, enabled = true) =>
  useQuery({
    queryKey: ['payroll', 'report', type, params],
    queryFn: () => customFetch<PayrollReport>(reportUrl(type, params)),
    enabled,
    retry: false,
  });

// =============================================================================
// Mutations (every change refreshes all payroll data)
// =============================================================================

function usePayrollMutation<TVars, TOut = any>(fn: (v: TVars) => Promise<TOut>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export const useStartPayrollMutation = () =>
  usePayrollMutation(({ year, month }: { year: number; month: number }) =>
    customFetch<PayrollRegisterResponse>(`${BASE}/start`, json('POST', { payroll_year: year, payroll_month: month })),
  );

export const useRecalculateMutation = () =>
  usePayrollMutation(({ year, month }: { year: number; month: number }) => customFetch<PayrollRegisterResponse>(`${BASE}/${year}/${month}/recalculate`, json('POST', {})));

export const useSaveDayAdjustmentMutation = () =>
  usePayrollMutation(({ peId, dayId, data }: { peId: number; dayId: number; data: { pay_this_day_as: string; reason: string; note: string } }) =>
    customFetch(`${BASE}/employees/${peId}/days/${dayId}/adjust`, json('POST', data)),
  );

export const useRemoveDayAdjustmentMutation = () =>
  usePayrollMutation(({ peId, dayId, reason }: { peId: number; dayId: number; reason: string }) =>
    customFetch(`${BASE}/employees/${peId}/days/${dayId}/remove-adjustment`, json('POST', { reason })),
  );

export const useAddAdjustmentMutation = () =>
  usePayrollMutation(({ peId, data }: { peId: number; data: Record<string, any> }) => customFetch(`${BASE}/employees/${peId}/adjustments`, json('POST', data)));

export const useRemoveAdjustmentMutation = () =>
  usePayrollMutation(({ id, reason }: { id: number; reason: string }) => customFetch(`${BASE}/adjustments/${id}`, json('DELETE', { reason })));

export const useDecideOtMutation = () =>
  usePayrollMutation(({ id, status, approved_hours, comment }: { id: number; status: string; approved_hours?: number; comment?: string }) =>
    customFetch(`${BASE}/ot-entries/${id}/decide`, json('POST', { status, approved_hours, comment })),
  );

export const useBulkApproveOtMutation = () =>
  usePayrollMutation((ids: number[]) => customFetch<{ approved: number; skipped: string[] }>(`${BASE}/ot-entries/bulk-approve`, json('POST', { ot_entry_ids: ids })));

export const useLockPayrollMutation = () =>
  usePayrollMutation(({ year, month }: { year: number; month: number }) => customFetch(`${BASE}/${year}/${month}/lock`, json('POST', { confirmed: true })));

export const useUnlockPayrollMutation = () =>
  usePayrollMutation(({ year, month, reason }: { year: number; month: number; reason: string }) => customFetch(`${BASE}/${year}/${month}/unlock`, json('POST', { reason })));

export const useMarkPaidMutation = () =>
  usePayrollMutation(({ year, month, data }: { year: number; month: number; data: Record<string, any> }) => customFetch(`${BASE}/${year}/${month}/pay`, json('POST', data)));

export const useGenerateSalarySlipsMutation = () =>
  usePayrollMutation(({ year, month }: { year: number; month: number }) => customFetch<{ message: string }>(`${BASE}/${year}/${month}/slips/generate`, json('POST', {})));

export const useReleaseSalarySlipsMutation = () =>
  usePayrollMutation(({ year, month }: { year: number; month: number }) => customFetch<{ message: string }>(`${BASE}/${year}/${month}/slips/release`, json('POST', {})));

export const useUpdatePayrollSettingsMutation = () =>
  usePayrollMutation((data: Partial<PayrollSettings>) => customFetch<PayrollSettings>(`${BASE}/settings`, json('PUT', data)));

export const useAddCategoryMutation = () =>
  usePayrollMutation((data: { kind: 'ADDITION' | 'DEDUCTION'; label: string }) => customFetch(`${BASE}/settings/categories`, json('POST', data)));

export const useUpdateCategoryMutation = () =>
  usePayrollMutation(({ id, data }: { id: number; data: { label?: string; is_active?: boolean } }) => customFetch(`${BASE}/settings/categories/${id}`, json('PATCH', data)));

/** Receipt or bill for an adjustment (PDF, JPG or PNG up to 5 MB). */
export async function uploadAdjustmentFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('entity_type', 'PAYROLL_ADJUSTMENT');
  form.append('entity_id', '0');
  const r = await customFetch<any>('/api/v1/attachments/upload', { method: 'POST', body: form });
  return `/api/v1/attachments/${r.attachment_id}/download`;
}

// --- Attendance month lock (Attendance module) ------------------------------

export interface MonthLock {
  year: number;
  month: number;
  is_locked: boolean;
  locked_at: string | null;
  locked_by_name: string | null;
  lock_mode: string | null;
  unlocked_at: string | null;
  unlock_reason: string | null;
}

export const useAttendanceMonthLocks = (year: number) =>
  useQuery({ queryKey: ['attendance-month-locks', year], queryFn: () => customFetch<MonthLock[]>(`/api/v1/attendance/month-locks${qs({ year })}`) });

export function useAttendanceMonthLockMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month, action, reason }: { year: number; month: number; action: 'lock' | 'unlock'; reason?: string }) =>
      customFetch<MonthLock>(`/api/v1/attendance/month-locks/${year}/${month}/${action}`, json('POST', action === 'unlock' ? { reason } : {})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-month-locks'] });
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}
