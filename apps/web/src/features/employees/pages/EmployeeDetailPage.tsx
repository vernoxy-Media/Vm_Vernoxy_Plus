import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { Avatar } from '@/shared/ui/Avatar';
import {
  useEmployeeDetailQuery,
  useDeactivateWarningQuery,
  useDeactivateEmployeeMutation,
  useEmployeeHistoryQuery,
} from '@/features/organization/hooks/use-organization';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  ArrowLeft,
  Building2,
  AlertTriangle,
  UserX,
  History,
  CheckCircle2,
  Edit2,
  Loader2,
  Wallet,
  Sparkles,
  TrendingUp,
  UserPlus,
  X,
  Lock,
  Key,
  ShieldCheck,
  Landmark,
} from 'lucide-react';
import { EmployeeDocumentsTab } from '../components/EmployeeDocumentsTab';
import { EmployeeAttendanceTab } from '../components/EmployeeAttendanceTab';
import { OnboardingChecklistTab } from '../components/OnboardingChecklistTab';
import { EmployeeLeaveCard } from '@/features/leave/components/EmployeeLeaveCard';
import {
  useEmployeeActivationStatusQuery,
  useActivateEmployeeMutation,
  useResendEmployeeLoginMutation,
  ActivateEmployeeResult,
} from '../hooks/use-employee-documents';
import { AccountActivatedModal } from '../components/AccountActivatedModal';
import { ResetEmployeePasswordButton } from '../components/ResetEmployeePasswordButton';
import { ActivateEmployeeAccountModal } from '../components/ActivateEmployeeAccountModal';
import { EditProfileModal } from '../components/EditProfileModal';
import { useAttendanceSettingsQuery } from '@/features/attendance/hooks/use-attendance-settings';
import { useCandidatesQuery } from '@/features/recruitment/hooks/use-recruitment';

