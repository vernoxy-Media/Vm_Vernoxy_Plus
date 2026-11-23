import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import type {
  AdminOverview,
  AssignBody,
  Campaign,
  CampaignCall,
  CampaignCompaniesFilters,
  CampaignCompaniesResponse,
  CampaignDetail,
  CampaignFormValues,
  CampaignListFilters,
  CampaignListResponse,
  CampaignPerformanceFilters,
  CampaignMasters,
  CompanySearchFilters,
  CompanySearchResponse,
  LogCallResponse,
  LogCallValues,
  MyDashboard,
  PositiveLead,
  UserCall,
  UserPerformanceResponse,
  WorkloadResponse,
} from '../types/campaign.types';

const BASE = '/api/v1/sales/campaigns';
const KEY = ['sales', 'campaigns'] as const;

function qs(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) {
      if (v.length > 0) q.set(k, v.join(','));
    } else {
      q.set(k, String(v));
    }
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

const send = <T,>(url: string, method: string, body?: unknown) =>
  customFetch<T>(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });

// ------------------------------------------------------------- reading ----

export function useCampaignMasters() {
  return useQuery<CampaignMasters>({
    queryKey: [...KEY, 'masters'],
    queryFn: () => customFetch<CampaignMasters>(`${BASE}/masters`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCampaignList(filters: CampaignListFilters, enabled = true) {
  return useQuery<CampaignListResponse>({
    queryKey: [...KEY, 'list', filters],
    queryFn: () => customFetch<CampaignListResponse>(`${BASE}${qs({ ...filters })}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useCampaign(id: number | undefined) {
  return useQuery<CampaignDetail>({
    queryKey: [...KEY, 'one', id],
    queryFn: () => customFetch<CampaignDetail>(`${BASE}/${id}`),
    enabled: id !== undefined && Number.isFinite(id),
  });
}

export function useMyCampaignDashboard(enabled = true) {
  return useQuery<MyDashboard>({
    queryKey: [...KEY, 'my-dashboard'],
    queryFn: () => customFetch<MyDashboard>(`${BASE}/my/dashboard`),
    enabled,
  });
}

export function useAdminCampaignOverview(enabled = true) {
  return useQuery<AdminOverview>({
    queryKey: [...KEY, 'overview'],
    queryFn: () => customFetch<AdminOverview>(`${BASE}/dashboard/overview`),
    enabled,
  });
}

export function useUserPerformance(filters: CampaignPerformanceFilters, enabled = true) {
  return useQuery<UserPerformanceResponse>({
    queryKey: [...KEY, 'user-performance', filters],
    queryFn: () => customFetch<UserPerformanceResponse>(`${BASE}/dashboard/user-performance${qs({ ...filters })}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUserCalls(filters: CampaignPerformanceFilters & { emp_id: number | undefined }) {
  return useQuery<{ items: UserCall[] }>({
    queryKey: [...KEY, 'user-calls', filters],
    queryFn: () => customFetch<{ items: UserCall[] }>(`${BASE}/dashboard/user-calls${qs({ ...filters })}`),
    enabled: filters.emp_id !== undefined,
  });
}

export function usePositiveLeads(filters: CampaignPerformanceFilters & { emp_id: number | undefined }) {
  return useQuery<{ items: PositiveLead[] }>({
    queryKey: [...KEY, 'positive-leads', filters],
    queryFn: () => customFetch<{ items: PositiveLead[] }>(`${BASE}/dashboard/positive-leads${qs({ ...filters })}`),
    enabled: filters.emp_id !== undefined,
  });
}

export function useCampaignCompanies(id: number | undefined, filters: CampaignCompaniesFilters) {
  return useQuery<CampaignCompaniesResponse>({
    queryKey: [...KEY, 'companies', id, filters],
    queryFn: () => customFetch<CampaignCompaniesResponse>(`${BASE}/${id}/companies${qs({ ...filters })}`),
    enabled: id !== undefined && Number.isFinite(id),
    placeholderData: keepPreviousData,
  });
}

export function useCompanySearch(filters: CompanySearchFilters, enabled = true) {
  return useQuery<CompanySearchResponse>({
    queryKey: [...KEY, 'company-search', filters],
    queryFn: () => customFetch<CompanySearchResponse>(`${BASE}/company-search${qs({ ...filters })}`),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCampaignWorkload(id: number | undefined, enabled = true) {
  return useQuery<WorkloadResponse>({
    queryKey: [...KEY, 'workload', id],
    queryFn: () => customFetch<WorkloadResponse>(`${BASE}/${id}/workload`),
    enabled: enabled && id !== undefined && Number.isFinite(id),
  });
}

export function useCampaignCalls(id: number | undefined, campaignCompanyId: number | undefined) {
  return useQuery<{ items: CampaignCall[] }>({
    queryKey: [...KEY, 'calls', id, campaignCompanyId],
    queryFn: () => customFetch<{ items: CampaignCall[] }>(`${BASE}/${id}/companies/${campaignCompanyId}/calls`),
    enabled: id !== undefined && campaignCompanyId !== undefined,
  });
}

// ------------------------------------------------------------- writing ----

/** Everything the screens show comes from campaigns, so any change refreshes all of it. */
function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

export function useCreateCampaign() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (v: CampaignFormValues) => send<Campaign>(BASE, 'POST', v),
    onSuccess: refresh,
  });
}

export function useUpdateCampaign(id: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (v: Partial<CampaignFormValues>) => send<Campaign>(`${BASE}/${id}`, 'PATCH', v),
    onSuccess: refresh,
  });
}

export function useAddCompanies(id: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: { company_ids?: number[]; filter?: Omit<CompanySearchFilters, 'page' | 'limit' | 'campaign_id' | 'hide_added'> }) =>
      send<{ added: number; skipped: number }>(`${BASE}/${id}/companies`, 'POST', body),
    onSuccess: refresh,
  });
}

export function useRemoveCompanies(id: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (campaign_company_ids: number[]) =>
      send<{ removed: number; kept: number }>(`${BASE}/${id}/companies/remove`, 'POST', { campaign_company_ids }),
    onSuccess: refresh,
  });
}

export function useAssignCompanies(id: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: AssignBody) => send<{ assigned: number }>(`${BASE}/${id}/assign`, 'POST', body),
    onSuccess: refresh,
  });
}

export function useSetTargets(id: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (targets: { emp_id: number; daily_target: number }[]) => send<WorkloadResponse>(`${BASE}/${id}/targets`, 'PUT', { targets }),
    onSuccess: refresh,
  });
}

export function useLogCampaignCall(id: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ campaignCompanyId, values }: { campaignCompanyId: number; values: LogCallValues }) =>
      send<LogCallResponse>(`${BASE}/${id}/companies/${campaignCompanyId}/calls`, 'POST', values),
    onSuccess: refresh,
  });
}
