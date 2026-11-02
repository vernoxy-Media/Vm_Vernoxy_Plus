import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  cancelRegularizationRequest,
  approveRegularizationRequest,
  rejectRegularizationRequest,
} from '../api/attendance.api';
import type { AttendanceRegularization } from '../types/attendance.types';

interface RegularizationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  regularization: AttendanceRegularization | null;
  isApproverView?: boolean;
}

export const RegularizationDetailModal: React.FC<RegularizationDetailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  regularization,
  isApproverView = false,
}) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'cancel' | null>(null);

  if (!isOpen || !regularization) return null;

  const isRequester = user?.emp_id === regularization.empId;
  const isPending = regularization.status === 'pending';

  // Format timings
  const formatTimeStr = (isoDate?: string | null) => {
    if (!isoDate) return '--';
    try {
      const d = new Date(isoDate);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--';
    }
  };

  const recordedInOut = `${formatTimeStr(regularization.currentCheckInAt)} / ${formatTimeStr(regularization.currentCheckOutAt)}`;
  const requestedInOut = `${formatTimeStr(regularization.requestedCheckInAt)} / ${formatTimeStr(regularization.requestedCheckOutAt)}`;
  const reasonAndRemarks = `${regularization.reason}${regularization.remarks ? ` - ${regularization.remarks}` : ''}`;

  const submittedOnStr = regularization.createdAt
    ? new Date(regularization.createdAt).toLocaleString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--';

  const pendingApprover = regularization.approvals?.find((a) => a.action === 'pending');
  const pendingWithStr = isPending
    ? pendingApprover
      ? `${pendingApprover.approverName || 'HR Team'} (${pendingApprover.levelName})`
      : 'Level 1 - HR'
    : '--';

  const handleCancel = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await cancelRegularizationRequest(regularization.correctionId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel request');
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const handleApprove = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await approveRegularizationRequest(regularization.correctionId, comment.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve request');
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const handleReject = async () => {
    setError(null);
    if (!comment || comment.trim().length === 0) {
      setError('Please enter a comment to reject.');
      setConfirmAction(null);
      return;
    }
    setIsSubmitting(true);
    try {
      await rejectRegularizationRequest(regularization.correctionId, comment.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject request');
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-800">
                {regularization.requestId} • {regularization.employeeName || 'Employee'}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold capitalize border ${
                  regularization.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : regularization.status === 'rejected'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : regularization.status === 'cancelled'
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {regularization.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isApproverView ? 'Review Regularization Request' : 'Regularization Request Details'} • Date: {regularization.workDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 border border-slate-200/90 rounded-2xl p-4 bg-slate-50/40 text-xs">
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Request ID</span>
              <span className="font-bold text-slate-800">{regularization.requestId}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Employee</span>
              <span className="font-semibold text-slate-800">
                {regularization.employeeName} ({regularization.employeeCode || `EMP-${regularization.empId}`})
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Department</span>
              <span className="font-semibold text-slate-800">
                {regularization.departmentName || 'General'}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Attendance Date</span>
              <span className="font-semibold text-slate-800">{regularization.workDate}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Request Type</span>
              <span className="font-semibold text-slate-800">{regularization.requestType}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Submitted On</span>
              <span className="font-medium text-slate-600">{submittedOnStr}</span>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Recorded In / Out</span>
              <span className="font-semibold text-slate-700">{recordedInOut}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Requested In / Out</span>
              <span className="font-bold text-[#5B4CF8]">{requestedInOut}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Pending With</span>
              <span className="font-semibold text-slate-700">{pendingWithStr}</span>
            </div>

            <div className="sm:col-span-2">
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Reason &amp; Remarks</span>
              <span className="font-medium text-slate-700">{reasonAndRemarks}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-0.5">Attachment</span>
              {regularization.attachmentName ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  {regularization.attachmentName}
                </span>
              ) : (
                <span className="text-slate-400 font-medium">None</span>
              )}
            </div>
          </div>

          {/* Approval History Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Approval Trail
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">Level</th>
                    <th className="px-3.5 py-2.5">Approver</th>
                    <th className="px-3.5 py-2.5">Action</th>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {regularization.approvals && regularization.approvals.length > 0 ? (
                    regularization.approvals.map((item, idx) => (
                      <tr key={item.approvalId || idx}>
                        <td className="px-3.5 py-2.5 text-slate-700 font-medium">{item.levelName}</td>
                        <td className="px-3.5 py-2.5 text-slate-800 font-semibold">{item.approverName || '--'}</td>
                        <td className="px-3.5 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold capitalize border ${
                            item.action === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.action === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {item.action}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500">
                          {item.actionDate ? new Date(item.actionDate).toLocaleDateString() : '--'}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">{item.comment || '--'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3.5 py-2.5 text-slate-700 font-medium">Level 1 - HR</td>
                      <td className="px-3.5 py-2.5 text-slate-500">--</td>
                      <td className="px-3.5 py-2.5">
                        <span className="capitalize font-bold text-slate-700">
                          {regularization.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-500">
                        {regularization.decidedAt ? new Date(regularization.decidedAt).toLocaleDateString() : '--'}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600">
                        {regularization.rejectionReason || '--'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approver Action Panel */}
          {isApproverView && isPending && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-2.5">
              <label className="block text-xs font-bold text-slate-700">
                Approver Comment
              </label>
              <textarea
                rows={2}
                maxLength={250}
                placeholder="Enter remarks or reason (required if rejecting)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
          )}

          {/* Confirm Dialog Inline */}
          {confirmAction && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3.5 text-xs text-indigo-950 flex items-center justify-between">
              <span>
                Are you sure you want to <strong>{confirmAction}</strong> this regularization request?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 cursor-pointer font-medium"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmAction === 'approve') handleApprove();
                    else if (confirmAction === 'reject') handleReject();
                    else if (confirmAction === 'cancel') handleCancel();
                  }}
                  className={`rounded-lg px-3 py-1.5 font-bold text-white cursor-pointer ${
                    confirmAction === 'reject' || confirmAction === 'cancel'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  Yes, Confirm
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 bg-slate-50/80">
          <div>
            {!isApproverView && isRequester && isPending && (
              <button
                type="button"
                onClick={() => setConfirmAction('cancel')}
                disabled={isSubmitting}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                Cancel Request
              </button>
            )}
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
            >
              Back
            </button>

            {isApproverView && isPending && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmAction('reject')}
                  disabled={isSubmitting}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-2xs transition cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction('approve')}
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
