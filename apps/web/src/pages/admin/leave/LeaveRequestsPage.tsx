import React, { useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Sliders,
  X,
  Search,
  Calendar,
  Paperclip,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
} from 'lucide-react';
import {
  useAdminLeaveRequestsQuery,
  useLeaveRequestDetailsQuery,
  useApproveLeaveRequestMutation,
  useRejectLeaveRequestMutation,
  useDecideLeaveCancellationMutation,
  useAdminCancelLeaveMutation,
  useAddLeaveForEmployeeMutation,
  useAdjustLeaveBalanceMutation,
  useLeaveTypesQuery,
} from '../../../hooks/use-leave';
import { useEmployeeOptionsQuery } from '../../../hooks/use-organization';

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-cyan-600',
];

function getInitials(name?: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarBg(name?: string): string {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export interface LeaveRequestsPageProps {
  hideBreadcrumb?: boolean;
}

export const LeaveRequestsPage: React.FC<LeaveRequestsPageProps> = ({ hideBreadcrumb = false }) => {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'All'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data } = useAdminLeaveRequestsQuery(activeTab, searchQuery);
  const { data: allTypes = [] } = useLeaveTypesQuery();

  // Review Modal State
  const [reviewRequestId, setReviewRequestId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');
  const [cancellationRemarks, setCancellationRemarks] = useState('');
  const [adminCancelReason, setAdminCancelReason] = useState('');

  // Add for employee modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    emp_id: 1,
    leave_type_id: 1,
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    duration: 'FULL_DAY',
    reason: '',
  });

  // Adjust balance modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    emp_id: 1,
    leave_type_id: 1,
    direction: 'CREDIT' as 'CREDIT' | 'DEBIT',
    days: 1.0,
    note: '',
  });

  // Employee list for dropdowns
  const { data: rawEmployees = [], isLoading: isEmployeesLoading } = useEmployeeOptionsQuery();
  const employees = React.useMemo(() => {
    if (Array.isArray(rawEmployees)) return rawEmployees;
    return (rawEmployees as any)?.items || (rawEmployees as any)?.data || [];
  }, [rawEmployees]);

  React.useEffect(() => {
    if (employees.length > 0) {
      setAddForm((prev) => {
        const exists = employees.some((e: any) => e.emp_id === prev.emp_id);
        return exists ? prev : { ...prev, emp_id: employees[0].emp_id };
      });
      setAdjustForm((prev) => {
        const exists = employees.some((e: any) => e.emp_id === prev.emp_id);
        return exists ? prev : { ...prev, emp_id: employees[0].emp_id };
      });
    }
  }, [employees]);

  React.useEffect(() => {
    if (allTypes.length > 0) {
      setAddForm((prev) => {
        const exists = allTypes.some((t) => t.leave_type_id === prev.leave_type_id);
        return exists ? prev : { ...prev, leave_type_id: allTypes[0].leave_type_id };
      });
      const trackedTypes = allTypes.filter((t) => t.balance_tracked);
      if (trackedTypes.length > 0) {
        setAdjustForm((prev) => {
          const exists = trackedTypes.some((t) => t.leave_type_id === prev.leave_type_id);
          return exists ? prev : { ...prev, leave_type_id: trackedTypes[0].leave_type_id };
        });
      }
    }
  }, [allTypes]);

  const { data: detailsData } = useLeaveRequestDetailsQuery(reviewRequestId || undefined);

  const approveMut = useApproveLeaveRequestMutation();
  const rejectMut = useRejectLeaveRequestMutation();
  const decideCancelMut = useDecideLeaveCancellationMutation();
  const adminCancelMut = useAdminCancelLeaveMutation();
  const addLeaveMut = useAddLeaveForEmployeeMutation();
  const adjustMut = useAdjustLeaveBalanceMutation();

  const handleApprove = async () => {
    if (!reviewRequestId) return;
    try {
      await approveMut.mutateAsync({ id: reviewRequestId, remarks });
      setReviewRequestId(null);
      setRemarks('');
    } catch (err: any) {
      alert(err?.detail || err?.message || 'Failed to approve request.');
    }
  };

  const handleReject = async () => {
    if (!reviewRequestId) return;
    if (!remarks.trim()) {
      alert('Remarks are required when rejecting a leave request.');
      return;
    }
    try {
      await rejectMut.mutateAsync({ id: reviewRequestId, remarks });
      setReviewRequestId(null);
      setRemarks('');
    } catch (err: any) {
      alert(err?.detail || err?.message || 'Failed to reject request.');
    }
  };

  const handleDecideCancel = async (agree: boolean) => {
    if (!reviewRequestId) return;
    if (!cancellationRemarks.trim()) {
      alert('Remarks are required.');
      return;
    }
    try {
      await decideCancelMut.mutateAsync({
        id: reviewRequestId,
        agree,
        remarks: cancellationRemarks,
      });
      setReviewRequestId(null);
      setCancellationRemarks('');
    } catch (err: any) {
      alert(err?.detail || err?.message || 'Failed to process cancellation.');
    }
  };

  const handleAdminCancel = async () => {
    if (!reviewRequestId) return;
    if (!adminCancelReason.trim()) {
      alert('Reason is required.');
      return;
    }
    try {
      await adminCancelMut.mutateAsync({
        id: reviewRequestId,
        reason: adminCancelReason,
      });
      setReviewRequestId(null);
      setAdminCancelReason('');
    } catch (err: any) {
      alert(err?.detail || err?.message || 'Failed to cancel leave.');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addLeaveMut.mutateAsync(addForm);
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(err?.detail || err?.message || 'Failed to add leave for employee.');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adjustMut.mutateAsync(adjustForm);
      setIsAdjustModalOpen(false);
      setAdjustForm({ ...adjustForm, note: '', days: 1.0 });
    } catch (err: any) {
      alert(err?.detail || err?.message || 'Failed to adjust balance.');
    }
  };

  const handleResetFilters = () => {
    setActiveTab('Pending');
    setSearchQuery('');
    setSelectedYear(currentYear);
    setSelectedTypeId('ALL');
    setSelectedStatus('ALL');
    setPage(1);
  };

  const handleExport = () => {
    const rows = filteredRequests.map((r) => [
      r.request_no,
      r.employee_name,
      r.department_name,
      r.leave_type_name,
      `${formatShortDate(r.from_date)} - ${formatShortDate(r.to_date)}`,
      r.leave_days,
      r.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Request No,Employee,Department,Leave Type,Dates,Days,Status', ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leave_requests_${activeTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const counters = data?.counters || {
    pending_count: 0,
    cancellation_requests_count: 0,
    on_leave_today_count: 0,
    approved_this_month_count: 0,
  };

  // Client side secondary filters (leave type, status, year)
  const filteredRequests = useMemo(() => {
    return (data?.requests || []).filter((r) => {
      if (selectedTypeId !== 'ALL' && String(r.leave_type_id) !== selectedTypeId) return false;
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'Pending' && r.status !== 'PENDING') return false;
        if (selectedStatus === 'Approved' && r.status !== 'APPROVED') return false;
        if (selectedStatus === 'Rejected' && r.status !== 'REJECTED') return false;
        if (selectedStatus === 'Cancelled' && r.status !== 'CANCELLED' && r.status !== 'CANCELLATION_REQUESTED') return false;
      }
      return true;
    });
  }, [data?.requests, selectedTypeId, selectedStatus]);

  // Pagination
  const totalItems = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(page, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const currentRequests = filteredRequests.slice(startIndex, startIndex + pageSize);

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumb Navigation */}
      {!hideBreadcrumb && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="hover:text-slate-600 transition-colors">Leave</span>
          <span className="text-slate-300">&gt;</span>
          <span className="font-semibold text-slate-700">Leave Requests</span>
        </div>
      )}

      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ring-1 ring-blue-100">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Requests</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review, approve or reject leave applications and cancellation requests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAdjustModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>Adjust Balance</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Leave for Employee</span>
          </button>
        </div>
      </div>

      {/* 4 Counter Cards (Reference Screen 2 & 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approval */}
        <div
          onClick={() => {
            setActiveTab('Pending');
            setPage(1);
          }}
          className={`bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'Pending' ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 mb-1">
            <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span>Pending Approval</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {counters.pending_count}
          </div>
          <div className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
            <span className="text-[10px]">↑</span>
            <span>2 from last week</span>
          </div>
        </div>

        {/* Cancellation Requests */}
        <div
          onClick={() => {
            setActiveTab('Pending');
            setPage(1);
          }}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-purple-600 mb-1">
            <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <span>Cancellation Requests</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {counters.cancellation_requests_count}
          </div>
          <div className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-1">
            <span>0 from last week</span>
          </div>
        </div>

        {/* On Leave Today */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-1">
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span>On Leave Today</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {counters.on_leave_today_count}
          </div>
          <div className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
            <span className="text-[10px]">↑</span>
            <span>1 from yesterday</span>
          </div>
        </div>

        {/* Approved This Month */}
        <div
          onClick={() => {
            setActiveTab('Approved');
            setPage(1);
          }}
          className={`bg-white rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'Approved' ? 'border-emerald-300 ring-2 ring-emerald-400/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-1">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span>Approved This Month</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {counters.approved_this_month_count}
          </div>
          <div className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
            <span className="text-[10px]">↑</span>
            <span>12% from last month</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        {/* Filter Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Pill Tabs: Pending, Approved, Rejected, Cancelled, All */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs font-medium overflow-x-auto">
            {(['Pending', 'Approved', 'Rejected', 'Cancelled', 'All'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                className={`px-3.5 py-1 rounded-full transition-all cursor-pointer font-semibold whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search & Select Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employee, request no..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>

            {/* Year selector */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs cursor-pointer"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  Year: {y}
                </option>
              ))}
            </select>

            {/* Leave Type selector */}
            <select
              value={selectedTypeId}
              onChange={(e) => {
                setSelectedTypeId(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs cursor-pointer"
            >
              <option value="ALL">Leave Type: All</option>
              {allTypes.map((t) => (
                <option key={t.leave_type_id} value={String(t.leave_type_id)}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Status selector */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Reset Filter Button */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline px-1 cursor-pointer"
            >
              Reset
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100">
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">REQUEST NO.</th>
                <th className="py-3 px-4">EMPLOYEE</th>
                <th className="py-3 px-4">LEAVE TYPE</th>
                <th className="py-3 px-4">DATES</th>
                <th className="py-3 px-4">DAYS</th>
                <th className="py-3 px-4">BAL. AFTER</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRequests.length === 0 ? (
                /* Empty State (Screen 3) */
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 ring-8 ring-blue-50/50">
                        <FileText className="w-7 h-7 text-blue-600" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">No leave requests found</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Leave requests will appear here once employees submit them.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Leave for Employee</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                currentRequests.map((req) => {
                  const initials = getInitials(req.employee_name);
                  const avatarBg = getAvatarBg(req.employee_name);

                  return (
                    <tr key={req.request_id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Request No */}
                      <td className="py-3.5 px-4 font-semibold text-xs text-slate-800 tracking-tight">
                        {req.request_no}
                      </td>

                      {/* Employee with Avatar Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full ${avatarBg} text-white font-bold text-[10px] flex items-center justify-center shrink-0 tracking-wide shadow-2xs`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{req.employee_name}</div>
                            {req.department_name && (
                              <div className="text-[11px] text-slate-400 font-normal">
                                {req.department_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {req.leave_type_name}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatShortDate(req.from_date)} — {formatShortDate(req.to_date)}
                      </td>

                      {/* Days */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">{req.leave_days}</td>

                      {/* Bal. After */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {req.current_available_balance !== undefined
                          ? `${req.current_available_balance}`
                          : '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {req.status === 'PENDING' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                            Pending
                          </span>
                        )}
                        {req.status === 'APPROVED' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Approved
                          </span>
                        )}
                        {req.status === 'REJECTED' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                            Rejected
                          </span>
                        )}
                        {req.status === 'CANCELLATION_REQUESTED' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                            Cancellation Requested
                          </span>
                        )}
                        {req.status === 'CANCELLED' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Cancelled
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-3 font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewRequestId(req.request_id);
                              setRemarks('');
                              setCancellationRemarks('');
                              setAdminCancelReason('');
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            View
                          </button>

                          {req.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await approveMut.mutateAsync({ id: req.request_id, remarks: 'Approved' });
                                  } catch (err: any) {
                                    alert(err?.detail || err?.message || 'Failed to approve');
                                  }
                                }}
                                className="text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewRequestId(req.request_id);
                                  setRemarks('');
                                }}
                                className="text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {startIndex + 1} to {Math.min(startIndex + pageSize, totalItems)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{totalItems}</span> requests
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={validCurrentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                const isActive = pg === validCurrentPage;
                return (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded-lg font-semibold text-xs flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REVIEW LEAVE REQUEST                                               */}
      {/* ========================================================================= */}
      {reviewRequestId && detailsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {detailsData.request.request_no} ({detailsData.request.status})
                </h3>
                <p className="text-slate-500">
                  {detailsData.request.employee_name} • {detailsData.request.department_name} • Applied on{' '}
                  {new Date(detailsData.request.applied_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewRequestId(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary & Balances */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-2">
                <div className="font-semibold text-slate-700">Request Details</div>
                <div className="space-y-1 text-slate-600">
                  <div>
                    <span className="text-slate-400">Leave Type:</span>{' '}
                    <span className="font-bold text-slate-800">
                      {detailsData.request.leave_type_name} ({detailsData.request.is_paid ? 'Paid' : 'Unpaid'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Dates:</span>{' '}
                    {formatShortDate(detailsData.request.from_date)} —{' '}
                    {formatShortDate(detailsData.request.to_date)} ({detailsData.request.duration})
                  </div>
                  <div>
                    <span className="text-slate-400">Counted Working Days:</span>{' '}
                    <span className="font-bold text-slate-900">{detailsData.request.leave_days}</span>
                  </div>
                </div>
              </div>

              {/* Balance Box */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                <div className="font-semibold text-blue-900">
                  {detailsData.request.leave_type_name} Balance
                </div>
                {detailsData.balance ? (
                  <div className="space-y-1 text-blue-800">
                    <div>Credited this year: {detailsData.balance.credited_days}</div>
                    <div>Taken: {detailsData.balance.days_taken}</div>
                    <div>This request: {detailsData.request.leave_days}</div>
                    <div className="font-bold text-blue-950 pt-1 border-t border-blue-200">
                      Balance after approval: {detailsData.balance.balance_after_approval}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500">No balance limit tracked.</div>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="font-semibold text-slate-700">Reason:</span>
              <p className="text-slate-800">{detailsData.request.reason}</p>
            </div>

            {/* Attached Document / Certificate */}
            {detailsData.request.attachment_url && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-blue-950">Attached Document</div>
                    <div className="text-[11px] text-blue-700 truncate max-w-xs">
                      Medical Certificate / Proof
                    </div>
                  </div>
                </div>
                <a
                  href={detailsData.request.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs text-xs transition-colors"
                >
                  View Attachment <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Department Collision Info */}
            {detailsData.department_collisions?.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Department Colleagues on Leave
                  during these dates:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {detailsData.department_collisions.map((c: any) => (
                    <li key={c.request_id}>
                      {c.employee_name} on {c.leave_type_name} ({formatShortDate(c.from_date)} — {formatShortDate(c.to_date)})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cancellation reason if requested */}
            {detailsData.request.status === 'CANCELLATION_REQUESTED' && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 space-y-1">
                <span className="font-semibold">Cancellation Reason:</span>
                <p>{detailsData.request.cancellation_reason}</p>
              </div>
            )}

            {/* Remarks Input */}
            {detailsData.request.status === 'PENDING' && (
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Remarks to the employee (Optional to approve, required to reject)
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add notes or rejection reason..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {detailsData.request.status === 'CANCELLATION_REQUESTED' && (
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Cancellation Decision Remarks *
                </label>
                <textarea
                  rows={2}
                  required
                  value={cancellationRemarks}
                  onChange={(e) => setCancellationRemarks(e.target.value)}
                  placeholder="Explain decision on cancellation request..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                {detailsData.request.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt('Enter reason for cancelling this approved leave:');
                      if (reason) {
                        setAdminCancelReason(reason);
                        handleAdminCancel();
                      }
                    }}
                    className="px-3.5 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel Approved Leave
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReviewRequestId(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold cursor-pointer"
                >
                  Close
                </button>

                {detailsData.request.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={rejectMut.isPending}
                      className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 font-semibold shadow-xs cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={approveMut.isPending}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold shadow-xs cursor-pointer"
                    >
                      Approve
                    </button>
                  </>
                )}

                {detailsData.request.status === 'CANCELLATION_REQUESTED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDecideCancel(false)}
                      disabled={decideCancelMut.isPending}
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl font-semibold cursor-pointer"
                    >
                      Keep Leave
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecideCancel(true)}
                      disabled={decideCancelMut.isPending}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold shadow-xs cursor-pointer"
                    >
                      Agree to Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD LEAVE FOR EMPLOYEE                                             */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Leave for Employee</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee *</label>
                <select
                  value={addForm.emp_id || ''}
                  onChange={(e) => setAddForm({ ...addForm, emp_id: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  disabled={isEmployeesLoading && employees.length === 0}
                >
                  {employees.length === 0 ? (
                    <option value="" disabled>
                      {isEmployeesLoading ? 'Loading employees...' : 'No active employees found'}
                    </option>
                  ) : (
                    employees.map((e: any) => (
                      <option key={e.emp_id} value={e.emp_id}>
                        {e.name} {e.email ? `(${e.email})` : e.emp_code ? `(${e.emp_code})` : `(EMP-${e.emp_id})`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type *</label>
                <select
                  value={addForm.leave_type_id}
                  onChange={(e) =>
                    setAddForm({ ...addForm, leave_type_id: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  {allTypes.map((t) => (
                    <option key={t.leave_type_id} value={t.leave_type_id}>
                      {t.name} ({t.is_paid ? 'Paid' : 'Unpaid'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={addForm.from_date}
                    onChange={(e) => setAddForm({ ...addForm, from_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={addForm.to_date}
                    onChange={(e) => setAddForm({ ...addForm, to_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Sudden illness, hospital stay, etc..."
                  value={addForm.reason}
                  onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLeaveMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  Save & Approve Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADJUST BALANCE                                                     */}
      {/* ========================================================================= */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Adjust Balance</h3>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee *</label>
                <select
                  value={adjustForm.emp_id || ''}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, emp_id: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  disabled={isEmployeesLoading && employees.length === 0}
                >
                  {employees.length === 0 ? (
                    <option value="" disabled>
                      {isEmployeesLoading ? 'Loading employees...' : 'No active employees found'}
                    </option>
                  ) : (
                    employees.map((e: any) => (
                      <option key={e.emp_id} value={e.emp_id}>
                        {e.name} {e.email ? `(${e.email})` : e.emp_code ? `(${e.emp_code})` : `(EMP-${e.emp_id})`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type *</label>
                <select
                  value={adjustForm.leave_type_id}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, leave_type_id: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  {allTypes
                    .filter((t) => t.balance_tracked)
                    .map((t) => (
                      <option key={t.leave_type_id} value={t.leave_type_id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Credit / Debit *</label>
                  <select
                    value={adjustForm.direction}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, direction: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="CREDIT">Credit (Add days)</option>
                    <option value="DEBIT">Debit (Subtract days)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Days * (0.5 steps)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="365"
                    required
                    value={adjustForm.days}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, days: parseFloat(e.target.value) || 0.5 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mandatory Note * (10 to 500 characters)
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  maxLength={500}
                  placeholder='e.g. "Hospital stay, approved by Director"'
                  value={adjustForm.note}
                  onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-xs cursor-pointer"
                >
                  Save Adjustment & Record in Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
