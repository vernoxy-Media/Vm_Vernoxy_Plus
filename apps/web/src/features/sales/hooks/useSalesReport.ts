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
}

export function useSalesReport(filters: SalesReportFilters, canChooseUser: boolean) {
  return useQuery({
    queryKey: ['/api/v1/sales/reports/summary', filters, canChooseUser],
    queryFn: () => {
      const q = new URLSearchParams();
      if (filters.from) q.set('from', filters.from);
      if (filters.to) q.set('to', filters.to);
      if (canChooseUser && filters.leadBy !== 'all') q.set('lead_by', filters.leadBy);
      const qs = q.toString();
      return customFetch<SalesReportResponse>(`/api/v1/sales/reports/summary${qs ? `?${qs}` : ''}`);
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
