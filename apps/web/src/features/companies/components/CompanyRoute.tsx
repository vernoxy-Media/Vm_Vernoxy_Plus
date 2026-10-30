import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { Building2 } from 'lucide-react';

export const CompanyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  return (
    <ProtectedRoute>
      {isLoading ? null : !user?.access?.can_manage_companies ? (
        <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa] px-4">
          <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
              <Building2 className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-sm text-slate-600 mb-6">
              Managing CRM Companies requires company administration privileges. Your current role does not have permission to access this area.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Return to Dashboard
            </Link>
          </div>
        </main>
      ) : (
        children
      )}
    </ProtectedRoute>
  );
};
