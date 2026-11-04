import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export interface ClientListItem {
  client_id: number;
  client_code: string;
  won_on: string;
  win_note: string;
  owner: { emp_id: number; name: string } | null;
  company: { company_id: number; company_code: string | null; name: string; city: string | null; state: string | null; industry: string | null; website: string | null };
  contact: { name: string; designation: string | null; mobile: string | null; email: string | null } | null;
  leads_count: number;
}

export interface ClientListResponse {
  items: ClientListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  counters: { total: number; this_month: number; this_year: number };
}

export interface ClientListParams {
  q?: string;
  sort: 'won_on' | 'name' | 'created_at';
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

/** The clients, one page at a time (the server answers either plain or wrapped in { data }). */
export function useClientList(params: ClientListParams) {
  return useQuery({
    queryKey: ['/api/v1/sales/clients', 'list', params],
    queryFn: async () => {
      const q = new URLSearchParams({ sort: params.sort, order: params.order, page: String(params.page), limit: String(params.limit) });
      if (params.q) q.set('q', params.q);
      const res = await customFetch<ClientListResponse | { data: ClientListResponse }>(`/api/v1/sales/clients?${q.toString()}`);
      return ('data' in (res as object) ? (res as { data: ClientListResponse }).data : (res as ClientListResponse)) as ClientListResponse;
    },
    placeholderData: keepPreviousData,
  });
}
