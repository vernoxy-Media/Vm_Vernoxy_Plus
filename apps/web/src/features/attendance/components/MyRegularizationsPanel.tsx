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
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Attendance Regularization
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Request a correction when a punch is missing or wrong.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#5B4CF8] hover:bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs btn-hover-lift transition cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2]" />
          <span>+ Add New</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 ml-1">Status:</span>
          {['All', 'pending', 'approved', 'rejected', 'cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 text-xs capitalize transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-50 text-[#5B4CF8] border border-indigo-200 font-bold shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-medium'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-floating-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Request ID</th>
              <th className="px-4 py-3.5">Attendance Date</th>
              <th className="px-4 py-3.5">Request Type</th>
              <th className="px-4 py-3.5">Requested In / Out</th>
              <th className="px-4 py-3.5">Reason</th>
              <th className="px-4 py-3.5">Submitted On</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
                  Loading your requests...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
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
                  <tr key={r.correctionId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {r.requestId}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                      {r.workDate}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {r.requestType}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                      {reqInOut}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {r.reason}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {submittedDateStr}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize border ${
                          r.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : r.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : r.status === 'cancelled'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(r);
                          setIsDetailOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-[#5B4CF8] hover:border-indigo-200 font-semibold text-xs shadow-2xs transition cursor-pointer"
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
