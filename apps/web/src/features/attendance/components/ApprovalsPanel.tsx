import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckSquare, Square, Eye, Check, ClipboardCheck } from 'lucide-react';
import { fetchRegularizations, bulkApproveRegularizationRequests } from '../api/attendance.api';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import type { AttendanceRegularization } from '../types/attendance.types';
import { RegularizationDetailModal } from './RegularizationDetailModal';
import { Pagination } from '@/shared/ui/Pagination';
import { Avatar } from '@/shared/ui/Avatar';
import { RequestedTimes, StatusPill, TypeChip, formatDay, submittedOn } from './regularization-ui';

const TABS = ['pending', 'approved', 'rejected'] as const;
type Tab = (typeof TABS)[number];

const field =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-[#5B4CF8] focus:outline-none focus:ring-2 focus:ring-[#5B4CF8]/15';

export const ApprovalsPanel: React.FC<{
  /** An administrator looking at one employee: only that employee's requests are listed */
  viewing?: { emp_id: number; name: string } | null;
}> = ({ viewing }) => {
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [department, setDepartment] = useState('All');
  const [requestType, setRequestType] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: requestTypeOptions } = useLookupsQuery('request_type');
  const requestTypes =
    requestTypeOptions && requestTypeOptions.length > 0
      ? requestTypeOptions.map((o) => o.label)
      : ['Missing Check-in', 'Missing Check-out', 'Incorrect Time', 'Full Day Missed', 'On Duty / Field Work'];

  const [requests, setRequests] = useState<AttendanceRegularization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRegularization | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRegularizations({
        tab: activeTab,
        emp_id: viewing?.emp_id,
        department_id: department !== 'All' ? Number(department) : undefined,
        request_type: requestType !== 'All' ? requestType : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: search || undefined,
        scope: 'team',
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
  }, [activeTab, department, requestType, fromDate, toDate, viewing?.emp_id]);

  // debounced search
  useEffect(() => {
    const timer = setTimeout(loadRequests, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [activeTab, department, requestType, fromDate, toDate, search, pageSize, viewing?.emp_id]);

  const departments = useMemo(() => {
    const list = new Set<string>();
    requests.forEach((r) => r.departmentName && list.add(r.departmentName));
    return Array.from(list);
  }, [requests]);

  const rows = requests.slice((page - 1) * pageSize, page * pageSize);
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.correctionId));

  const toggleSelect = (id: number) => setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const togglePage = () =>
    setSelectedIds((p) => (allOnPageSelected ? p.filter((id) => !rows.some((r) => r.correctionId === id)) : [...new Set([...p, ...rows.map((r) => r.correctionId)])]));

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkApproving(true);
    try {
      await bulkApproveRegularizationRequests(selectedIds);
      loadRequests();
    } finally {
      setIsBulkApproving(false);
    }
  };

  const open = (r: AttendanceRegularization) => {
    setSelectedRequest(r);
    setIsDetailOpen(true);
  };

  const Check_ = ({ id, on }: { id: number; on: boolean }) => (
    <button type="button" aria-label={on ? 'Deselect request' : 'Select request'} onClick={(e) => { e.stopPropagation(); toggleSelect(id); }} className="text-slate-300 hover:text-slate-600 cursor-pointer">
      {on ? <CheckSquare className="h-4 w-4 text-[#5B4CF8]" /> : <Square className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{viewing ? `Approvals · ${viewing.name}` : 'Regularization approvals'}</h2>
            <p className="text-xs text-slate-500">{viewing ? "Requests raised by this employee." : 'Review and resolve employee attendance requests.'}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E4E8EF] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-2 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Approval status" className="-mb-px flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={activeTab === t}
                onClick={() => setActiveTab(t)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-semibold capitalize transition-colors cursor-pointer ${
                  activeTab === t ? 'border-[#5B4CF8] text-[#5B4CF8]' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {t}
                {activeTab === t && <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">{requests.length}</span>}
              </button>
            ))}
          </div>

          {activeTab === 'pending' && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="mb-3 inline-flex items-center justify-center gap-1.5 self-start rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 lg:mb-0 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              {isBulkApproving ? 'Approving…' : `Approve selected (${selectedIds.length})`}
            </button>
          )}
        </div>

        {/* filters */}
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-[#F8FAFC] px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Department</span>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={field}>
              <option value="All">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Request type</span>
            <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className={field}>
              <option value="All">All request types</option>
              {requestTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or employee ID" className={`${field} pl-8`} />
            </span>
          </label>
        </div>

        {/* table from tablet up */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                {activeTab === 'pending' && (
                  <th className="w-10 py-3 pl-5 pr-2">
                    <button type="button" aria-label="Select all on this page" onClick={togglePage} className="text-slate-300 hover:text-slate-600 cursor-pointer">
                      {allOnPageSelected ? <CheckSquare className="h-4 w-4 text-[#5B4CF8]" /> : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                )}
                <th className={`${activeTab === 'pending' ? 'px-3' : 'pl-5 pr-3'} py-3`}>Employee</th>
                <th className="px-3 py-3">Request</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Requested in → out</th>
                <th className="px-3 py-3">Submitted</th>
                <th className="px-3 py-3">Status</th>
                <th className="py-3 pl-3 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="py-14 text-center text-slate-400">Loading requests…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="py-14 text-center text-slate-400">No {activeTab} regularization requests found.</td></tr>
              ) : (
                rows.map((r) => {
                  const day = formatDay(r.workDate);
                  const on = selectedIds.includes(r.correctionId);
                  return (
                    <tr key={r.correctionId} onClick={() => open(r)} className={`h-[58px] cursor-pointer border-t border-slate-100 transition-colors ${on ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'}`}>
                      {activeTab === 'pending' && <td className="py-2 pl-5 pr-2"><Check_ id={r.correctionId} on={on} /></td>}
                      <td className={`${activeTab === 'pending' ? 'px-3' : 'pl-5 pr-3'} py-2`}>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.employeeName || 'Employee'} size={32} />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-900">{r.employeeName}</p>
                            <p className="truncate text-[11px] text-slate-500">{r.departmentName || 'General'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[13px] font-medium text-slate-700">{r.requestId}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-[13px] text-slate-800">{day.date} <span className="text-slate-400">· {day.weekday}</span></td>
                      <td className="px-3 py-2"><TypeChip type={r.requestType} /></td>
                      <td className="px-3 py-2 text-[13px]"><RequestedTimes r={r} /></td>
                      <td className="whitespace-nowrap px-3 py-2 text-[13px] text-slate-500">{submittedOn(r)}</td>
                      <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                      <td className="whitespace-nowrap py-2 pl-3 pr-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); open(r); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-[#5B4CF8] cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> {activeTab === 'pending' ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* cards on phones */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {isLoading ? (
            <li className="py-12 text-center text-sm text-slate-400">Loading requests…</li>
          ) : rows.length === 0 ? (
            <li className="py-12 text-center text-sm text-slate-400">No {activeTab} regularization requests found.</li>
          ) : (
            rows.map((r) => {
              const day = formatDay(r.workDate);
              const on = selectedIds.includes(r.correctionId);
              return (
                <li key={r.correctionId} className={`flex items-start gap-3 px-4 py-3.5 ${on ? 'bg-indigo-50/40' : ''}`}>
                  {activeTab === 'pending' && <div className="pt-1"><Check_ id={r.correctionId} on={on} /></div>}
                  <button type="button" onClick={() => open(r)} className="min-w-0 flex-1 space-y-2 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar name={r.employeeName || 'Employee'} size={28} />
                        <span className="truncate text-sm font-semibold text-slate-900">{r.employeeName}</span>
                      </span>
                      <StatusPill status={r.status} />
                    </div>
                    <div className="text-[13px] text-slate-700">{r.requestId} · {day.date} <span className="text-slate-400">({day.weekday})</span></div>
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <TypeChip type={r.requestType} />
                      <RequestedTimes r={r} />
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {!isLoading && requests.length > 0 && (
          <Pagination page={page} pageSize={pageSize} total={requests.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>

      <RegularizationDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRequest(null);
        }}
        onSuccess={() => loadRequests()}
        regularization={selectedRequest}
        isApproverView={true}
      />
    </div>
  );
};
