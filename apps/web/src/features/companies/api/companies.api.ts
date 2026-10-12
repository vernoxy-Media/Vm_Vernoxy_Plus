import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  customFetch,
  ListCompaniesResponseDto,
  CompanyDetailResponseDto,
  CompanyOptionDto,
  CompanyDuplicateMatchDto,
  CreateCompanyDto,
  UpdateCompanyDto,
  PersonLookupMatchDto,
} from '@vernoxy-pulse/api-client';

export function useCompaniesQuery(params?: {
  q?: string;
  customer_type_id?: number;
  industry_id?: number;
  owner?: string;
  owner_id?: number;
  is_active?: boolean;
  limit?: number;
  cursor?: string;
}) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params?.q) q.set('q', params.q);
      if (params?.customer_type_id) q.set('customer_type_id', String(params.customer_type_id));
      if (params?.industry_id) q.set('industry_id', String(params.industry_id));
      if (params?.owner) q.set('owner', params.owner);
      if (params?.owner_id) q.set('owner_id', String(params.owner_id));
      if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.cursor) q.set('cursor', params.cursor);
      const qs = q.toString() ? `?${q.toString()}` : '';
      return customFetch<ListCompaniesResponseDto>(`/api/v1/companies${qs}`);
    },
  });
}

export function useCompanyDetailQuery(id?: number) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: () => customFetch<CompanyDetailResponseDto>(`/api/v1/companies/${id}`),
    enabled: Boolean(id),
  });
}

export function useCompanyOptionsQuery(params?: { q?: string; exclude_id?: number }) {
  return useQuery({
    queryKey: ['company-options', params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params?.q) q.set('q', params.q);
      if (params?.exclude_id) q.set('exclude_id', String(params.exclude_id));
      const qs = q.toString() ? `?${q.toString()}` : '';
      return customFetch<CompanyOptionDto[]>(`/api/v1/companies/options${qs}`);
    },
    staleTime: 30_000,
  });
}

export function useCompanyDuplicatesQuery(params: {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
}) {
  const hasInput = Boolean(
    (params.name && params.name.length >= 2) ||
      params.email ||
      params.phone ||
      params.website
  );

  return useQuery({
    queryKey: ['company-duplicates', params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params.name) q.set('name', params.name);
      if (params.email) q.set('email', params.email);
      if (params.phone) q.set('phone', params.phone);
      if (params.website) q.set('website', params.website);
      return customFetch<CompanyDuplicateMatchDto[]>(`/api/v1/companies/duplicate-check?${q.toString()}`);
    },
    enabled: hasInput,
    staleTime: 5_000,
  });
}

export function usePersonsLookupQuery(params: {
  email?: string;
  mobile?: string;
  q?: string;
}) {
  const hasInput = Boolean(params.email || params.mobile || (params.q && params.q.length >= 2));
  return useQuery({
    queryKey: ['persons-lookup', params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params.email) q.set('email', params.email);
      if (params.mobile) q.set('mobile', params.mobile);
      if (params.q) q.set('q', params.q);
      return customFetch<PersonLookupMatchDto[]>(`/api/v1/persons/lookup?${q.toString()}`);
    },
    enabled: hasInput,
    staleTime: 10_000,
  });
}

export function useCreateCompanyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompanyDto) =>
      customFetch<CompanyDetailResponseDto>('/api/v1/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-options'] });
    },
  });
}

export function useUpdateCompanyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCompanyDto }) =>
      customFetch<CompanyDetailResponseDto>(`/api/v1/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['company-options'] });
    },
  });
}

export function useDeleteCompanyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/v1/companies/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company-options'] });
    },
  });
}
