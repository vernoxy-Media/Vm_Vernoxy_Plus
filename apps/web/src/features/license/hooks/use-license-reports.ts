import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export type LicenseReportKey =
  | 'register'
  | 'renewals'
  | 'assignments'
  | 'seat-utilization'
  | 'cost-breakdown'
  | 'expired-discontinued'
  | 'activity-logs';

/** Filters of BFD 12 Part 1 marker 4: period or window, Category, Vendor, Owner, Department, Employee, Status. */
export interface LicenseReportParams {
  category_id?: number;
  vendor_id?: number;
  owner_id?: number;
  department_id?: number;
  emp_id?: number;
  status?: string;
  from?: string;
  to?: string;
  days?: number;
  event?: string;
  performed_by?: number;
  include_past?: boolean;
  limit?: number;
}

export function reportQueryString(p: LicenseReportParams) {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  return q.toString();
}

/** One hook for every License report; the server applies the user's scope (BFD 12 Part 3). */
export function useLicenseReportQuery<T = any>(report: LicenseReportKey, params: LicenseReportParams, enabled = true) {
  return useQuery({
    queryKey: ['license-report', report, params],
    queryFn: () => customFetch<T>(`/api/v1/licenses/reports/${report}?${reportQueryString(params)}`),
    enabled,
  });
}
