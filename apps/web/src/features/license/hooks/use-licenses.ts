import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface SoftwareListItem {
  software_id: number;
  software_code: string;
  software_name: string;
  category: string;
  category_id: number;
  vendor: string;
  vendor_id: number;
  license_type: string;
  total_seats: number | null;
  assigned_seats: number;
  seat_utilization_pct: number | null;
  status: string;
  auto_renews: boolean;
  owner?: {
    emp_id: number;
    name: string;
    email: string;
  };
  latest_term: {
    term_id: number;
    term_number: number;
    billing_cycle: string;
    cost: number;
    start_date: string;
    expiry_date: string | null;
  } | null;
}

export interface SoftwareListSummary {
  activeLicenses: number;
  expiringSoon: number;
  expired: number;
  discontinued: number;
  licensesToRecover: number;
  approxMonthlySpend: number;
  approxAnnualSpend: number;
}

export interface SoftwareListResponse {
  items: SoftwareListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: SoftwareListSummary;
}

export interface SoftwareDetailsTerm {
  term_id: number;
  software_id: number;
  term_number: number;
  billing_cycle: string | null;
  cost: number;
  total_seats: number | null;
  purchase_date: string;
  start_date: string;
  expiry_date: string | null;
  invoice_order_no?: string | null;
  expense_claim_no?: string | null;
  remarks?: string | null;
  created_at: string;
  employees?: {
    emp_id: number;
    name: string;
  };
}

export interface SoftwareDetailsAssignment {
  assignment_id: number;
  software_id: number;
  emp_id: number;
  login_account_id?: string | null;
  assigned_from: string;
  assigned_by: number;
  status: string;
  remarks?: string | null;
  is_flagged_to_recover: boolean;
  flagged_at?: string | null;
  revoked_on?: string | null;
  revoked_by?: number | null;
  revoke_reason_id?: number | null;
  revoke_remarks?: string | null;
  transferred_to_emp_id?: number | null;
  employees_software_license_assignments_emp_idToemployees?: {
    emp_id: number;
    name: string;
    email: string;
    profile_picture?: string | null;
    departments_employees_dep_idTodepartments?: {
      dep_id: number;
      name: string;
    };
  };
  software_license_revoke_reasons?: {
    reason_id: number;
    name: string;
  };
}

export interface SoftwareDetailsActivityLog {
  log_id: string;
  event: string;
  summary: string;
  details: any;
  performed_at: string;
  performer?: {
    emp_id: number;
    name: string;
    profile_picture?: string | null;
  };
}

export interface SoftwareDetailsDocument {
  attachment_id: number;
  file_name: string;
  file_url: string;
  file_size_bytes: string;
  mime_type: string;
  created_at: string;
  uploader?: {
    emp_id: number;
    name: string;
  };
}

export interface SoftwareDetailsResponse {
  software_id: number;
  software_code: string;
  software_name: string;
  vendor_id: number;
  category_id: number;
  license_type: string;
  total_seats: number | null;
  software_owner_id: number;
  bought_from?: string | null;
  license_key?: string | null;
  auto_renews: boolean;
  status: string;
  discontinue_date?: string | null;
  discontinue_reason_id?: number | null;
  discontinue_remarks?: string | null;
  replaced_by_software_id?: number | null;
  software_license_categories?: { name: string };
  software_license_vendors?: { name: string };
  software_license_discontinue_reasons?: { name: string };
  software_licenses?: { software_id: number; software_code: string; software_name: string };
  employees_software_licenses_software_owner_idToemployees?: {
    emp_id: number;
    name: string;
    email: string;
    profile_picture?: string | null;
    departments_employees_dep_idTodepartments?: { name: string };
  };
  stats: {
    total_seats: number | null;
    assigned_seats: number;
    available_seats: number | null;
    seat_utilization_pct: number | null;
    active_assignments_count: number;
    total_terms_count: number;
    documents_count: number;
  };
  current_term: SoftwareDetailsTerm | null;
  software_license_terms: SoftwareDetailsTerm[];
  software_license_assignments: SoftwareDetailsAssignment[];
  documents: SoftwareDetailsDocument[];
  activity_logs: SoftwareDetailsActivityLog[];
}

