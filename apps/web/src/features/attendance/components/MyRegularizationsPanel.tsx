import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Eye, Search, FileText } from 'lucide-react';
import { fetchRegularizations } from '../api/attendance.api';
import type { AttendanceRegularization } from '../types/attendance.types';
import { AddRegularizationModal } from './AddRegularizationModal';
import { RegularizationDetailModal } from './RegularizationDetailModal';
import { Pagination } from '@/shared/ui/Pagination';
import { RequestedTimes, StatusPill, TypeChip, formatDay, submittedOn } from './regularization-ui';

const TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled'] as const;
type Tab = (typeof TABS)[number];

export const MyRegularizationsPanel: React.FC<{
  /** An administrator looking at somebody else: show that employee's requests instead */
  viewing?: { emp_id: number; name: string } | null;
}> = ({ viewing }) => {
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<AttendanceRegularization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRegularization | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      setRequests(await fetchRegularizations(viewing ? { emp_id: viewing.emp_id } : { scope: 'me' }));
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [viewing?.emp_id]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: requests.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    for (const r of requests) if (r.status in c) c[r.status as Tab]++;
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (!q) return true;
      return [r.requestId, r.requestType, r.reason, r.workDate].some((v) => (v ?? '').toLowerCase().includes(q));
    });
  }, [requests, tab, search]);

  useEffect(() => setPage(1), [tab, search, pageSize, viewing?.emp_id]);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const open = (r: AttendanceRegularization) => {
    setSelectedRequest(r);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-[color:var(--ac-main,#5B4CF8)]">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {viewing ? `${viewing.name}'s regularizations` : 'My regularizations'}
            </h2>
            <p className="text-xs text-slate-500">
              {viewing ? 'Requests this employee has raised for missing or wrong punches.' : 'Request a correction when a punch is missing or wrong.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1471DD] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0F5FBF] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {viewing ? 'Add for employee' : 'Add new'}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E4E8EF] bg-white shadow-sm">
        {/* status tabs with counts + search */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-2 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Request status" className="-mb-px flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-semibold capitalize transition-colors cursor-pointer ${
                  tab === t ? 'border-[color:var(--ac-main,#5B4CF8)] text-[color:var(--ac-main,#5B4CF8)]' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {t}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === t ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{counts[t]}</span>
              </button>
            ))}
          </div>
          <div className="relative pb-3 lg:pb-0 lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-[calc(50%-6px)] h-4 w-4 -translate-y-1/2 text-slate-400 lg:top-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request, type or reason"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[color:var(--ac-main,#5B4CF8)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ac-main-rgb,91_76_248)/0.15)]"
            />
          </div>
        </div>

        {/* table from tablet up */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 pl-5 pr-4">Request</th>
                <th className="px-4 py-3">Attendance date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Requested in → out</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="py-3 pl-4 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="py-14 text-center text-slate-400">Loading requests…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="py-14 text-center text-slate-400">No regularization requests found.</td></tr>
              ) : (
                rows.map((r) => {
                  const day = formatDay(r.workDate);
                  return (
                    <tr key={r.correctionId} onClick={() => open(r)} className="h-[56px] cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                      <td className="py-2 pl-5 pr-4 text-[13px] font-semibold text-slate-900">{r.requestId}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-[13px] text-slate-800">
                        {day.date} <span className="text-slate-400">· {day.weekday}</span>
                      </td>
                      <td className="px-4 py-2"><TypeChip type={r.requestType} /></td>
                      <td className="px-4 py-2 text-[13px]"><RequestedTimes r={r} /></td>
                      <td className="max-w-[220px] truncate px-4 py-2 text-[13px] text-slate-600" title={r.reason}>{r.reason}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-[13px] text-slate-500">{submittedOn(r)}</td>
                      <td className="px-4 py-2"><StatusPill status={r.status} /></td>
                      <td className="whitespace-nowrap py-2 pl-4 pr-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            open(r);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-[color:var(--ac-main,#5B4CF8)] cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
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
            <li className="py-12 text-center text-sm text-slate-400">No regularization requests found.</li>
          ) : (
            rows.map((r) => {
              const day = formatDay(r.workDate);
              return (
                <li key={r.correctionId}>
                  <button type="button" onClick={() => open(r)} className="block w-full space-y-2 px-4 py-3.5 text-left active:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{r.requestId}</span>
                      <StatusPill status={r.status} />
                    </div>
                    <div className="text-[13px] text-slate-700">{day.date} <span className="text-slate-400">· {day.weekday}</span></div>
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <TypeChip type={r.requestType} />
                      <RequestedTimes r={r} />
                    </div>
                    {r.reason && <p className="line-clamp-2 text-xs text-slate-500">{r.reason}</p>}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {!isLoading && filtered.length > 0 && (
          <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>

      <AddRegularizationModal
        isOpen={isAddOpen}
        empId={viewing?.emp_id}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => loadRequests()}
      />

      <RegularizationDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRequest(null);
        }}
        onSuccess={() => loadRequests()}
        regularization={selectedRequest}
        isApproverView={false}
      />
    </div>
  );
};
