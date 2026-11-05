import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useEmployeeDetailQuery } from '@/features/organization/hooks/use-organization';
import { AppLayout } from '@/shared/layouts/AppLayout';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Avatar } from '@/shared/ui/Avatar';
import { UpcomingHolidays } from '@/features/attendance/components/UpcomingHolidays';
import { BirthdayCelebrations } from '@/features/attendance/components/BirthdayCelebrations';
import { EditProfileModal } from '@/features/employees/components/EditProfileModal';
import {
  User,
  Shield,
  KeyRound,
  LogOut,
  Smartphone,
  Loader2,
  CheckCircle,
  Building2,
  Edit2,
  Mail,
  MapPin,
  Calendar,
  Heart,
  PhoneCall,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, logout, logoutAll, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const { data: employeeDetail, refetch: refetchEmployee } = useEmployeeDetailQuery(user?.emp_id);

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

  const activeEmployee = employeeDetail || (user as any);

  return (
    <AppLayout title="Profile" fluid>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Profile"
          description="Manage your identity, personal information, and account security controls."
          actions={
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-100 hover:text-blue-800 transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
              <button
                type="button"
                id="logout-button"
                onClick={handleLogout}
                disabled={isLoggingOut || isLoggingOutAll}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:opacity-50 transition cursor-pointer"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                ) : (
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                )}
                Log out
              </button>
            </div>
          }
        />

        {/* Profile Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
          {/* Header Banner */}
          <div className="border-b border-slate-100 bg-slate-900 px-6 py-6 text-white sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar
                  name={activeEmployee.name}
                  src={activeEmployee.profile_picture_url}
                  size={64}
                  className="rounded-2xl border-2 border-white/20 shrink-0"
                />
                <div>
                  <h2 className="text-xl font-bold tracking-tight" id="user-display-name">
                    {activeEmployee.name}
                  </h2>
                  <p className="text-sm text-slate-300 mt-0.5" id="user-display-email">
                    {activeEmployee.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/10 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
                <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  Active 2FA Protected
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Identity & Organizational Assignment (Locked) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Identity & Organizational Assignment
                </h3>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  Managed by HR
                </span>
              </div>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <dt className="flex items-center text-xs font-medium text-slate-500">
                    <Shield className="mr-1.5 h-4 w-4 text-slate-400" />
                    Assigned Role / Designation
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900" id="user-role-name">
                    {activeEmployee.role?.role_name || (
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
                    {activeEmployee.department?.name || (
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
                    EMP-{activeEmployee.emp_id}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <dt className="flex items-center text-xs font-medium text-slate-500">
                    <Smartphone className="mr-1.5 h-4 w-4 text-slate-400" />
                    Primary Mobile
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {activeEmployee.mob || <span className="text-slate-400 font-normal italic">Not provided</span>}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Personal Information (Editable by Employee) */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Personal Information
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit Details
                </button>
              </div>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <dt className="flex items-center text-xs font-medium text-slate-500">
                    <Mail className="mr-1.5 h-4 w-4 text-slate-400" />
                    Personal Email
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900 truncate">
                    {activeEmployee.personal_email || (
                      <span className="text-slate-400 font-normal italic">Not provided</span>
                    )}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <dt className="flex items-center text-xs font-medium text-slate-500">
                    <User className="mr-1.5 h-4 w-4 text-slate-400" />
                    Gender
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {activeEmployee.gender?.label || activeEmployee.gender || (
                      <span className="text-slate-400 font-normal italic">Not set</span>
                    )}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <dt className="flex items-center text-xs font-medium text-slate-500">
                    <Heart className="mr-1.5 h-4 w-4 text-slate-400" />
                    Blood Group
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {activeEmployee.blood_group?.label || activeEmployee.blood_group || (
                      <span className="text-slate-400 font-normal italic">Not set</span>
                    )}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
                  <dt className="flex items-center text-xs font-medium text-slate-500">
                    <Calendar className="mr-1.5 h-4 w-4 text-slate-400" />
                    Date of Birth
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                    {activeEmployee.dob ? (
                      new Date(activeEmployee.dob).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    ) : (
                      <span className="text-slate-400 font-normal italic">Not set</span>
                    )}
                  </dd>
                </div>
              </dl>

              {/* Current Address */}
              <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <dt className="flex items-center text-xs font-medium text-slate-500">
                  <MapPin className="mr-1.5 h-4 w-4 text-slate-400" />
                  Current Residential Address
                </dt>
                <dd className="mt-1.5 text-sm font-semibold text-slate-900">
                  {activeEmployee.cur_address || (
                    <span className="text-slate-400 font-normal italic">No residential address specified.</span>
                  )}
                </dd>
              </div>

              {/* Emergency Contact */}
              {activeEmployee.emergency_contacts && activeEmployee.emergency_contacts.length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <dt className="flex items-center text-xs font-medium text-slate-500 mb-2">
                    <PhoneCall className="mr-1.5 h-4 w-4 text-slate-400" />
                    Emergency Contact(s)
                  </dt>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeEmployee.emergency_contacts.map((ec: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200/70 text-xs">
                        <span className="font-semibold text-slate-800">{ec.name}</span>
                        <span className="text-slate-500 ml-1.5">({ec.relationship})</span>
                        <div className="text-slate-600 font-mono mt-0.5">{ec.phone}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  Change Password
                </Link>

                <button
                  type="button"
                  id="logout-all-button"
                  onClick={handleLogoutAll}
                  disabled={isLoggingOutAll || isLoggingOut}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2.5 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100/70 focus:outline-none focus:ring-2 focus:ring-rose-600 disabled:opacity-50 transition-colors"
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

        <BirthdayCelebrations />
        <UpcomingHolidays />

        {/* Edit Profile Modal */}
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          employee={activeEmployee}
          isAdmin={Boolean(user?.access?.can_manage_organization)}
          onSuccess={async () => {
            refetchEmployee();
            await refreshProfile();
          }}
        />
      </div>
    </AppLayout>
  );
};