export interface MySoftwareItem {
  assignment_id: number;
  software_id: number;
  software_code: string;
  software_name: string;
  category?: string;
  vendor?: string;
  license_type: string;
  login_account_id?: string | null;
  license_key?: string | null;
  assigned_from: string;
  remarks?: string | null;
  status: string;
  owner?: {
    emp_id: number;
    name: string;
    email: string;
  };
  expiry_date?: string | null;
  days_remaining?: number | null;
}

export interface LicenseRecoveryItem {
  assignment_id: number;
  software_id: number;
  software_code: string;
  software_name: string;
  vendor?: string;
  login_account_id?: string | null;
  assigned_from: string;
  flagged_at?: string | null;
  employee: {
    emp_id: number;
    name: string;
    email: string;
    status: string;
    department?: string;
  };
}

// -----------------------------------------------------------------------------
// Queries & Mutations
// -----------------------------------------------------------------------------

export function useSoftwareListQuery(params: {
  search?: string;
  category_id?: number;
  vendor_id?: number;
  status?: string;
  license_type?: string;
  page?: number;
  limit?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.category_id) queryParams.set('category_id', String(params.category_id));
  if (params.vendor_id) queryParams.set('vendor_id', String(params.vendor_id));
  if (params.status && params.status !== 'All') queryParams.set('status', params.status);
  if (params.license_type && params.license_type !== 'All') queryParams.set('license_type', params.license_type);
  if (params.page) queryParams.set('page', String(params.page));
  if (params.limit) queryParams.set('limit', String(params.limit));

  return useQuery({
    queryKey: ['software-list', params],
    queryFn: () =>
      customFetch<SoftwareListResponse>(`/api/v1/licenses?${queryParams.toString()}`),
  });
}

export function useSoftwareDetailsQuery(id: number) {
  return useQuery({
    queryKey: ['software-details', id],
    queryFn: () => customFetch<SoftwareDetailsResponse>(`/api/v1/licenses/${id}`),
    enabled: Boolean(id),
  });
}

export function useMySoftwareQuery() {
  return useQuery({
    queryKey: ['my-software'],
    queryFn: () => customFetch<MySoftwareItem[]>('/api/v1/licenses/my'),
  });
}

export function useLicensesToRecoverQuery() {
  return useQuery({
    queryKey: ['licenses-to-recover'],
    queryFn: () => customFetch<LicenseRecoveryItem[]>('/api/v1/licenses/to-recover'),
  });
}

export function useCreateSoftwareMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: any) =>
      customFetch('/api/v1/licenses', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software-list'] });
      queryClient.invalidateQueries({ queryKey: ['my-software'] });
      queryClient.invalidateQueries({ queryKey: ['licenses-to-recover'] });
    },
  });
}

export function useUpdateSoftwareMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) =>
      customFetch(`/api/v1/licenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['software-list'] });
      queryClient.invalidateQueries({ queryKey: ['software-details', variables.id] });
    },
  });
}

export function useAssignLicenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: { assignments: any[]; assigned_from: string } }) =>
      customFetch(`/api/v1/licenses/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['software-list'] });
      queryClient.invalidateQueries({ queryKey: ['software-details', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['my-software'] });
    },
  });
}

export function useRenewLicenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) =>
      customFetch(`/api/v1/licenses/${id}/renew`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['software-list'] });
      queryClient.invalidateQueries({ queryKey: ['software-details', variables.id] });
    },
  });
}

export function useDiscontinueLicenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: any }) =>
      customFetch(`/api/v1/licenses/${id}/discontinue`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['software-list'] });
      queryClient.invalidateQueries({ queryKey: ['software-details', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['my-software'] });
      queryClient.invalidateQueries({ queryKey: ['licenses-to-recover'] });
    },
  });
}

export function useRevokeAssignmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, dto }: { assignmentId: number; dto: any }) =>
      customFetch(`/api/v1/licenses/assignments/${assignmentId}/revoke`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software-list'] });
      queryClient.invalidateQueries({ queryKey: ['software-details'] });
      queryClient.invalidateQueries({ queryKey: ['my-software'] });
      queryClient.invalidateQueries({ queryKey: ['licenses-to-recover'] });
    },
  });
}

export function useSyncLicensesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      customFetch('/api/v1/licenses/sync', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software-list'] });
      queryClient.invalidateQueries({ queryKey: ['licenses-to-recover'] });
    },
  });
}

