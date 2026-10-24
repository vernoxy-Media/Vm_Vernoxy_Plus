import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customFetch,
  ListIndustriesResponseDto,
  IndustryDetailResponseDto,
  IndustryOptionDto,
  CreateIndustryDto,
  UpdateIndustryDto,
  ListCustomerTypesResponseDto,
  CustomerTypeItemDto,
  CustomerTypeOptionDto,
  CreateCustomerTypeDto,
  UpdateCustomerTypeDto,
  LookupOptionDto,
  MasterLookupItemDto,
  CreateLookupDto,
  UpdateLookupDto,
} from '@vernoxy-pulse/api-client';

// ========================
// INDUSTRIES HOOKS
// ========================

export function useIndustriesQuery(params?: {
  q?: string;
  parent_id?: number;
  level?: 'top' | 'sub';
  is_active?: boolean;
  limit?: number;
  cursor?: number | string;
}) {
  return useQuery({
    queryKey: ['industries', params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params?.q) q.set('q', params.q);
      if (params?.parent_id) q.set('parent_id', String(params.parent_id));
      if (params?.level) q.set('level', params.level);
      if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.cursor) q.set('cursor', String(params.cursor));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return customFetch<ListIndustriesResponseDto>(`/api/v1/industries${qs}`);
    },
  });
}

export function useIndustryOptionsQuery(parentId?: number) {
  return useQuery({
    queryKey: ['industry-options', parentId],
    queryFn: () => {
      const qs = parentId ? `?parent_id=${parentId}` : '';
      return customFetch<IndustryOptionDto[]>(`/api/v1/industries/options${qs}`);
    },
    staleTime: 60_000,
  });
}

export function useCreateIndustryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateIndustryDto) =>
      customFetch<IndustryDetailResponseDto>('/api/v1/industries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industries'] });
      queryClient.invalidateQueries({ queryKey: ['industry-options'] });
    },
  });
}

export function useUpdateIndustryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateIndustryDto }) =>
      customFetch<IndustryDetailResponseDto>(`/api/v1/industries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industries'] });
      queryClient.invalidateQueries({ queryKey: ['industry-options'] });
    },
  });
}

export function useDeleteIndustryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/industries/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industries'] });
      queryClient.invalidateQueries({ queryKey: ['industry-options'] });
    },
  });
}

// ========================
// CUSTOMER TYPES HOOKS
// ========================

export function useCustomerTypesQuery(params?: {
  q?: string;
  is_active?: boolean;
  limit?: number;
  cursor?: number | string;
}) {
  return useQuery({
    queryKey: ['customer-types', params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params?.q) q.set('q', params.q);
      if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.cursor) q.set('cursor', String(params.cursor));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return customFetch<ListCustomerTypesResponseDto>(`/api/v1/customer-types${qs}`);
    },
  });
}

export function useCustomerTypeOptionsQuery() {
  return useQuery({
    queryKey: ['customer-type-options'],
    queryFn: () => customFetch<CustomerTypeOptionDto[]>('/api/v1/customer-types/options'),
    staleTime: 60_000,
  });
}

export function useCreateCustomerTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerTypeDto) =>
      customFetch<CustomerTypeItemDto>('/api/v1/customer-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-types'] });
      queryClient.invalidateQueries({ queryKey: ['customer-type-options'] });
    },
  });
}

export function useUpdateCustomerTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerTypeDto }) =>
      customFetch<CustomerTypeItemDto>(`/api/v1/customer-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-types'] });
      queryClient.invalidateQueries({ queryKey: ['customer-type-options'] });
    },
  });
}

export function useDeleteCustomerTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/customer-types/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-types'] });
      queryClient.invalidateQueries({ queryKey: ['customer-type-options'] });
    },
  });
}

// ========================
// LOOKUPS HOOKS
// ========================

/** Get active lookup options only (for dropdowns/selects) */
export function useLookupsQuery(type: string) {
  return useQuery({
    queryKey: ['lookups', type],
    queryFn: () => customFetch<LookupOptionDto[]>(`/api/v1/lookups/options?type=${type}`),
    staleTime: 60_000,
  });
}

/** Admin: Get ALL lookup items of a given type (including inactive) for management */
export function useAdminLookupsQuery(type: string) {
  return useQuery({
    queryKey: ['admin-lookups', type],
    queryFn: () => customFetch<MasterLookupItemDto[]>(`/api/v1/lookups?type=${type}`),
    enabled: Boolean(type),
  });
}

export function useCreateLookupMutation(type: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLookupDto) =>
      customFetch<MasterLookupItemDto>(`/api/v1/lookups?type=${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lookups', type] });
      queryClient.invalidateQueries({ queryKey: ['lookups', type] });
    },
  });
}

export function useUpdateLookupMutation(type: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLookupDto }) =>
      customFetch<MasterLookupItemDto>(`/api/v1/lookups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lookups', type] });
      queryClient.invalidateQueries({ queryKey: ['lookups', type] });
    },
  });
}

export function useDeleteLookupMutation(type: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/lookups/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lookups', type] });
      queryClient.invalidateQueries({ queryKey: ['lookups', type] });
    },
  });
}