function formatDate(dateString?: string | Date | null): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getProbationEndDate(joiningDate?: string | Date, probationPeriod?: string | null): string {
  if (!joiningDate) return '-';
  const join = new Date(joiningDate);
  if (isNaN(join.getTime())) return '-';

  let monthsToAdd = 3; // Default 3 months
  if (probationPeriod) {
    const p = probationPeriod.toLowerCase();
    if (p.includes('1 month') || p.includes('30 days')) monthsToAdd = 1;
    else if (p.includes('2 month') || p.includes('60 days')) monthsToAdd = 2;
    else if (p.includes('3 month') || p.includes('90 days')) monthsToAdd = 3;
    else if (p.includes('6 month') || p.includes('180 days')) monthsToAdd = 6;
    else if (p.includes('1 year') || p.includes('12 month')) monthsToAdd = 12;
    else {
      const match = p.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        monthsToAdd = num > 12 ? Math.round(num / 30) : num;
      }
    }
  }

  const end = new Date(join);
  end.setMonth(end.getMonth() + monthsToAdd);
  end.setDate(end.getDate() - 1);

  return end.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const empId = id ? parseInt(id, 10) : undefined;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: currentUser, refreshProfile } = useAuth();
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'pay_policy' | 'onboarding' | 'documents' | 'history'>(
    tabParam === 'onboarding'
      ? 'onboarding'
      : tabParam === 'documents'
      ? 'documents'
      : tabParam === 'pay' || tabParam === 'policies'
      ? 'pay_policy'
      : 'overview',
  );

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab === 'onboarding') {
      setActiveTab('onboarding');
    } else if (currentTab === 'documents') {
      setActiveTab('documents');
    } else if (currentTab === 'pay' || currentTab === 'policies') {
      setActiveTab('pay_policy');
    }
  }, [searchParams]);

  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  // Deactivate form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [terminationDate, setTerminationDate] = useState(todayStr);
  const [deactivationReason, setDeactivationReason] = useState('Resigned');
  const [deactivationNotes, setDeactivationNotes] = useState('');
  const [deactivationError, setDeactivationError] = useState<string | null>(null);

  // TanStack queries
  const { data: employee, isLoading, error, refetch: refetchEmployee } = useEmployeeDetailQuery(empId);

  useEffect(() => {
    if (isDeactivateModalOpen && employee) {
      const joinStr = employee.joining_date
        ? new Date(employee.joining_date).toISOString().split('T')[0]
        : null;
      if (joinStr && joinStr > todayStr) {
        setTerminationDate(joinStr);
      } else {
        setTerminationDate(todayStr);
      }
      setDeactivationError(null);
    }
  }, [isDeactivateModalOpen, employee, todayStr]);

  useEffect(() => {
    if (employee?.status === 'Onboarding' && !searchParams.get('tab')) {
      setActiveTab('onboarding');
    }
  }, [employee?.status, searchParams]);
  const { data: historyList, isLoading: isHistoryLoading } = useEmployeeHistoryQuery(empId);
  const { data: warningData } = useDeactivateWarningQuery(isDeactivateModalOpen ? empId : undefined);
  const { data: deactivationReasonsLookup } = useLookupsQuery('deactivation_reason');

  const deactivateMutation = useDeactivateEmployeeMutation();
  const { data: attendanceSettings } = useAttendanceSettingsQuery();
  const { data: candidatesData } = useCandidatesQuery({});

  const assignedShiftId = employee ? attendanceSettings?.employee_shifts?.[String(employee.emp_id)] : undefined;
  const assignedShift = attendanceSettings?.shifts?.find((s) => String(s.shift_id) === String(assignedShiftId));
  const currentShiftDisplay = assignedShift
    ? `${assignedShift.shift_name} · ${assignedShift.start_time}–${assignedShift.end_time}`
    : 'General · 09:30–18:30';

  const recruitedCandidate = candidatesData?.items?.find(
    (c) => c.converted_to_emp_id === employee?.emp_id,
  );

  const isSelf = currentUser?.emp_id === empId;
  const isInactive = employee?.status === 'Inactive';
  const isOnboarding = employee?.status === 'Onboarding';

  // Activation queries & mutations
  const { data: activationStatus } = useEmployeeActivationStatusQuery(
    isOnboarding ? empId : undefined,
  );
  const activateMutation = useActivateEmployeeMutation();
  const resendLoginMutation = useResendEmployeeLoginMutation();
  const [activatedResult, setActivatedResult] = useState<ActivateEmployeeResult | null>(null);
  const [isActivatedModalOpen, setIsActivatedModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>('Account Activated!');
  const [modalDescription, setModalDescription] = useState<string | undefined>(undefined);

  const [isActivateAccountModalOpen, setIsActivateAccountModalOpen] = useState(false);

  const handleOpenActivateModal = () => {
    if (!empId || !activationStatus?.can_activate) return;
    setIsActivateAccountModalOpen(true);
  };

  const handleConfirmActivateAccount = async () => {
    if (!empId) return;
    try {
      const res = await activateMutation.mutateAsync(empId);
      setIsActivateAccountModalOpen(false);
      setActivatedResult(res);
      setModalTitle('Account Activated!');
      setModalDescription(`${employee?.name || 'The employee'} has been activated and login credentials are ready.`);
      setIsActivatedModalOpen(true);
      refetchEmployee();
    } catch (err: any) {
      alert(err.detail || err.message || 'Failed to activate account.');
    }
  };

  const handleResendLogin = async () => {
    if (!empId) return;
    try {
      const res = await resendLoginMutation.mutateAsync(empId);
      setActivatedResult(res);
      setModalTitle('Login Credentials Resent!');
      setModalDescription(`A new temporary password has been generated for ${employee?.name || 'the employee'}. It works once and will be required to be renewed upon next login.`);
      setIsActivatedModalOpen(true);
    } catch (err: any) {
      alert(err.detail || err.message || 'Failed to resend login credentials.');
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!empId) return;
    setDeactivationError(null);

    if (employee?.joining_date) {
      const joinStr = new Date(employee.joining_date).toISOString().split('T')[0];
      if (terminationDate < joinStr) {
        setDeactivationError(`Termination date cannot be earlier than joining date (${joinStr}).`);
        return;
      }
    }

    if (deactivationReason.toLowerCase() === 'other' && !deactivationNotes.trim()) {
      setDeactivationError('Please provide notes when Reason is "Other"');
      return;
    }

    try {
      await deactivateMutation.mutateAsync({
        id: empId,
        data: {
          termination_date: terminationDate,
          reason: deactivationReason,
          notes: deactivationNotes.trim() || undefined,
        },
      });
      setIsDeactivateModalOpen(false);
    } catch (err: any) {
      setDeactivationError(err.detail || err.message || 'Failed to deactivate employee');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Employee Profile" fluid>
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading employee profile...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !employee) {
    return (
      <AdminLayout title="Employee Profile" fluid>
        <div className="py-20 text-center max-w-md mx-auto">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Employee Not Found</h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            The requested employee could not be found or has been deleted.
          </p>
          <Link
            to="/admin/employees"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Employees
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${employee.name} - Profile`} fluid>
      <div className="space-y-6 pb-12">
        {/* Navigation Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/admin/employees')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Employees
          </button>
          {currentUser?.access?.can_manage_organization && employee.emp_id !== currentUser.emp_id && <ResetEmployeePasswordButton empId={employee.emp_id} />}
        </div>

        {/* Top Profile Card Header (Matching Reference Screen 1) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              <Avatar
                name={employee.name}
                src={employee.profile_picture_url}
                size={76}
                className="rounded-2xl border-2 border-white shadow-xs shrink-0 ring-4 ring-slate-100"
              />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{employee.name}</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                      isInactive
                        ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                        : isOnboarding
                        ? 'bg-purple-50 text-purple-700 border-purple-200/80'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isInactive
                          ? 'bg-rose-500'
                          : isOnboarding
                          ? 'bg-purple-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    {employee.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="font-mono text-slate-500 font-medium">
                    EMP-{String(employee.emp_id).padStart(4, '0')}
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-500 font-medium">
                    {employee.role?.role_name || 'Designation Unassigned'}
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-500 font-medium">
                    {employee.departments && employee.departments.length > 0
                      ? employee.departments.map((d) => d.name).join(', ')
                      : employee.department?.name || 'Department Unassigned'}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end pt-2 md:pt-0">
              {/* Activate Account Button (BFD Screen 10 / Figure 8) */}
              {isOnboarding && (
                <div className="relative group">
                  <button
                    type="button"
                    disabled={!activationStatus?.can_activate || activateMutation.isPending}
                    onClick={handleOpenActivateModal}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition shadow-xs ${
                      activationStatus?.can_activate
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer ring-2 ring-emerald-500/20'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    {activateMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : activationStatus?.can_activate ? (
                      <Sparkles className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    <span>Activate Account</span>
                  </button>

                  {!activationStatus?.can_activate && (
                    <div className="absolute right-0 top-12 w-72 p-3 bg-slate-900 text-white text-2xs rounded-xl shadow-xl z-30 hidden group-hover:block pointer-events-none animate-in fade-in duration-150">
                      <p className="font-bold text-amber-300 mb-1">Upload required documents to activate:</p>
                      {activationStatus?.missing_documents && activationStatus.missing_documents.length > 0 ? (
                        <ul className="list-disc pl-3.5 space-y-0.5 text-slate-300">
                          {activationStatus.missing_documents.map((m, idx) => (
                            <li key={idx}>{m}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-300">Checking document checklist...</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Resend Login Button (BFD Part 7: Temporary password: Works once and expires after 7 days. The Admin can click "Resend login" to send a new one.) */}
              {!isOnboarding && !isInactive && (
                <button
                  type="button"
                  disabled={resendLoginMutation.isPending}
                  onClick={handleResendLogin}
                  title="Generate a new temporary password and resend login"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
                >
                  {resendLoginMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>Resend login</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs cursor-pointer"
              >
                Edit
              </button>

              {isInactive ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-200/60"
                >
                  Deactivated
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDeactivateModalOpen(true)}
                  disabled={isSelf}
                  title={isSelf ? 'Cannot deactivate your own account' : 'Deactivate employee'}
                  className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isSelf
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                  }`}
                >
                  Deactivate Employee
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Deactivation Banner (Matching Reference Screen 1) */}
        {isInactive && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200/90 p-4 px-5 flex items-start sm:items-center gap-3.5 text-rose-800 animate-in fade-in">
            <div className="p-2 rounded-xl bg-rose-100/80 text-rose-700 shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-900">
                Deactivated on{' '}
                {employee.termination_date
                  ? new Date(employee.termination_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : employee.exit_date
                  ? new Date(employee.exit_date).toLocaleDateString()
                  : 'N/A'}
                . Reason: {employee.deactivation_reason || 'Resigned'}
              </p>
              {employee.deactivation_notes && (
                <p className="text-xs text-rose-700/90 mt-0.5 italic">
                  &ldquo;{employee.deactivation_notes}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab Navigation (Reference Screen 12 Marker 1: Overview, Pay & Policies, Onboarding, Documents, History) */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 -mb-px overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>Overview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'attendance'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>Attendance</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pay_policy')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'pay_policy'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>Pay & Policies</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('onboarding')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'onboarding'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>Onboarding</span>
              {isOnboarding && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activationStatus?.can_activate
                    ? '✓'
                    : Math.max(
                        1,
                        (activationStatus?.missing_documents?.length || 0) +
                          (activationStatus?.is_details_completed ? 0 : 1),
                      )}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'documents'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>Documents</span>
              {isOnboarding && (
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-slate-100 text-slate-700">
                  {activationStatus?.completed_required ?? 0}/{activationStatus?.total_required ?? 7}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>History</span>
              {historyList && historyList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-2xs font-bold bg-slate-100 text-slate-700">
                  {historyList.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* ========================================================================= */}
        {/* OVERVIEW TAB CONTENT (Reference Screen 12)                                */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Card 1: Personal Information (Marker 2) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 md:p-8">
              <h3 className="text-base font-bold text-slate-900 mb-6">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8 text-sm">
                {/* Column 1 */}
                <div className="space-y-5">
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Full Name</span>
                    <p className="mt-1 font-semibold text-slate-900">{employee.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Blood Group</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {typeof employee.blood_group === 'object'
                        ? (employee.blood_group as any)?.label
                        : employee.blood_group || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Office Email</span>
                    <p className="mt-1 font-semibold text-slate-900 truncate" title={employee.office_email || employee.email}>
                      {employee.office_email || employee.email || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Current Address</span>
                    <p className="mt-1 font-semibold text-slate-900 leading-relaxed">{employee.address || '-'}</p>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-5">
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Date of Birth</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {(employee as any).dob
                        ? formatDate((employee as any).dob)
                        : employee.birth_date
                        ? formatDate(employee.birth_date)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Phone</span>
                    <p className="mt-1 font-semibold text-slate-900">{employee.mob || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Marital Status</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {typeof (employee as any).marital_status === 'object'
                        ? (employee as any).marital_status?.label
                        : (employee as any).marital_status || 'Single'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Permanent Address</span>
                    <p className="mt-1 font-semibold text-slate-900 leading-relaxed">
                      {(employee as any).permanent_address || 'Same as current'}
                    </p>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="space-y-5">
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Gender</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {typeof employee.gender === 'object'
                        ? (employee.gender as any)?.label
                        : employee.gender || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Personal Email</span>
                    <p className="mt-1 font-semibold text-slate-900 truncate" title={employee.personal_email || ''}>
                      {employee.personal_email || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">PAN</span>
                    <p className="mt-1 font-semibold text-slate-900 uppercase font-mono">{(employee as any).pan || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Emergency Contact (Marker 3) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 md:p-8">
              <h3 className="text-base font-bold text-slate-900 mb-6">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block font-normal">Name</span>
                  <p className="mt-1 font-semibold text-slate-900">{employee.emergency_contact_name || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-normal">Relation</span>
                  <p className="mt-1 font-semibold text-slate-900">{employee.emergency_contact_relation || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-normal">Phone</span>
                  <p className="mt-1 font-semibold text-slate-900">
                    {employee.emergency_contact_number || (employee as any).emergency_contact_phone || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Employment (Marker 4) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 md:p-8">
              <h3 className="text-base font-bold text-slate-900 mb-6">Employment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8 text-sm">
                {/* Column 1 */}
                <div className="space-y-5">
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Department(s)</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {employee.departments && employee.departments.length > 0
                        ? employee.departments.map((d: any) => d.name).join(', ')
                        : employee.department?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Employment Type</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {typeof employee.employment_type === 'object'
                        ? (employee.employment_type as any)?.label
                        : employee.employment_type || 'Full-time'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Shift</span>
                    <p className="mt-1 font-semibold text-slate-900">{currentShiftDisplay}</p>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-5">
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Designation</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {(employee as any).designation?.title || employee.role?.role_name || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Joining Date</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {employee.joining_date ? formatDate(employee.joining_date) : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Work Location</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {(employee as any).work_location?.name || (employee as any).work_location || 'Ahmedabad Office'}
                    </p>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="space-y-5">
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Reporting Manager</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {employee.manager ? (
                        <Link
                          to={`/admin/employees/${employee.manager.emp_id || (employee as any).reporting_manager}`}
                          className="text-blue-600 hover:underline"
                        >
                          {employee.manager.name}
                        </Link>
                      ) : (employee as any).manager_name ? (
                        <span className="text-blue-600">{(employee as any).manager_name}</span>
                      ) : (
                        '-'
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Probation ends</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {getProbationEndDate(employee.joining_date, employee.probation_period) || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-normal">Recruited from</span>
                    <p className="mt-1 font-semibold text-slate-900">
                      {recruitedCandidate ? (
                        <Link
                          to={`/admin/recruitment/candidates/${recruitedCandidate.candidate_id}`}
                          className="text-blue-600 hover:underline font-mono"
                        >
                          {recruitedCandidate.candidate_code || `CAN-${String(recruitedCandidate.candidate_id).padStart(4, '0')}`}
                        </Link>
                      ) : (employee as any).recruited_from ? (
                        <span className="text-blue-600 font-mono">{(employee as any).recruited_from}</span>
                      ) : (
                        '-'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ATTENDANCE TAB CONTENT                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'attendance' && employee && (
          <EmployeeAttendanceTab
            employeeId={employee.emp_id}
            employeeName={employee.name}
          />
        )}

        {/* ========================================================================= */}
        {/* PAY & POLICIES TAB CONTENT                                                */}
        {/* ========================================================================= */}
        {activeTab === 'pay_policy' && employee && (
          <div className="space-y-6">
            {/* Top Action Header */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-2xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                    Compensation & Entitlements
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Pay & Leave Policies</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Salary compensation, statutory PF, disbursement account, and assigned leave entitlements
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Compensation & Policies
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Base Compensation */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Monthly Compensation</h4>
                    <p className="text-2xs text-slate-400">Fixed salary and estimated CTC</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                      Base Salary
                    </span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
                      ₹{Number(employee.salary || 0).toLocaleString()}
                      <span className="text-2xs font-normal text-slate-400 ml-1">/ mo</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                      Annual CTC
                    </span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
                      ₹{(Number(employee.salary || 0) * 12).toLocaleString()}
                      <span className="text-2xs font-normal text-slate-400 ml-1">/ yr</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 text-xs text-slate-600">
                    <span className="text-2xs font-semibold uppercase text-slate-400">Overtime:</span>
                    <span className={`font-semibold text-2xs px-2 py-0.5 rounded-full ${
                      employee.ot_eligible
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {employee.ot_eligible ? 'Eligible for OT' : 'Not Eligible'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Statutory Compliance (PF) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Provident Fund (PF)</h4>
                      <p className="text-2xs text-slate-400">EPFO registration & monthly deduction</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold ${
                      employee.pf_applicable || Number(employee.pf) > 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {employee.pf_applicable || Number(employee.pf) > 0 ? 'Enrolled' : 'Exempt'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                      Monthly Contribution
                    </span>
                    <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono">
                      ₹{Number(employee.pf || 0).toLocaleString()}
                      <span className="text-2xs font-normal text-slate-400 ml-1">/ mo</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                      Universal Account Number (UAN)
                    </span>
                    <p className="font-mono font-semibold text-slate-800 text-xs mt-1">
                      {employee.uan || (
                        <span className="text-slate-400 font-normal italic">Not configured</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Banking & Disbursement */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Disbursement & Banking</h4>
                    <p className="text-2xs text-slate-400">Account destination for salary payouts</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-2xs uppercase font-semibold">Bank Name</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                      {employee.bank_name || <span className="text-slate-400 font-normal italic">Not specified</span>}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-2xs uppercase font-semibold">Account Number</span>
                    <span className="font-mono font-semibold text-slate-800 mt-0.5 block truncate">
                      {employee.account_number || <span className="text-slate-400 font-normal italic">Not specified</span>}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50">
                    <span className="text-slate-400 block text-2xs uppercase font-semibold">IFSC Code</span>
                    <span className="font-mono font-semibold text-slate-800 uppercase mt-0.5 block">
                      {employee.ifsc_code || <span className="text-slate-400 font-normal italic">Not specified</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Leave (Leave BFD 4.2 / R&O BFD 9: Leave Policy and Opening Balance) */}
              <EmployeeLeaveCard
                empId={employee.emp_id}
                employeeName={employee.name}
                joiningDate={employee.joining_date as any}
                isAdmin={Boolean(currentUser?.access?.can_manage_organization)}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ONBOARDING CHECKLIST TAB CONTENT (BFD Section 8)                          */}
        {/* ========================================================================= */}
        {activeTab === 'onboarding' && employee && (
          <OnboardingChecklistTab
            employee={employee as any}
            activationStatus={activationStatus}
            onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
            onOpenActivateModal={handleOpenActivateModal}
            onSwitchToDocuments={() => setActiveTab('documents')}
          />
        )}

        {/* ========================================================================= */}
        {/* DOCUMENTS TAB CONTENT (Placeholder per user instructions)                 */}
        {/* ========================================================================= */}
        {activeTab === 'documents' && employee && (
          <EmployeeDocumentsTab
            employee={employee as any}
            onOpenActivateModal={handleOpenActivateModal}
            onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
            activationStatus={activationStatus}
          />
        )}

        {/* ========================================================================= */}
        {/* HISTORY TAB CONTENT                                                       */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Growth & Milestone History</h3>
                  <p className="text-xs text-slate-500">Record of promotions, transfers, revisions, and status changes</p>
                </div>
              </div>
            </div>

            {isHistoryLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading history milestones...</p>
              </div>
            ) : !historyList || historyList.length === 0 ? (
              <div className="py-16 text-center max-w-sm mx-auto">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No History Milestones Yet</p>
                <p className="text-xs text-slate-400 mt-1">Changes made to role, departments, or compensation will automatically appear here.</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {historyList.map((item: any) => {
                  let badgeBg = 'bg-blue-500';
                  let icon = <CheckCircle2 className="w-3.5 h-3.5 text-white" />;

                  if (item.event_type === 'HIRED') {
                    badgeBg = 'bg-emerald-500';
                    icon = <UserPlus className="w-3.5 h-3.5 text-white" />;
                  } else if (item.event_type === 'PROMOTION') {
                    badgeBg = 'bg-purple-500';
                    icon = <Sparkles className="w-3.5 h-3.5 text-white" />;
                  } else if (item.event_type === 'TRANSFER') {
                    badgeBg = 'bg-blue-500';
                    icon = <Building2 className="w-3.5 h-3.5 text-white" />;
                  } else if (item.event_type === 'SALARY_REVISION') {
                    badgeBg = 'bg-amber-500';
                    icon = <Wallet className="w-3.5 h-3.5 text-white" />;
                  } else if (item.event_type === 'DEACTIVATED') {
                    badgeBg = 'bg-rose-500';
                    icon = <UserX className="w-3.5 h-3.5 text-white" />;
                  }

                  return (
                    <div key={item.history_id} className="relative group">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[30px] top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs ${badgeBg}`}
                      >
                        {icon}
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-50 transition space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>{item.title}</span>
                            <span className="text-2xs px-2 py-0.5 rounded-full font-bold bg-white text-slate-600 border border-slate-200">
                              {item.event_type}
                            </span>
                          </h4>
                          <span className="text-xs text-slate-400 font-medium">
                            {new Date(item.effective_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {item.reason && (
                          <p className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-500">Reason: </span>
                            {item.reason}
                          </p>
                        )}

                        {item.notes && (
                          <p className="text-xs text-slate-500 italic bg-white/70 p-2 rounded-xl border border-slate-100">
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-2xs text-slate-400 pt-1">
                          {item.role && <span>Role: <strong className="text-slate-600">{item.role.role_name}</strong></span>}
                          {item.salary && <span>Salary: <strong className="text-slate-600 font-mono">₹{Number(item.salary).toLocaleString()}</strong></span>}
                          {item.manager && <span>Manager: <strong className="text-slate-600">{item.manager.name}</strong></span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DEACTIVATE EMPLOYEE MODAL (Matching Reference Screens 4 & 5)               */}
      {/* ========================================================================= */}
      {isDeactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 md:p-8 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Deactivate Employee</h3>
                  <p className="text-xs text-slate-500">Deactivation stops login and marks record as inactive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeactivateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee Preview Strip */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3.5">
              <Avatar
                name={employee.name}
                src={employee.profile_picture_url}
                size={44}
                className="rounded-xl border border-white shrink-0"
              />
              <div>
                <p className="font-bold text-slate-900 text-sm">{employee.name}</p>
                <p className="text-xs text-slate-500">
                  EMP #{employee.emp_id} &bull; {employee.role?.role_name || 'Employee'}
                </p>
              </div>
            </div>

            {/* Direct Reports Warning Banner (Reference Screens 4 & 5) */}
            {warningData && warningData.direct_reports_count > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">
                    {warningData.direct_reports_count} {warningData.direct_reports_count === 1 ? 'employee reports' : 'employees report'} to {employee.name}.
                  </span>
                  <p className="mt-1 text-amber-800">
                    Please give them a new Reporting Manager after deactivating.
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {warningData.direct_reports.map((dr) => (
                      <span key={dr.emp_id} className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold text-2xs">
                        {dr.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Error */}
            {deactivationError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {deactivationError}
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Termination Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={terminationDate}
                  min={employee?.joining_date ? new Date(employee.joining_date).toISOString().split('T')[0] : undefined}
                  onChange={(e) => {
                    setTerminationDate(e.target.value);
                    setDeactivationError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
                <span className="text-2xs text-slate-400 mt-1 block">
                  {employee?.joining_date && new Date(employee.joining_date).toISOString().split('T')[0] > todayStr
                    ? `Must be on or after joining date (${new Date(employee.joining_date).toISOString().split('T')[0]}).`
                    : 'Defaults to today (last working day).'}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reason for Deactivation <span className="text-rose-500">*</span>
                </label>
                <select
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition font-medium text-slate-800"
                >
                  {deactivationReasonsLookup && deactivationReasonsLookup.length > 0 ? (
                    deactivationReasonsLookup.map((r) => (
                      <option key={r.id} value={r.label}>
                        {r.label}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Resigned">Resigned</option>
                      <option value="Terminated">Terminated</option>
                      <option value="Contract ended">Contract ended</option>
                      <option value="Retired">Retired</option>
                      <option value="Absconded">Absconded</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Notes {deactivationReason.toLowerCase() === 'other' && <span className="text-rose-500">* (Required)</span>}
                </label>
                <textarea
                  rows={3}
                  value={deactivationNotes}
                  onChange={(e) => setDeactivationNotes(e.target.value)}
                  placeholder={
                    deactivationReason.toLowerCase() === 'other'
                      ? 'Please explain the reason for deactivation...'
                      : 'Additional notes or handover details (optional)...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeactivateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={deactivateMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 transition shadow-sm disabled:opacity-50"
              >
                {deactivateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Employee Account Modal (BFD Screen 11 / Image 4) */}
      {employee && (
        <ActivateEmployeeAccountModal
          isOpen={isActivateAccountModalOpen}
          onClose={() => setIsActivateAccountModalOpen(false)}
          employee={employee as any}
          onConfirm={handleConfirmActivateAccount}
          isSubmitting={activateMutation.isPending}
        />
      )}

      {/* Account Activated / Resend Login Modal */}
      <AccountActivatedModal
        isOpen={isActivatedModalOpen}
        onClose={() => {
          setIsActivatedModalOpen(false);
          refetchEmployee();
        }}
        result={activatedResult}
        employeeName={employee?.name}
        title={modalTitle}
        description={modalDescription}
      />

      {/* Edit Profile Modal (Employee can edit personal info only) */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        employee={employee}
        isAdmin={Boolean(currentUser?.access?.can_manage_organization)}
        onSuccess={async () => {
          refetchEmployee();
          if (isSelf) {
            await refreshProfile();
          }
        }}
      />
    </AdminLayout>
  );
};
