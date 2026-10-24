import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface Lead {
  lead_id: number;
  company_id: number | null;
  company_name: string;
  title: string | null;
  no_of_branches: number | null;
  no_of_plants: number | null;
  full_address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pin: string | null;
  google_maps_url: string | null;
  is_gidc: boolean;
  gidc_name: string | null;
  gidc_area_phase: string | null;
  contact_person: string | null;
  designation: string | null;
  mobile: string | null;
  email: string | null;
  nature_of_business: string | null;
  industry: string | null;
  industry_id: number | null;
  products_services: string | null;
  estimated_employees: number | null;
  estimated_turnover: number | null;
  year_established: number | null;
  existing_major_clients: string | null;
  website: string | null;
  website_quality: string | null;
  developed_by: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  google_business_profile_url: string | null;
  brochure_url: string | null;
  lead_source: string;
  lead_by_id: number;
  service_fit: string;
  lead_stage: string;
  pipeline_stage_id: number;
  expected_value: number | null;
  actual_value: number | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string | null;
  owner_id: number;
  employees_leads_owner_idToemployees?: {
    emp_id: number;
    name: string;
    email: string;
    mob?: string | null;
    profile_picture?: string | null;
  } | null;
  pipeline_stages?: {
    pipeline_stage_id: number;
    name: string;
    sort_order: number;
  } | null;
  companies?: {
    company_id: number;
    name: string;
  } | null;
}

export interface LeadMasters {
  lead_sources: { code: string; label: string }[];
  service_fits: { code: string; label: string }[];
  nature_of_business: { code: string; label: string }[];
  gidc_names: { code: string; label: string }[];
  gidc_phases: { code: string; label: string }[];
  designations: { code: string; label: string }[];
  website_qualities: { code: string; label: string }[];
  lost_reasons: { code: string; label: string }[];
  industries: { industry_id: number; name: string }[];
  sales_users: { emp_id: number; name: string; email: string }[];
  stages: { id: number; name: string; sort_order: number }[];
}

export interface ListLeadsResponse {
  leads: Lead[];
  metrics: {
    totalLeadsCount: number;
    totalPipelineValue: number;
    stageMetrics: Record<string, { count: number; totalValue: number }>;
  };
}

export function useLeadsQuery(filters?: {
  search?: string;
  status?: string;
  is_gidc?: boolean;
  gidc_name?: string;
  lead_source?: string;
  lead_by_id?: number;
  service_fit?: string;
}) {
  return useQuery({
    queryKey: ['sales-leads', filters],
    queryFn: () => {
      const q = new URLSearchParams();
      if (filters?.search) q.set('search', filters.search);
      if (filters?.status && filters.status !== 'all') q.set('status', filters.status);
      if (filters?.is_gidc !== undefined) q.set('is_gidc', String(filters.is_gidc));
      if (filters?.gidc_name) q.set('gidc_name', filters.gidc_name);
      if (filters?.lead_source) q.set('lead_source', filters.lead_source);
      if (filters?.lead_by_id) q.set('lead_by_id', String(filters.lead_by_id));
      if (filters?.service_fit) q.set('service_fit', filters.service_fit);

      const qs = q.toString() ? `?${q.toString()}` : '';
      return customFetch<ListLeadsResponse>(`/api/v1/sales/leads${qs}`);
    },
  });
}

export function useLeadMastersQuery() {
  return useQuery({
    queryKey: ['sales-lead-masters'],
    queryFn: () => customFetch<LeadMasters>('/api/v1/sales/leads/masters'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeadDetailQuery(id?: number) {
  return useQuery({
    queryKey: ['sales-lead-detail', id],
    queryFn: () => customFetch<Lead>(`/api/v1/sales/leads/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Lead>) =>
      customFetch<Lead>('/api/v1/sales/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
    },
  });
}

export function useUpdateLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Lead> }) =>
      customFetch<Lead>(`/api/v1/sales/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sales-lead-detail', vars.id] });
    },
  });
}

export function useUpdateLeadStageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      lost_reason,
      actual_value,
    }: {
      id: number;
      status: string;
      lost_reason?: string;
      actual_value?: number;
    }) =>
      customFetch<Lead>(`/api/v1/sales/leads/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, lost_reason, actual_value }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
    },
  });
}

export function useConvertLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string; company_id: number; company_name: string; lead: Lead }>(
        `/api/v1/sales/leads/${id}/convert`,
        {
          method: 'POST',
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useDeleteLeadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string }>(`/api/v1/sales/leads/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
    },
  });
}
