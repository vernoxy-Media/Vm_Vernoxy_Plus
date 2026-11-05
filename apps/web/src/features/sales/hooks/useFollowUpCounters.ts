import { useSalesFollowUpControllerList } from '@vernoxy-pulse/api-client';
import { useSalesRights } from './useSalesRights';
import type { FollowUpListResponse } from '../types/sales.types';

export function useFollowUpCounters() {
  const { canAccessSales } = useSalesRights();

  const { data, isLoading } = useSalesFollowUpControllerList(
    { tab: 'today', limit: 1 },
    {
      query: {
        enabled: canAccessSales,
        refetchInterval: 60_000, // every 60s
        staleTime: 30_000,
      },
    },
  );

  const parsed = (
    (data as unknown as { data?: FollowUpListResponse })?.data ??
    (data as unknown as FollowUpListResponse)
  );

  const todayCount = parsed?.tab_counts?.today ?? 0;
  const overdueCount = parsed?.tab_counts?.overdue ?? 0;
  const totalDueCount = todayCount + overdueCount;

  return {
    todayCount,
    overdueCount,
    totalDueCount,
    isLoading,
  };
}
