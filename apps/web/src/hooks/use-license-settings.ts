import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface LicenseCategory {
  category_id: number;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface LicenseVendor {
  vendor_id: number;
  name: string;
  is_active: boolean;
}

export interface LicenseReason {
  reason_id: number;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface LicenseManager {
  manager_id: number;
  emp_id: number;
  created_at: string;
  employees_software_license_managers_emp_idToemployees?: {
    emp_id: number;
    name: string;
    email: string;
    profile_picture?: string | null;
    dep_id?: number;
    departments_employees_dep_idTodepartments?: {
      dep_id: number;
      name: string;
    };
  };
}

export interface LicenseSettings {
  setting_id: number;
  reminder_window_days: number;
  reminder_days: number[];
  remind_accounts: boolean;
  weekly_renewal_summary: boolean;
  unused_seat_flag_days: number;
  recovery_reminder_days: number;
  max_trial_days: number;
  currency: string;
}

// -----------------------------------------------------------------------------
// 1. Settings Singleton
// -----------------------------------------------------------------------------
export function useLicenseSettingsQuery() {
  return useQuery({
    queryKey: ['license-settings'],
    queryFn: () => customFetch<LicenseSettings>('/api/v1/licenses/settings'),
  });
}

export function useUpdateLicenseSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<LicenseSettings>) =>
      customFetch<LicenseSettings>('/api/v1/licenses/settings', {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-settings'] });
    },
  });
}

// -----------------------------------------------------------------------------
// 2. Categories
// -----------------------------------------------------------------------------
export function useLicenseCategoriesQuery(includeInactive = false) {
  return useQuery({
    queryKey: ['license-categories', includeInactive],
    queryFn: () =>
      customFetch<LicenseCategory[]>(
        `/api/v1/licenses/settings/categories${includeInactive ? '?includeInactive=true' : ''}`,
      ),
  });
}

export function useCreateLicenseCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; display_order?: number; is_active?: boolean }) =>
      customFetch<LicenseCategory>('/api/v1/licenses/settings/categories', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-categories'] });
    },
  });
}

export function useUpdateLicenseCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<LicenseCategory> }) =>
      customFetch<LicenseCategory>(`/api/v1/licenses/settings/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-categories'] });
    },
  });
}

export function useDeleteLicenseCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/v1/licenses/settings/categories/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-categories'] });
    },
  });
}

// -----------------------------------------------------------------------------
// 3. Vendors
// -----------------------------------------------------------------------------
export function useLicenseVendorsQuery(includeInactive = false) {
  return useQuery({
    queryKey: ['license-vendors', includeInactive],
    queryFn: () =>
      customFetch<LicenseVendor[]>(
        `/api/v1/licenses/settings/vendors${includeInactive ? '?includeInactive=true' : ''}`,
      ),
  });
}

export function useCreateLicenseVendorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; is_active?: boolean }) =>
      customFetch<LicenseVendor>('/api/v1/licenses/settings/vendors', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-vendors'] });
    },
  });
}

export function useUpdateLicenseVendorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<LicenseVendor> }) =>
      customFetch<LicenseVendor>(`/api/v1/licenses/settings/vendors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-vendors'] });
    },
  });
}

export function useDeleteLicenseVendorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/v1/licenses/settings/vendors/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-vendors'] });
    },
  });
}

// -----------------------------------------------------------------------------
// 4. Revoke & Discontinue Reasons
// -----------------------------------------------------------------------------
export function useLicenseRevokeReasonsQuery(includeInactive = false) {
  return useQuery({
    queryKey: ['license-revoke-reasons', includeInactive],
    queryFn: () =>
      customFetch<LicenseReason[]>(
        `/api/v1/licenses/settings/revoke-reasons${includeInactive ? '?includeInactive=true' : ''}`,
      ),
  });
}

export function useCreateLicenseRevokeReasonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; display_order?: number; is_active?: boolean }) =>
      customFetch<LicenseReason>('/api/v1/licenses/settings/revoke-reasons', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-revoke-reasons'] });
    },
  });
}

export function useUpdateLicenseRevokeReasonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<LicenseReason> }) =>
      customFetch<LicenseReason>(`/api/v1/licenses/settings/revoke-reasons/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-revoke-reasons'] });
    },
  });
}

export function useDeleteLicenseRevokeReasonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/v1/licenses/settings/revoke-reasons/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-revoke-reasons'] });
    },
  });
}

export function useLicenseDiscontinueReasonsQuery(includeInactive = false) {
  return useQuery({
    queryKey: ['license-discontinue-reasons', includeInactive],
    queryFn: () =>
      customFetch<LicenseReason[]>(
        `/api/v1/licenses/settings/discontinue-reasons${includeInactive ? '?includeInactive=true' : ''}`,
      ),
  });
}

export function useCreateLicenseDiscontinueReasonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; display_order?: number; is_active?: boolean }) =>
      customFetch<LicenseReason>('/api/v1/licenses/settings/discontinue-reasons', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-discontinue-reasons'] });
    },
  });
}

export function useUpdateLicenseDiscontinueReasonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<LicenseReason> }) =>
      customFetch<LicenseReason>(`/api/v1/licenses/settings/discontinue-reasons/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-discontinue-reasons'] });
    },
  });
}

export function useDeleteLicenseDiscontinueReasonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/v1/licenses/settings/discontinue-reasons/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-discontinue-reasons'] });
    },
  });
}

// -----------------------------------------------------------------------------
// 5. Software License Managers
// -----------------------------------------------------------------------------
export function useLicenseManagersQuery() {
  return useQuery({
    queryKey: ['license-managers'],
    queryFn: () => customFetch<LicenseManager[]>('/api/v1/licenses/settings/managers'),
  });
}

export function useAddLicenseManagerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emp_id: number) =>
      customFetch<LicenseManager>('/api/v1/licenses/settings/managers', {
        method: 'POST',
        body: JSON.stringify({ emp_id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-managers'] });
    },
  });
}

export function useRemoveLicenseManagerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emp_id: number) =>
      customFetch(`/api/v1/licenses/settings/managers/${emp_id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['license-managers'] });
    },
  });
}

