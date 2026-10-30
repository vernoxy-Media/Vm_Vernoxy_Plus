import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AppLayout } from '@/shared/layouts/AppLayout';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Avatar } from '@/shared/ui/Avatar';
import {
  User,
  Shield,
  KeyRound,
  LogOut,
  Smartphone,
  Loader2,
  CheckCircle,
  Building2,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutAll = async () => {
    setIsLoggingOutAll(true);
    try {
      await logoutAll();
      navigate('/login');
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout title="Profile" fluid>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Profile"
          description="Manage your identity, organizational assignments, and account security controls."
          actions={
            <button
              type="button"
              id="logout-button"
              onClick={handleLogout}
              disabled={isLoggingOut || isLoggingOutAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 transition-colors"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
              ) : (
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
              )}
              Log out
            </button>
          }
        />

        {/* Profile Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          {/* Header Banner */}
          <div className="border-b border-slate-100 bg-slate-900 px-6 py-6 text-white sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar
                  name={user.name}
                  src={user.profile_picture_url}
                  size={64}
                  className="rounded-2xl border-2 border-white/20 shrink-0"
                />
                <div>
                  <h2 className="text-xl font-bold tracking-tight" id="user-display-name">
                    {user.name}
                  </h2>
                  <p className="text-sm text-slate-300 mt-0.5" id="user-display-email">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  Active 2FA Protected
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Identity & Organizational Assignment */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Identity & Organizational Assignment
              </h3>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <dt className="flex items-center text-xs font-medium text-slate-500">
                    <Shield className="mr-1.5 h-4 w-4 text-slate-400" />
                    Assigned Role
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900" id="user-role-name">
                    {user.role?.role_name || (
                      <span className="text-slate-400 font-normal italic">Staff</span>
                    )}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <dt className="flex items-center text-xs font-medium text-slate-500">
                    <Building2 className="mr-1.5 h-4 w-4 text-slate-400" />
                    Department
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900" id="user-department-name">
                    {user.department?.name || (
                      <span className="text-slate-400 font-normal italic">General</span>
                    )}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <dt className="flex items-center text-xs font-medium text-slate-500">
                    <User className="mr-1.5 h-4 w-4 text-slate-400" />
                    Employee ID
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900 font-mono" id="user-emp-id">
                    EMP-{user.emp_id}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <dt className="flex items-center text-xs font-medium text-slate-500">
                    <Smartphone className="mr-1.5 h-4 w-4 text-slate-400" />
                    Registered Mobile
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {user.mob || <span className="text-slate-400 font-normal italic">Not provided</span>}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Account Security Controls */}
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Account Security Controls
              </h3>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/change-password"
                  id="change-password-nav-button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  Change Password
                </Link>

                <button
                  type="button"
                  id="logout-all-button"
                  onClick={handleLogoutAll}
                  disabled={isLoggingOutAll || isLoggingOut}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2.5 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-100/70 focus:outline-none focus:ring-2 focus:ring-rose-600 disabled:opacity-50 transition-colors"
                >
                  {isLoggingOutAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  Log out of all devices
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
