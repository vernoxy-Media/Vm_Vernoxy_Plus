import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface PayrollRunSummary {
  current_run_month: string;
  current_run_status: string;
  total_employees: number;
  total_salary: number;
  warnings_count: number;
}

export interface PayrollMonthItem {
  payroll_run_id: number | null;
  payroll_year: number;
  payroll_month: number;
  month_name: string;
  date_range: string;
  status: 'NOT_STARTED' | 'DRAFT' | 'LOCKED' | 'PAID';
  total_employees: number;
  gross_earnings: number;
  employee_pf_total: number;
  employer_pf_total: number;
  total_salary: number;
  attendance_locked: boolean;
  attendance_locked_at?: string | null;
  released_slips_count: number;
}

export interface PayrollRunsResponse {
  year: number;
  summary: PayrollRunSummary;
  runs: PayrollMonthItem[];
}

export interface PayrollEmployeeItem {
  payroll_employee_id: number;
  payroll_run_id: number;
  emp_id: number;
  employee_code: string;
  employee_name: string;
  department_names?: string;
  role_name?: string;
  shift_name?: string;
  monthly_salary: number;
  daily_rate: number;
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
  pf_applicable: boolean;
  uan?: string | null;
  pf_wage: number;
  employee_pf: number;
  employer_pf: number;
  total_additions: number;
  total_deductions: number;
  adj_net: number;
  gross_earnings: number;
  total_salary: number;
  flag: 'NONE' | 'ERROR' | 'WARNING' | 'JOINED_IN_MONTH' | 'LEFT_IN_MONTH' | 'ADJUSTED';
  validation_message?: string | null;
  is_paid: boolean;
}

export interface PayrollDayItem {
  payroll_employee_day_id: number;
  payroll_employee_id: number;
  attendance_date: string;
  attendance_code: string;
  day_type: string;
  is_working_day: boolean;
  holiday_name?: string | null;
  paid_as: 'FULL' | 'HALF' | 'UNPAID' | 'NOT_APPLICABLE';
  daily_rate: number;
  calculated_amount: number;
  is_adjusted: boolean;
  original_paid_as?: string | null;
}

export interface PayrollAdjustmentItem {
  payroll_adjustment_id: number;
  payroll_employee_id: number;
  payroll_employee_day_id?: number | null;
  type: 'DAY_ADJUSTMENT' | 'ADDITION' | 'DEDUCTION';
  category_id?: number | null;
  category_label?: string | null;
  old_paid_as?: string | null;
  new_paid_as?: string | null;
  amount: number;
  related_date?: string | null;
  reference_number?: string | null;
  reason: string;
  note?: string | null;
  attachment_url?: string | null;
  is_active: boolean;
  employee_name?: string;
  employee_code?: string;
  created_at: string;
  created_by_name?: string;
}

export interface PayrollOtItem {
  payroll_ot_entry_id: number;
  payroll_run_id: number;
  emp_id: number;
  employee_name: string;
  attendance_date: string;
  day_type: string;
  worked_hours: number;
  proposed_hours: number;
  approved_hours: number;
  hourly_rate: number;
  ot_multiplier?: number | null;
  ot_amount: number;
  ot_paid_as: string;
  status: 'PENDING' | 'APPROVED' | 'REDUCED' | 'REJECTED';
  approver_name?: string | null;
  comment?: string | null;
  approved_at?: string | null;
}

export interface PayrollRegisterResponse {
  run: {
    payroll_run_id: number;
    payroll_month: number;
    payroll_year: number;
    start_date: string;
    end_date: string;
    status: 'DRAFT' | 'LOCKED' | 'PAID';
    calculated_at?: string | null;
    calculated_by_name?: string | null;
    locked_at?: string | null;
    locked_by_name?: string | null;
    attendance_locked: boolean;
    total_employees: number;
    gross_earnings: number;
    employee_pf_total: number;
    employer_pf_total: number;
    total_salary: number;
  };
  employees: PayrollEmployeeItem[];
  ot_entries: PayrollOtItem[];
  adjustments: PayrollAdjustmentItem[];
  checks: {
    errors: Array<{ emp_id: number | null; employee_code: string; employee_name: string; message: string }>;
    warnings: Array<{ emp_id: number | null; employee_code: string; employee_name: string; message: string }>;
    can_lock: boolean;
  };
}

export interface EmployeeSalarySheetResponse {
  run: any;
  employee: PayrollEmployeeItem;
  days: PayrollDayItem[];
  adjustments: PayrollAdjustmentItem[];
  history: any[];
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
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function usePayrollRunsQuery(year?: number, status?: string) {
  return useQuery({
    queryKey: ['payroll-runs', year, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));
      if (status && status !== 'ALL') params.set('status', status);
      return customFetch<PayrollRunsResponse>(`/api/v1/payroll/runs?${params.toString()}`);
    },
  });
}

export function usePayrollSettingsQuery() {
  return useQuery({
    queryKey: ['payroll-settings'],
    queryFn: () => customFetch<PayrollSettings>('/api/v1/payroll/settings'),
  });
}

