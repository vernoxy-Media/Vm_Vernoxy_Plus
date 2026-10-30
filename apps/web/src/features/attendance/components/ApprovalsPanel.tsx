import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckSquare, Square, Eye } from 'lucide-react';
import { fetchRegularizations, bulkApproveRegularizationRequests } from '../api/attendance.api';
import { useLookupsQuery } from '../../../hooks/use-master-data';
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
      {/* Page Title & Subtabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Approvals
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`rounded px-3 py-1.5 text-xs font-medium border ${
              activeTab === 'pending'
                ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            Pending {activeTab === 'pending' && `(${requests.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`rounded px-3 py-1.5 text-xs font-medium border ${
              activeTab === 'approved'
                ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`rounded px-3 py-1.5 text-xs font-medium border ${
              activeTab === 'rejected'
                ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-3 rounded border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="All">All</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Request Type
          </label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="All">All</option>
            {requestTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
            Search
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Name or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Action / Batch Header */}
      {activeTab === 'pending' && (
        <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded border border-slate-200 dark:bg-slate-800/40 dark:border-slate-800">
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {requests.length} requests waiting for your action
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {isBulkApproving ? 'Approving...' : `Approve Selected (${selectedIds.length})`}
            </button>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-800">
            <tr>
              {activeTab === 'pending' && (
                <th className="w-10 px-3 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    {selectedIds.length > 0 && selectedIds.length === requests.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
              )}
              <th className="px-3 py-2.5 font-medium">Request ID</th>
              <th className="px-3 py-2.5 font-medium">Employee</th>
              <th className="px-3 py-2.5 font-medium">Dept.</th>
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Requested In / Out</th>
              <th className="px-3 py-2.5 font-medium">Submitted</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  Loading requests...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
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
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    {activeTab === 'pending' && (
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelect(r.correctionId)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-slate-800 dark:text-slate-200" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {r.requestId}
                    </td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200">
                      {r.employeeName}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {r.departmentName || 'General'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {r.workDate}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                      {r.requestType}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {reqInOut}
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
