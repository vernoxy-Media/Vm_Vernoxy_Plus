import React, { useState } from 'react';
import {
  CalendarOff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Sliders,
  X,
  Search,
  Calendar,
  AlertCircle,
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

export const LeaveRequestsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'All'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');

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

  const { data: detailsData } = useLeaveRequestDetailsQuery(
    reviewRequestId || undefined,
  );

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

  const counters = data?.counters || {
    pending_count: 0,
    cancellation_requests_count: 0,
    on_leave_today_count: 0,
    approved_this_month_count: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarOff className="w-7 h-7 text-blue-600" />
            Leave Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review, approve or reject leave applications and cancellation requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAdjustModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Sliders className="w-4 h-4 text-slate-500" /> Adjust Balance
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Leave for Employee
          </button>
        </div>
      </div>

      {/* 4 Counter Cards (Reference Screen 5 Marker 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('Pending')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${activeTab === 'Pending'
              ? 'bg-amber-50/60 border-amber-300 shadow-xs ring-1 ring-amber-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 mb-1">
            <span>Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{counters.pending_count}</div>
        </div>

        <div
          onClick={() => setActiveTab('Pending')}
          className="p-4 rounded-2xl border bg-white border-slate-200 hover:bg-slate-50 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-purple-700 mb-1">
            <span>Cancellation Requests</span>
            <AlertCircle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {counters.cancellation_requests_count}
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white border-slate-200">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-700 mb-1">
            <span>On Leave Today</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{counters.on_leave_today_count}</div>
        </div>

        <div
          onClick={() => setActiveTab('Approved')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${activeTab === 'Approved'
              ? 'bg-emerald-50/60 border-emerald-300 shadow-xs ring-1 ring-emerald-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 mb-1">
            <span>Approved This Month</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {counters.approved_this_month_count}
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            {(['Pending', 'Approved', 'Rejected', 'Cancelled', 'All'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === tab
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search request no or employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Request No.</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Bal. After</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.requests || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No leave requests found in this tab.
                  </td>
                </tr>
              ) : (
                data?.requests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {req.request_no}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{req.employee_name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {req.department_name}
                        {req.is_short_notice && (
                          <span className="ml-1.5 text-amber-700 bg-amber-50 px-1 rounded font-semibold border border-amber-200">
                            Short notice
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {req.leave_type_name}
                      {req.is_paid ? (
                        <span className="ml-1 text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded">
                          Paid
                        </span>
                      ) : (
                        <span className="ml-1 text-[10px] text-rose-700 bg-rose-50 px-1 rounded">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(req.from_date).toLocaleDateString()} — {new Date(req.to_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{req.leave_days}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {req.current_available_balance !== undefined
                        ? `${req.current_available_balance}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {req.status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Approved
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Rejected
                        </span>
                      )}
                      {req.status === 'CANCELLATION_REQUESTED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Cancellation requested
                        </span>
                      )}
                      {req.status === 'CANCELLED' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewRequestId(req.request_id);
                          setRemarks('');
                          setCancellationRemarks('');
                          setAdminCancelReason('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
                      >
                        {req.status === 'PENDING' || req.status === 'CANCELLATION_REQUESTED'
                          ? 'Review'
                          : 'View'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REVIEW LEAVE REQUEST (Reference Screen 6)                          */}
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
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
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
                    {new Date(detailsData.request.from_date).toLocaleDateString()} —{' '}
                    {new Date(detailsData.request.to_date).toLocaleDateString()} ({detailsData.request.duration})
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

            {/* Department Collision Info (Reference Screen 6 Marker 6) */}
            {detailsData.department_collisions?.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Department Colleagues on Leave
                  during these dates:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {detailsData.department_collisions.map((c: any) => (
                    <li key={c.request_id}>
                      {c.employee_name} on {c.leave_type_name} (
                      {new Date(c.from_date).toLocaleDateString()} —{' '}
                      {new Date(c.to_date).toLocaleDateString()})
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
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
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
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl font-semibold"
                    >
                      Keep Leave
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecideCancel(true)}
                      disabled={decideCancelMut.isPending}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold shadow-xs"
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
      {/* MODAL: ADD LEAVE FOR EMPLOYEE (Section 6 Part 4)                          */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Leave for Employee</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
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
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLeaveMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-xs"
                >
                  Save & Approve Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADJUST BALANCE (Section 10 Part 1)                                  */}
      {/* ========================================================================= */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Adjust Balance</h3>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
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
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-xs"
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
