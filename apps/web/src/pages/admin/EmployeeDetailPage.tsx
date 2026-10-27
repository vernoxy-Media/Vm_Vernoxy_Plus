import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { Avatar } from '../../components/Avatar';
import {
  useEmployeeDetailQuery,
  useDeactivateWarningQuery,
  useDeactivateEmployeeMutation,
  useEmployeeHistoryQuery,
} from '../../hooks/use-organization';
import { useLookupsQuery } from '../../hooks/use-master-data';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Heart,
  AlertTriangle,
  UserX,
  History,
  FileText,
  UserCheck,
  CheckCircle2,
  Edit2,
  Loader2,
  Clock,
  Wallet,
  Sparkles,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react';
import { EmployeeDocumentsTab } from './EmployeeDocumentsTab';

function formatDuration(startDate: Date | string, endDate?: Date | string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  if (isNaN(start.getTime())) return '-';

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 'Future joining date';

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = (diffDays % 365) % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mo' : 'mos'}`);
  if (parts.length === 0 || (years === 0 && days > 0)) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }

  return parts.join(', ');
}

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const empId = id ? parseInt(id, 10) : undefined;
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'history'>('overview');
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  // Deactivate form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [terminationDate, setTerminationDate] = useState(todayStr);
  const [deactivationReason, setDeactivationReason] = useState('Resigned');
  const [deactivationNotes, setDeactivationNotes] = useState('');
  const [deactivationError, setDeactivationError] = useState<string | null>(null);

  // TanStack queries
  const { data: employee, isLoading, error } = useEmployeeDetailQuery(empId);
  const { data: historyList, isLoading: isHistoryLoading } = useEmployeeHistoryQuery(empId);
  const { data: warningData } = useDeactivateWarningQuery(isDeactivateModalOpen ? empId : undefined);
  const { data: deactivationReasonsLookup } = useLookupsQuery('deactivation_reason');

  const deactivateMutation = useDeactivateEmployeeMutation();

  const isSelf = currentUser?.emp_id === empId;
  const isInactive = employee?.status === 'Inactive';

  const handleConfirmDeactivate = async () => {
    if (!empId) return;
    setDeactivationError(null);

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
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                      isInactive
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isInactive ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                    {employee.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-500 font-medium">
                  <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                    EMP #{employee.emp_id}
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-700 font-medium">
                    {employee.role?.role_name || 'Designation Unassigned'}
                  </span>
                  <span>&bull;</span>
                  {/* Multi-department tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {employee.departments && employee.departments.length > 0 ? (
                      employee.departments.map((dept) => (
                        <span
                          key={dept.dep_id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/50 text-xs font-medium"
                        >
                          <Building2 className="w-3 h-3 text-blue-500" />
                          {dept.name}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {employee.department?.name || `Department #${employee.dep_id}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end pt-2 md:pt-0">
              <Link
                to={`/admin/employees/${employee.emp_id}/edit`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Profile
              </Link>

              {isInactive ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-200/60"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Deactivated
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDeactivateModalOpen(true)}
                  disabled={isSelf}
                  title={isSelf ? 'Cannot deactivate your own account' : 'Deactivate employee'}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isSelf
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100 shadow-2xs'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5 text-rose-600" />
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

        {/* Tab Navigation (Matching Reference Screen 1: Overview, Documents, History) */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'documents'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 text-slate-400" />
              Documents
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <History className="w-4 h-4 text-slate-400" />
              History
              {historyList && historyList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-2xs font-bold bg-slate-100 text-slate-700">
                  {historyList.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* ========================================================================= */}
        {/* OVERVIEW TAB CONTENT (Reference Screen 1)                                */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Personal Information Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Personal Information</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Gender
                  </label>
                  <p className="mt-1 font-semibold text-slate-800">
                    {employee.gender?.label || 'Not specified'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Mobile Phone
                  </label>
                  <p className="mt-1 font-semibold text-slate-800 font-mono flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {employee.mob || 'Not specified'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Personal Email
                  </label>
                  <p className="mt-1 font-semibold text-slate-800 truncate" title={employee.personal_email || ''}>
                    {employee.personal_email || 'Not specified'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Office Email
                  </label>
                  <p className="mt-1 font-semibold text-slate-800 truncate" title={employee.office_email || employee.email}>
                    {employee.office_email || employee.email}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Birth Date
                  </label>
                  <p className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {employee.birth_date
                      ? new Date(employee.birth_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Not specified'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Blood Group
                  </label>
                  <p className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    {employee.blood_group || 'Not specified'}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Address
                  </label>
                  <p className="mt-1 font-medium text-slate-700 flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span>{employee.address || 'No residential address specified.'}</span>
                  </p>
                </div>

                <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Emergency Contact
                  </label>
                  {employee.emergency_contact_name || employee.emergency_contact_number ? (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{employee.emergency_contact_name || 'Emergency Contact'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {employee.emergency_contact_relation ? `${employee.emergency_contact_relation} • ` : ''}
                          <span className="font-mono">{employee.emergency_contact_number}</span>
                        </p>
                      </div>
                      {employee.emergency_contact_number && (
                        <a
                          href={`tel:${employee.emergency_contact_number}`}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 transition"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No emergency contact information provided.</p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Job Information Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Job Information</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Primary Department
                  </label>
                  <p className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {employee.department?.name || `Department #${employee.dep_id}`}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Designation (Role)
                  </label>
                  <p className="mt-1 font-semibold text-slate-800">
                    {employee.role?.role_name || 'Unassigned'}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    All Assigned Departments
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {employee.departments && employee.departments.length > 0 ? (
                      employee.departments.map((d) => (
                        <span
                          key={d.dep_id}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold ${
                            d.is_primary
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                              : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                          }`}
                        >
                          <Building2 className="w-3 h-3" />
                          {d.name}
                          {d.is_primary && (
                            <span className="text-2xs uppercase px-1 py-0.2 rounded bg-blue-100 text-blue-800 font-bold ml-1">
                              Primary
                            </span>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">
                        {employee.department?.name || 'Department unassigned'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Reporting Manager
                  </label>
                  <p className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                    {employee.manager ? employee.manager.name : 'None (Top-level Executive)'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Employment Type
                  </label>
                  <p className="mt-1 font-semibold text-slate-800">
                    {employee.employment_type?.label || 'Full-time'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Joining Date
                  </label>
                  <p className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(employee.joining_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Time in Company
                  </label>
                  <p className="mt-1 font-semibold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    {formatDuration(employee.joining_date, employee.termination_date || employee.exit_date)}
                  </p>
                </div>

                {/* If inactive, show Termination info */}
                {isInactive && (
                  <>
                    <div className="pt-2 border-t border-slate-100">
                      <label className="text-xs font-semibold text-rose-500 uppercase tracking-wider block">
                        Termination Date
                      </label>
                      <p className="mt-1 font-bold text-rose-800">
                        {employee.termination_date
                          ? new Date(employee.termination_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <label className="text-xs font-semibold text-rose-500 uppercase tracking-wider block">
                        Deactivation Reason
                      </label>
                      <p className="mt-1 font-bold text-rose-800">
                        {employee.deactivation_reason || 'Resigned'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. Compensation & Statutory Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-6 sm:col-span-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Compensation & Statutory</h3>
                    <p className="text-xs text-slate-400">Strictly confidential employee payroll information</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Base Salary
                  </label>
                  <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                    ₹{Number(employee.salary || 0).toLocaleString()}
                    <span className="text-xs text-slate-400 font-normal ml-1">/ month</span>
                  </p>
                  <p className="text-2xs text-slate-400 mt-2">Annualized CTC approx: ₹{(Number(employee.salary || 0) * 12).toLocaleString()}</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Provident Fund (PF) Deduction
                  </label>
                  <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                    ₹{Number(employee.pf || 0).toLocaleString()}
                    <span className="text-xs text-slate-400 font-normal ml-1">/ month</span>
                  </p>
                  <p className="text-2xs text-slate-400 mt-2">Statutory employee provident fund contribution</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DOCUMENTS TAB CONTENT (Placeholder per user instructions)                 */}
        {/* ========================================================================= */}
        {activeTab === 'documents' && employee && (
          <EmployeeDocumentsTab employee={employee as any} />
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
                  onChange={(e) => setTerminationDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
                <span className="text-2xs text-slate-400 mt-1 block">Defaults to today (last working day).</span>
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
    </AdminLayout>
  );
};
