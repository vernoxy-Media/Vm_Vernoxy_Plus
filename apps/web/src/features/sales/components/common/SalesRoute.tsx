import React from 'react';
import { Link } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { useSalesRights } from '../../hooks/useSalesRights';
import { ShieldAlert, TrendingUp } from 'lucide-react';

export interface SalesRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const SalesRoute: React.FC<SalesRouteProps> = ({ children, requireAdmin = false }) => {
  const { canAccessSales, isAdmin, isLoading } = useSalesRights();

  return (
    <ProtectedRoute>
      {isLoading ? (
        <div className="min-h-screen bg-[#f4f6fa] flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : requireAdmin && !isAdmin ? (
        <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa] px-4">
          <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-xs border border-slate-200 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Admin Access Required</h1>
            <p className="text-sm text-slate-600 mb-6">
              This area is restricted to administrators only. Your current role does not have permission to manage Sales rights.
            </p>
            <Link
              to="/sales/companies"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              Return to Sales Hub
            </Link>
          </div>
        </main>
      ) : !canAccessSales ? (
        <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa] px-4">
          <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-xs border border-slate-200 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
              <TrendingUp className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-sm text-slate-600 mb-6">
              The Sales module requires Sales department membership or administrator privileges.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              Return to Dashboard
            </Link>
          </div>
        </main>
      ) : (
        <>{children}</>
      )}
    </ProtectedRoute>
  );
};
