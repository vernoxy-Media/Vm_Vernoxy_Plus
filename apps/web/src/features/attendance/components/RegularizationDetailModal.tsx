import React, { useState } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {regularization.requestId} • {regularization.employeeName || 'Employee'} • {regularization.workDate}
              </h2>
              <span
                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize ${
                  regularization.status === 'approved'
                    ? 'bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                    : regularization.status === 'rejected'
                    ? 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                }`}
              >
                {regularization.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isApproverView ? 'Review Request' : 'Regularization Request Details'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 rounded p-4 dark:border-slate-800">
            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Request ID</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{regularization.requestId}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Employee</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {regularization.employeeName} ({regularization.employeeCode || `EMP-${regularization.empId}`})
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Department</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {regularization.departmentName || 'General'}
              </span>
            </div>

            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Attendance Date</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{regularization.workDate}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Request Type</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{regularization.requestType}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Submitted On</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{submittedOnStr}</span>
            </div>

            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Recorded In / Out</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{recordedInOut}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Requested In / Out</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{requestedInOut}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Pending With</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{pendingWithStr}</span>
            </div>

            <div className="md:col-span-2">
              <span className="block text-xs text-slate-500 dark:text-slate-400">Reason and Remarks</span>
              <span className="text-sm text-slate-800 dark:text-slate-200">{reasonAndRemarks}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Attachment</span>
              {regularization.attachmentName ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  {regularization.attachmentName}
                </span>
              ) : (
                <span className="text-xs text-slate-400">None</span>
              )}
            </div>
          </div>

          {/* Approval History Table */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Approval History
            </h3>
            <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2 font-medium">Level</th>
                    <th className="px-3 py-2 font-medium">Approver</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {regularization.approvals && regularization.approvals.length > 0 ? (
                    regularization.approvals.map((item, idx) => (
                      <tr key={item.approvalId || idx}>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.levelName}</td>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{item.approverName || '--'}</td>
                        <td className="px-3 py-2">
                          <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                            {item.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {item.actionDate ? new Date(item.actionDate).toLocaleDateString() : '--'}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{item.comment || '--'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Level 1 - HR</td>
                      <td className="px-3 py-2 text-slate-500">--</td>
                      <td className="px-3 py-2 capitalize font-medium text-slate-700 dark:text-slate-300">
                        {regularization.status}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {regularization.decidedAt ? new Date(regularization.decidedAt).toLocaleDateString() : '--'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
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
            <div className="rounded border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Approver Comment
              </label>
              <textarea
                rows={2}
                maxLength={250}
                placeholder="Enter a comment (required when rejecting)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white p-2.5 text-xs text-slate-800 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {/* Confirm Dialog Inline */}
          {confirmAction && (
            <div className="rounded border border-slate-300 bg-slate-100 p-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>
                Are you sure you want to <strong>{confirmAction}</strong> this regularization request?
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
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
                  className="rounded bg-slate-800 px-3 py-1 font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
                >
                  Yes, Confirm
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            {!isApproverView && isRequester && isPending && (
              <button
                type="button"
                onClick={() => setConfirmAction('cancel')}
                disabled={isSubmitting}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel Request
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back
            </button>

            {isApproverView && isPending && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmAction('reject')}
                  disabled={isSubmitting}
                  className="rounded border border-slate-400 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction('approve')}
                  disabled={isSubmitting}
                  className="rounded bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Approve
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
