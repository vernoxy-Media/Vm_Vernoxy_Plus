import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import {
  SalesDashboardFilters,
  SalesDashboardConfig,
  SalesDashboardDataResponse,
  UserChartPermission,
} from '../types/sales-dashboard.types';

const API_BASE = '/api/v1/sales/dashboard';

function buildQueryString(params: Record<string, any>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === null || val === '') return;
    if (Array.isArray(val)) {
      if (val.length > 0) q.set(key, val.join(','));
    } else {
      q.set(key, String(val));
    }
  });
  return q.toString();
}

export function useSalesDashboardConfig() {
  return useQuery<SalesDashboardConfig>({
    queryKey: ['sales', 'dashboard', 'config'],
    queryFn: () => customFetch<SalesDashboardConfig>(`${API_BASE}/config`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSalesDashboardData(
  filters: SalesDashboardFilters,
  extraOptions?: {
    us03_group_by?: 'day' | 'week' | 'month';
    us08_compare_by?: 'source' | 'owner';
    us09_group_by?: 'day' | 'week' | 'month';
    us12_date?: string;
    us12_follow_up_from?: string;
    us12_follow_up_to?: string;
  }
) {
  const queryParams = {
    ...filters,
    ...extraOptions,
  };
  const qs = buildQueryString(queryParams);

  return useQuery<SalesDashboardDataResponse>({
    queryKey: ['sales', 'dashboard', 'data', queryParams],
    queryFn: () => customFetch<SalesDashboardDataResponse>(`${API_BASE}/data?${qs}`),
    staleTime: 60 * 1000,
  });
}

export function useUpdateDashboardDefaults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (defaults: any) =>
      customFetch(`${API_BASE}/config/defaults`, {
        method: 'PUT',
        body: JSON.stringify(defaults),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'dashboard'] });
    },
  });
}

export function useListDashboardUserPermissions() {
  return useQuery<UserChartPermission[]>({
    queryKey: ['sales', 'dashboard', 'permissions'],
    queryFn: () => customFetch<UserChartPermission[]>(`${API_BASE}/config/permissions`),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateUserChartPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ empId, permissions }: { empId: number; permissions: Record<string, boolean> }) =>
      customFetch(`${API_BASE}/config/permissions/${empId}`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'dashboard'] });
    },
  });
}
