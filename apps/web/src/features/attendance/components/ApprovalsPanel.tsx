import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckSquare, Square, Eye, Check } from 'lucide-react';
import { fetchRegularizations, bulkApproveRegularizationRequests } from '../api/attendance.api';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import type { AttendanceRegularization } from '../types/attendance.types';
import { RegularizationDetailModal } from './RegularizationDetailModal';

export const ApprovalsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [department, setDepartment] = useState<string>('All');
  const [requestType, setRequestType] = useState<string>('All');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const { data: requestTypeOptions } = useLookupsQuery('request_type');
  const requestTypes = requestTypeOptions && requestTypeOptions.length > 0
    ? requestTypeOptions.map((o) => o.label)
    : ['Missing Check-in', 'Missing Check-out', 'Incorrect Time', 'Full Day Missed', 'On Duty / Field Work'];

  const [requests, setRequests] = useState<AttendanceRegularization[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRegularization | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isBulkApproving, setIsBulkApproving] = useState<boolean>(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRegularizations({
        tab: activeTab,
        department_id: department !== 'All' ? Number(department) : undefined,
        request_type: requestType !== 'All' ? requestType : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: search || undefined,
        scope: 'team', // manager/HR view
      });
      setRequests(data);
      setSelectedIds([]);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [activeTab, department, requestType, fromDate, toDate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadRequests();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Departments list extracted from requests or defaults
  const departments = useMemo(() => {
    const list = new Set<string>();
    requests.forEach((r) => {
      if (r.departmentName) list.add(r.departmentName);
    });
    return Array.from(list);
  }, [requests]);

  const handleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.map((r) => r.correctionId));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkApproving(true);
    try {
      await bulkApproveRegularizationRequests(selectedIds);
      loadRequests();
    } catch {
      // Handled in loadRequests
    } finally {
      setIsBulkApproving(false);
    }
  };

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
      {/* Header with Title and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Attendance Regularization Approvals
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and resolve employee attendance regularization requests.
          </p>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-[#5B4CF8] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Pending {activeTab === 'pending' && `(${requests.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-white text-[#5B4CF8] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              activeTab === 'rejected'
                ? 'bg-white text-[#5B4CF8] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Request Type
          </label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="All">All Request Types</option>
            {requestTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Search
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Name or Emp ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Action / Batch Header */}
      {activeTab === 'pending' && (
        <div className="flex items-center justify-between bg-indigo-50/60 px-4 py-2.5 rounded-xl border border-indigo-100">
          <span className="text-xs text-indigo-900 font-semibold">
            {requests.length} requests waiting for approval
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isBulkApproving ? 'Approving...' : `Approve Selected (${selectedIds.length})`}</span>
            </button>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-floating-card">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider">
            <tr>
              {activeTab === 'pending' && (
                <th className="w-10 px-3 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {selectedIds.length > 0 && selectedIds.length === requests.length ? (
                      <CheckSquare className="h-4 w-4 text-[#5B4CF8]" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
              )}
              <th className="px-4 py-3.5">Request ID</th>
              <th className="px-4 py-3.5">Employee</th>
              <th className="px-4 py-3.5">Dept.</th>
              <th className="px-4 py-3.5">Date</th>
              <th className="px-4 py-3.5">Type</th>
              <th className="px-4 py-3.5">Requested In / Out</th>
              <th className="px-4 py-3.5">Submitted</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 font-medium">
                  Loading requests...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 font-medium">
                  No {activeTab} regularization requests found.
                </td>
              </tr>
            ) : (
              requests.map((r) => {
                const isSelected = selectedIds.includes(r.correctionId);
                const reqInOut = `${formatTimeStr(r.requestedCheckInAt)} / ${formatTimeStr(r.requestedCheckOutAt)}`;
                const submittedDateStr = r.createdAt
                  ? new Date(r.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })
                  : '--';

                return (
                  <tr
                    key={r.correctionId}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {activeTab === 'pending' && (
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelect(r.correctionId)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-[#5B4CF8]" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {r.requestId}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-semibold">
                      {r.employeeName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {r.departmentName || 'General'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-medium">
                      {r.workDate}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {r.requestType}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                      {reqInOut}
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

      {/* Review Modal */}
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
        isApproverView={true}
      />
    </div>
  );
};
