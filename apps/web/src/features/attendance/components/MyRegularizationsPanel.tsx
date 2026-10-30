import React, { useState, useEffect } from 'react';
import { Plus, Eye } from 'lucide-react';
import { fetchRegularizations } from '../api/attendance.api';
import type { AttendanceRegularization } from '../types/attendance.types';
import { AddRegularizationModal } from './AddRegularizationModal';
import { RegularizationDetailModal } from './RegularizationDetailModal';

export const MyRegularizationsPanel: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [requests, setRequests] = useState<AttendanceRegularization[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRegularization | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRegularizations({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        scope: 'me',
      });
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const formatTimeStr = (isoDate?: string | null) => {
    if (!isoDate) return '--';
    try {
      const d = new Date(isoDate);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Attendance Regularization
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Request a correction when a punch is missing or wrong.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add New</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Status:</span>
          {['All', 'pending', 'approved', 'rejected', 'cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded px-2.5 py-1 text-xs capitalize border ${
                statusFilter === st
                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 font-medium'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-800">
            <tr>
              <th className="px-3 py-2.5 font-medium">Request ID</th>
              <th className="px-3 py-2.5 font-medium">Attendance Date</th>
              <th className="px-3 py-2.5 font-medium">Request Type</th>
              <th className="px-3 py-2.5 font-medium">Requested In / Out</th>
              <th className="px-3 py-2.5 font-medium">Reason</th>
              <th className="px-3 py-2.5 font-medium">Submitted On</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Loading your requests...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No regularization requests found.
                </td>
              </tr>
            ) : (
              requests.map((r) => {
                const reqInOut = `${formatTimeStr(r.requestedCheckInAt)} / ${formatTimeStr(r.requestedCheckOutAt)}`;
                const submittedDateStr = r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })
                  : '--';

                return (
                  <tr key={r.correctionId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {r.requestId}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {r.workDate}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                      {r.requestType}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {reqInOut}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {r.reason}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {submittedDateStr}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium capitalize ${
                          r.status === 'approved'
                            ? 'bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                            : r.status === 'rejected'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            : r.status === 'cancelled'
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(r);
                          setIsDetailOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 font-medium"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Request Modal */}
      <AddRegularizationModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          loadRequests();
        }}
      />

      {/* Detail Modal */}
      <RegularizationDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRequest(null);
        }}
        onSuccess={() => {
          loadRequests();
        }}
        regularization={selectedRequest}
        isApproverView={false}
      />
    </div>
  );
};
