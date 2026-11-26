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

export type CompanyCallSort =
  | 'company_name'
  | 'contact_person'
  | 'total'
  | 'received'
  | 'not_received'
  | 'latest_outcome'
  | 'last_call_date'
  | 'last_remark';

export interface CompanyCallView {
  q: string;
  sort: CompanyCallSort;
  dir: 'asc' | 'desc';
}

export interface CompanyCallRow {
  key: string;
  company_id: number | null;
  company_name: string;
  contact_person: string | null;
  total: number;
  received: number;
  not_received: number;
  latest_outcome: string | null;
  last_call_date: string;
  last_remark: string | null;
}

export interface CompanyCallHistoryItem {
  communication_id: number;
  call_date: string;
  call_status: string | null;
  not_received_reason: string | null;
  outcome: string | null;
  duration_seconds: number | null;
  remark: string | null;
  called_by: string | null;
}

function companyCallParams(filters: SalesReportFilters, canChooseUser: boolean, view: CompanyCallView): string {
  const q = reportParams(filters, canChooseUser);
  if (view.q.trim()) q.set('q', view.q.trim());
  q.set('sort', view.sort);
  q.set('dir', view.dir);
  return q.toString();
}

export function useCompanyCalls(filters: SalesReportFilters, canChooseUser: boolean, view: CompanyCallView) {
  return useQuery({
    queryKey: ['/api/v1/sales/reports/company-calls', filters, canChooseUser, view],
    queryFn: () => customFetch<{ items: CompanyCallRow[] }>(`/api/v1/sales/reports/company-calls?${companyCallParams(filters, canChooseUser, view)}`),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export const companyCallExportUrl = (filters: SalesReportFilters, canChooseUser: boolean, view: CompanyCallView) =>
  `/api/v1/sales/reports/company-calls/export?${companyCallParams(filters, canChooseUser, view)}`;

export function useCompanyCallHistory(filters: SalesReportFilters, canChooseUser: boolean, companyId: number | null) {
  return useQuery({
    queryKey: ['/api/v1/sales/reports/company-calls/history', filters, canChooseUser, companyId],
    queryFn: () =>
      customFetch<{ items: CompanyCallHistoryItem[] }>(
        `/api/v1/sales/reports/company-calls/${companyId}/history?${reportParams(filters, canChooseUser).toString()}`,
      ),
    enabled: companyId !== null,
  });
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