export function useUpdatePayrollSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PayrollSettings>) =>
      customFetch<PayrollSettings>('/api/v1/payroll/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-settings'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
    },
  });
}

export function useStartPayrollEligibilityQuery(year?: number, month?: number) {
  return useQuery({
    queryKey: ['payroll-eligibility', year, month],
    queryFn: () => customFetch<any>(`/api/v1/payroll/${year}/${month}/eligibility`),
    enabled: Boolean(year && month),
  });
}

export function useStartOrCalculatePayrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      customFetch<PayrollRegisterResponse>(`/api/v1/payroll/${year}/${month}/start`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-register', vars.year, vars.month] });
    },
  });
}

export function usePayrollRegisterQuery(year: number, month: number) {
  return useQuery({
    queryKey: ['payroll-register', year, month],
    queryFn: () => customFetch<PayrollRegisterResponse>(`/api/v1/payroll/${year}/${month}`),
    enabled: Boolean(year && month),
  });
}

export function useEmployeeSalarySheetQuery(year: number, month: number, empId?: number) {
  return useQuery({
    queryKey: ['payroll-salary-sheet', year, month, empId],
    queryFn: () =>
      customFetch<EmployeeSalarySheetResponse>(`/api/v1/payroll/${year}/${month}/employee/${empId}`),
    enabled: Boolean(year && month && empId),
  });
}

export function useSaveDayAdjustmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payrollEmployeeId,
      dayId,
      data,
    }: {
      payrollEmployeeId: number;
      dayId: number;
      data: { pay_this_day_as: 'FULL' | 'HALF' | 'UNPAID'; reason: string; note: string };
    }) =>
      customFetch<any>(`/api/v1/payroll/employees/${payrollEmployeeId}/days/${dayId}/adjust`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-register'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-salary-sheet'] });
    },
  });
}

export function useAddAdjustmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payrollEmployeeId,
      data,
    }: {
      payrollEmployeeId: number;
      data: any;
    }) =>
      customFetch<any>(`/api/v1/payroll/employees/${payrollEmployeeId}/adjustments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-register'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-salary-sheet'] });
    },
  });
}

export function useApproveOtMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      otEntryId,
      data,
    }: {
      otEntryId: number;
      data: { status: 'APPROVED' | 'REDUCED' | 'REJECTED'; approved_hours?: number; comment?: string };
    }) =>
      customFetch<any>(`/api/v1/payroll/ot-entries/${otEntryId}/approve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-register'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-salary-sheet'] });
    },
  });
}

export function useLockPayrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      customFetch<any>(`/api/v1/payroll/${year}/${month}/lock`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-register', vars.year, vars.month] });
    },
  });
}

export function useUnlockPayrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month, reason }: { year: number; month: number; reason: string }) =>
      customFetch<any>(`/api/v1/payroll/${year}/${month}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-register', vars.year, vars.month] });
    },
  });
}

export function useMarkPaidMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      year,
      month,
      data,
    }: {
      year: number;
      month: number;
      data: { payment_date: string; payment_reference?: string };
    }) =>
      customFetch<any>(`/api/v1/payroll/${year}/${month}/pay`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-register', vars.year, vars.month] });
    },
  });
}

export interface SalarySlipPayload {
  company: {
    name: string;
    address: string;
    cin: string;
    email: string;
  };
  slip_info: {
    slip_number: string;
    revision_number: number;
    status: string;
    generated_at: string;
    released_at: string | null;
    payroll_month: string;
    payroll_period: string;
  };
  employee: {
    emp_id: number;
    employee_code: string;
    name: string;
    role_name: string;
    department_name: string;
    joining_date: string;
    uan: string;
    bank_account_number: string;
    bank_ifsc: string;
    bank_name: string;
  };
  attendance: {
    total_working_days: number;
    present_days: number;
    paid_leave_days: number;
    unpaid_leave_days: number;
    absent_days: number;
    half_days: number;
    paid_days: number;
    lop_days: number;
  };
  earnings: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number }>;
  totals: {
    monthly_gross_rate: number;
    gross_earnings: number;
    total_deductions: number;
    net_salary: number;
    net_salary_in_words: string;
  };
  employer_contribution: {
    employer_pf: number;
  };
}

export function useGenerateSalarySlipsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      customFetch<any>(`/api/v1/payroll/${year}/${month}/slips/generate`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-register', vars.year, vars.month] });
    },
  });
}

export function useReleaseSalarySlipsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      customFetch<any>(`/api/v1/payroll/${year}/${month}/slips/release`, {
        method: 'POST',
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-register', vars.year, vars.month] });
    },
  });
}

export function useSalarySlipQuery(year: number, month: number, empId?: number, enabled = true) {
  return useQuery<SalarySlipPayload>({
    queryKey: ['payroll-salary-slip', year, month, empId],
    queryFn: () => customFetch<SalarySlipPayload>(`/api/v1/payroll/${year}/${month}/employee/${empId}/slip`),
    enabled: enabled && !!year && !!month && !!empId,
  });
}

