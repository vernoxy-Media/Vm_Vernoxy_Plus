import { useAuth } from '@/features/auth/context/AuthContext';
import { useSalesImportExportControllerMyRights } from '@vernoxy-pulse/api-client';
import type { SalesMyRightsResponse } from '../types/sales.types';

export function useSalesRights() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const isAdmin = Boolean(
    user?.access?.can_manage_organization ||
      user?.role?.role_name?.toLowerCase().includes('admin'),
  );

  const deptName = user?.department?.name?.trim().toLowerCase() ?? '';
  const isSales = deptName.startsWith('sales');

  const canAccessSales = isAdmin || isSales;

  const { data: rightsData, isLoading: isRightsLoading } = useSalesImportExportControllerMyRights({
    query: {
      enabled: Boolean(user && canAccessSales),
      staleTime: 1000 * 60 * 5, // 5 min
    },
  });

  const parsedRights = (
    (rightsData as unknown as { data?: SalesMyRightsResponse })?.data ??
    (rightsData as unknown as SalesMyRightsResponse)
  );

  // Admin always has full import and export rights by business rule
  const canImport = isAdmin || Boolean(parsedRights?.can_import);
  const canExport = isAdmin || Boolean(parsedRights?.can_export);

  return {
    user,
    isAdmin,
    isSales,
    canAccessSales,
    canImport,
    canExport,
    isLoading: isAuthLoading || (canAccessSales && isRightsLoading),
  };
}
