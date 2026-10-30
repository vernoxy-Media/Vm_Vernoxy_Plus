import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';

export function useLicenseRegisterReportQuery() {
  return useQuery({
    queryKey: ['license-report-register'],
    queryFn: () => customFetch<any[]>('/api/v1/licenses/reports/register'),
  });
}

export function useLicenseRenewalsReportQuery(days = 60) {
  return useQuery({
    queryKey: ['license-report-renewals', days],
    queryFn: () => customFetch<any[]>(`/api/v1/licenses/reports/renewals?days=${days}`),
  });
}

export function useLicenseAssignmentsReportQuery(empId?: number, departmentId?: number) {
  const params = new URLSearchParams();
  if (empId) params.set('empId', String(empId));
  if (departmentId) params.set('departmentId', String(departmentId));

  return useQuery({
    queryKey: ['license-report-assignments', empId, departmentId],
    queryFn: () =>
      customFetch<any[]>(`/api/v1/licenses/reports/assignments?${params.toString()}`),
  });
}

export function useLicenseSeatUtilizationReportQuery() {
  return useQuery({
    queryKey: ['license-report-seat-utilization'],
    queryFn: () => customFetch<any[]>('/api/v1/licenses/reports/seat-utilization'),
  });
}

export function useLicenseCostBreakdownReportQuery() {
  return useQuery({
    queryKey: ['license-report-cost-breakdown'],
    queryFn: () => customFetch<any>('/api/v1/licenses/reports/cost-breakdown'),
  });
}

export function useLicenseExpiredDiscontinuedReportQuery() {
  return useQuery({
    queryKey: ['license-report-expired-discontinued'],
    queryFn: () => customFetch<any[]>('/api/v1/licenses/reports/expired-discontinued'),
  });
}

export function useLicenseActivityLogsReportQuery(limit = 100) {
  return useQuery({
    queryKey: ['license-report-activity-logs', limit],
    queryFn: () => customFetch<any[]>(`/api/v1/licenses/reports/activity-logs?limit=${limit}`),
  });
}

