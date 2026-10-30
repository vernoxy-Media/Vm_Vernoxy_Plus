import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

// =============================================================================
// Interfaces
// =============================================================================

export interface ExpenseCategory {
  category_id: number;
  name: string;
  code?: string | null;
  allowed_type: 'OFFICE' | 'PERSONAL' | 'BOTH';
  limit_per_claim?: number | null;
  receipt_rule: 'ALWAYS' | 'ABOVE_THRESHOLD';
  receipt_threshold_amount: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at?: string | null;
}

export interface ExpenseGeneralSettings {
  setting_id: number;
  claim_window_days: number;
  after_claim_window_action: 'FLAG_AS_LATE' | 'STOP_SUBMISSION';
  duplicate_check_enabled: boolean;
  default_reimbursement_method: 'DIRECT' | 'PAYROLL';
  approver_reminder_days: number;
  currency: string;
  created_at: string;
  updated_at?: string | null;
}

export interface DepartmentApproverMapping {
  department_id: number;
  department_name: string;
  mapping: {
    approver_mapping_id: number;
    approver_emp_id: number;
    approver: {
      emp_id: number;
      name: string;
      email: string;
    };
    updated_at: string;
  } | null;
}

export interface ExpenseSettingsChangeLog {
  log_id: number;
  entity_type: string;
  entity_id: number;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
  changed_by: number;
  changed_by_name?: string | null;
  changed_by_code?: string | null;
  changed_at: string;
}

export interface ExpenseTypeItem {
  type_id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at?: string | null;
}

// =============================================================================
// Queries & Mutations
// =============================================================================

export function useExpenseCategoriesQuery() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => customFetch<ExpenseCategory[]>('/api/v1/expense/settings/categories'),
  });
}
export const useExpenseCategories = useExpenseCategoriesQuery;

export function useCreateExpenseCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ExpenseCategory>) =>
      customFetch<ExpenseCategory>('/api/v1/expense/settings/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}

export function useUpdateExpenseCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExpenseCategory> }) =>
      customFetch<ExpenseCategory>(`/api/v1/expense/settings/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}

export function useToggleExpenseCategoryStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<ExpenseCategory>(`/api/v1/expense/settings/categories/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}

export function useDeleteExpenseCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/expense/settings/categories/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}

export function useExpenseGeneralSettingsQuery() {
  return useQuery({
    queryKey: ['expense-general-settings'],
    queryFn: () => customFetch<ExpenseGeneralSettings>('/api/v1/expense/settings/general'),
  });
}
export const useExpenseGeneralSettings = useExpenseGeneralSettingsQuery;

export function useUpdateExpenseGeneralSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ExpenseGeneralSettings>) =>
      customFetch<ExpenseGeneralSettings>('/api/v1/expense/settings/general', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-general-settings'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}

export function useDepartmentApproversQuery() {
  return useQuery({
    queryKey: ['expense-department-approvers'],
    queryFn: () => customFetch<DepartmentApproverMapping[]>('/api/v1/expense/settings/approvers'),
  });
}

export function useAssignAuthorisedApproverMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { department_id: number; approver_emp_id: number }) =>
      customFetch<any>('/api/v1/expense/settings/approvers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-department-approvers'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}

export function useRemoveAuthorisedApproverMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (departmentId: number) =>
      customFetch<any>(`/api/v1/expense/settings/approvers/${departmentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-department-approvers'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}

export function useExpenseSettingsChangeLogQuery() {
  return useQuery({
    queryKey: ['expense-change-log'],
    queryFn: () => customFetch<ExpenseSettingsChangeLog[]>('/api/v1/expense/settings/change-log'),
  });
}

// -----------------------------------------------------------------------------
// Expense Types Hooks
// -----------------------------------------------------------------------------

export function useExpenseTypesQuery() {
  return useQuery({
    queryKey: ['expense-types'],
    queryFn: () => customFetch<ExpenseTypeItem[]>('/api/v1/expense/settings/types'),
  });
}

export function useCreateExpenseTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ExpenseTypeItem>) =>
      customFetch<ExpenseTypeItem>('/api/v1/expense/settings/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-types'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}

export function useUpdateExpenseTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExpenseTypeItem> }) =>
      customFetch<ExpenseTypeItem>(`/api/v1/expense/settings/types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-types'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}

export function useToggleExpenseTypeStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<ExpenseTypeItem>(`/api/v1/expense/settings/types/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-types'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}

export function useDeleteExpenseTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/expense/settings/types/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-types'] });
      qc.invalidateQueries({ queryKey: ['expense-change-log'] });
    },
  });
}


