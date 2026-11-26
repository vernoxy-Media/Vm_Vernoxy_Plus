import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import type { SalesReportResponse } from '../types/sales.types';

export interface SalesReportFilters {
  /** YYYY-MM-DD, or '' for "from the beginning". */
  from: string;
  /** YYYY-MM-DD, or '' for "until now". */
  to: string;
  /** "all", "me" or an employee id. Only the Admin can narrow it; for a Sales User the server always uses their own leads. */
  leadBy: string;
  /** "all" or a campaign id. */
  campaignId: string;
}

export interface ReceivedCallRecord {
  communication_id: number;
  company_id: number | null;
  company_name: string | null;
  contact_person: string | null;
  call_date: string;
  what_discussed: string;
  called_by: string | null;
}

function reportParams(filters: SalesReportFilters, canChooseUser: boolean): URLSearchParams {
  const q = new URLSearchParams();
  if (filters.from) q.set('from', filters.from);
  if (filters.to) q.set('to', filters.to);
  if (canChooseUser && filters.leadBy !== 'all') q.set('lead_by', filters.leadBy);
  if (filters.campaignId !== 'all') q.set('campaign_id', filters.campaignId);
  return q;
}

export function useSalesReport(filters: SalesReportFilters, canChooseUser: boolean) {
  return useQuery({
    queryKey: ['/api/v1/sales/reports/summary', filters, canChooseUser],
    queryFn: () => {
      const qs = reportParams(filters, canChooseUser).toString();
      return customFetch<SalesReportResponse>(`/api/v1/sales/reports/summary${qs ? `?${qs}` : ''}`);
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** The records behind one outcome; nothing is fetched until an outcome is chosen. */
export function useReceivedCalls(filters: SalesReportFilters, canChooseUser: boolean, outcome: string | null) {
  return useQuery({
    queryKey: ['/api/v1/sales/reports/received-calls', filters, canChooseUser, outcome],
    queryFn: () => {
      const q = reportParams(filters, canChooseUser);
      q.set('outcome', outcome as string);
      return customFetch<{ items: ReceivedCallRecord[] }>(`/api/v1/sales/reports/received-calls?${q.toString()}`);
    },
    enabled: outcome !== null,
  });
}
