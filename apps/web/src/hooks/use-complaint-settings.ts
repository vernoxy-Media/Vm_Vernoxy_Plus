import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ComplaintTypeItem {
  type_id: number;
  name: string;
  code: string;
  description: string;
  default_handler_id?: number | null;
  default_handler_name?: string | null;
  default_department_id?: number | null;
  default_department_name?: string | null;
  default_priority: ComplaintPriority;
  is_always_confidential: boolean;
  display_order: number;
  is_active: boolean;
  complaints_count: number;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateComplaintTypePayload {
  name: string;
  code?: string;
  description: string;
  default_handler_id?: number | null;
  default_department_id?: number | null;
  default_priority: ComplaintPriority;
  is_always_confidential?: boolean;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateComplaintTypePayload {
  name?: string;
  code?: string;
  description?: string;
  default_handler_id?: number | null;
  default_department_id?: number | null;
  default_priority?: ComplaintPriority;
  is_always_confidential?: boolean;
  display_order?: number;
  is_active?: boolean;
}

export interface ComplaintSettings {
  setting_id: number;
  target_days_low: number;
  target_days_medium: number;
  target_days_high: number;
  target_days_urgent: number;
  confirmation_window_days: number;
  reminder_before_target_days: number;
  review_reminder_hours: number;
  old_date_warning_days: number;
  duplicate_warning: boolean;
  row_version: number;
  updated_at?: string | null;
}

export interface ComplaintSettingsChangeLogItem {
  log_id: number;
  field_name: string;
  old_value?: string | null;
  new_value: string;
  changed_by_name: string;
  changed_at: string;
}

// =============================================================================
// Complaint Types Hooks
// =============================================================================

export function useComplaintTypesQuery(includeInactive: boolean = false) {
  return useQuery({
    queryKey: ['complaints', 'settings', 'types', { includeInactive }],
    queryFn: () => {
      const url = includeInactive
        ? '/api/v1/complaints/settings/types?includeInactive=true'
        : '/api/v1/complaints/settings/types';
      return customFetch<ComplaintTypeItem[]>(url);
    },
  });
}

export function useCreateComplaintTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateComplaintTypePayload) =>
      customFetch<ComplaintTypeItem>('/api/v1/complaints/settings/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'settings', 'types'] });
    },
  });
}

export function useUpdateComplaintTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateComplaintTypePayload }) =>
      customFetch<ComplaintTypeItem>(`/api/v1/complaints/settings/types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'settings', 'types'] });
    },
  });
}

export function useToggleComplaintTypeStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<ComplaintTypeItem>(`/api/v1/complaints/settings/types/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'settings', 'types'] });
    },
  });
}

export function useDeleteComplaintTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/v1/complaints/settings/types/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'settings', 'types'] });
    },
  });
}

// =============================================================================
// Complaint Settings & Change Log Hooks
// =============================================================================

export function useComplaintSettingsQuery() {
  return useQuery({
    queryKey: ['complaints', 'settings', 'general'],
    queryFn: () => customFetch<ComplaintSettings>('/api/v1/complaints/settings/general'),
  });
}

export function useUpdateComplaintSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ComplaintSettings>) =>
      customFetch<ComplaintSettings>('/api/v1/complaints/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints', 'settings', 'general'] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'settings', 'change-log'] });
    },
  });
}

export function useComplaintChangeLogQuery() {
  return useQuery({
    queryKey: ['complaints', 'settings', 'change-log'],
    queryFn: () =>
      customFetch<ComplaintSettingsChangeLogItem[]>('/api/v1/complaints/settings/change-log'),
  });
}

