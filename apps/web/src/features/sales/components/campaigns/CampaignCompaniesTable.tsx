import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, PhoneCall, Search, Trash2, UserCheck } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { EmptyState } from '../common/EmptyState';
import { TableSkeleton } from '../common/SkeletonLoader';
import { useDebounce } from '../../hooks/useDebounce';
import { useAssignCompanies, useCampaignCompanies, useRemoveCompanies } from '../../hooks/useCampaigns';
import { parseApiError } from '../../utils/error';
import { CALLING_FILTERS, type CampaignCompany } from '../../types/campaign.types';
import { CallingStatusPill, fmtDateTime, inputCls, isDueByToday, secondaryBtn } from './campaign-ui';

const PAGE_SIZE = 20;

interface Props {
  campaignId: number;
  /** The Admin sees every company and can assign or remove; a Sales user sees only their own and can log calls. */
  isAdmin: boolean;
  campaignActive: boolean;
  employees: { emp_id: number; name: string }[];
  /** Pre-set filter, for example "unassigned" when coming from the Assign tab. */
  initialAssigned?: string;
  onLogCall: (c: CampaignCompany) => void;
  onHistory: (c: CampaignCompany) => void;
}

export const CampaignCompaniesTable: React.FC<Props> = ({ campaignId, isAdmin, campaignActive, employees, initialAssigned, onLogCall, onHistory }) => {
  const [search, setSearch] = useState('');
  const [assigned, setAssigned] = useState(initialAssigned ?? '');
  const [calling, setCalling] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [assignTo, setAssignTo] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const q = useDebounce(search.trim(), 300);

  useEffect(() => {
    if (initialAssigned !== undefined) setAssigned(initialAssigned);
  }, [initialAssigned]);

  const { data, isLoading, isError, error, refetch } = useCampaignCompanies(campaignId, {
    q: q || undefined,
    assigned_to: isAdmin ? assigned || undefined : undefined,
    calling: calling || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const assign = useAssignCompanies(campaignId);
  const remove = useRemoveCompanies(campaignId);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageIds = useMemo(() => items.map((c) => c.campaign_company_id), [items]);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected((s) => (allOnPage ? s.filter((id) => !pageIds.includes(id)) : [...new Set([...s, ...pageIds])]));

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
    setSelected([]);
  };

  const doAssign = () => {
    if (selected.length === 0 || !assignTo) return;
    setMessage(null);
    assign.mutate(
      { mode: 'manual', campaign_company_ids: selected, emp_id: assignTo === 'none' ? null : Number(assignTo) },
      {
        onSuccess: (r) => {
          setMessage({ tone: 'ok', text: `${r.assigned} ${r.assigned === 1 ? 'company' : 'companies'} updated.` });
          setSelected([]);
          setAssignTo('');
        },
        onError: (e) => setMessage({ tone: 'error', text: parseApiError(e).message }),
      },
    );
  };

  const doRemove = () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Take ${selected.length} ${selected.length === 1 ? 'company' : 'companies'} out of this campaign? Companies that were already called stay, to keep the call history.`)) return;
    setMessage(null);
    remove.mutate(selected, {
      onSuccess: (r) => {
        setMessage({
          tone: 'ok',
          text: `${r.removed} removed.${r.kept > 0 ? ` ${r.kept} stayed because they were already called.` : ''}`,
        });
        setSelected([]);
      },
      onError: (e) => setMessage({ tone: 'error', text: parseApiError(e).message }),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search company, code or phone"
            aria-label="Search companies"
            value={search}
            onChange={(e) => reset(() => setSearch(e.target.value))}
          />
        </div>
        {isAdmin && (
          <select className={`${inputCls} lg:w-52`} aria-label="Assigned to" value={assigned} onChange={(e) => reset(() => setAssigned(e.target.value))}>
            <option value="">All employees</option>
            <option value="unassigned">Not assigned</option>
            {employees.map((e) => (
              <option key={e.emp_id} value={e.emp_id}>
                {e.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Calling status">
        {[{ key: '', label: 'All' }, ...CALLING_FILTERS].map((f) => (
          <button
            key={f.key || 'all'}
            type="button"
            role="tab"
            aria-selected={calling === f.key}
            onClick={() => reset(() => setCalling(f.key))}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              calling === f.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isAdmin && selected.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 sm:flex-row sm:items-center">
          <span className="text-sm font-semibold text-blue-900">{selected.length} selected</span>
          <select className={`${inputCls} sm:w-56`} aria-label="Assign selected to" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">Assign to…</option>
            {employees.map((e) => (
              <option key={e.emp_id} value={e.emp_id}>
                {e.name}
              </option>
            ))}
            <option value="none">Not assigned (take back)</option>
          </select>
          <button type="button" className={secondaryBtn} onClick={doAssign} disabled={!assignTo || assign.isPending}>
            <UserCheck className="h-4 w-4" /> Assign
          </button>
          <button type="button" className={`${secondaryBtn} text-rose-600`} onClick={doRemove} disabled={remove.isPending}>
            <Trash2 className="h-4 w-4" /> Remove
          </button>
          <button type="button" className="text-sm text-gray-500 underline sm:ml-auto" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}

      {message && (
        <div
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-3 py-2 text-sm ${message.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
        >
          {message.text}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-700">{parseApiError(error).message}</p>
          <button type="button" className={`${secondaryBtn} mt-3`} onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title={isAdmin ? 'No companies here' : 'No companies to call'}
          description={
            q || calling || assigned
              ? 'No company matches these filters.'
              : isAdmin
                ? 'Open the "Add companies" tab to pick companies from the Company Database.'
                : 'Nothing has been assigned to you in this campaign yet.'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {isAdmin && (
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300" />
                  </th>
                )}
                <th className="px-3 py-3">Company</th>
                <th className="px-3 py-3">City</th>
                <th className="px-3 py-3">Contact number</th>
                {isAdmin && <th className="px-3 py-3">Assigned to</th>}
                <th className="px-3 py-3">Calling status</th>
                <th className="px-3 py-3">Calls</th>
                <th className="px-3 py-3">Next follow-up</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => {
                const due = isDueByToday(c.next_follow_up_on);
                return (
                  <tr key={c.campaign_company_id} className="hover:bg-gray-50/60">
                    {isAdmin && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${c.company_name}`}
                          checked={selected.includes(c.campaign_company_id)}
                          onChange={() => toggle(c.campaign_company_id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <Link to={`/sales/companies/${c.company_id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                        {c.company_name}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {c.company_code ?? ''}
                        {c.contact_person ? `${c.company_code ? ' · ' : ''}${c.contact_person}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{c.city ?? '-'}</td>
                    <td className="px-3 py-3">
                      {c.mobile ? (
                        <a href={`tel:${c.mobile}`} className="font-mono text-[13px] text-blue-600 hover:underline">
                          {c.mobile}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {isAdmin && <td className="px-3 py-3 text-gray-700">{c.assigned_to_name ?? <span className="text-amber-600">Not assigned</span>}</td>}
                    <td className="px-3 py-3">
                      <CallingStatusPill status={c.calling_status} />
                      {c.meeting_scheduled && <span className="ml-1.5 text-[11px] font-semibold text-violet-600">Meeting</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-700">{c.call_attempts}</td>
                    <td className={`px-3 py-3 ${due ? 'font-semibold text-rose-600' : 'text-gray-700'}`}>{fmtDateTime(c.next_follow_up_on)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        {c.call_attempts > 0 && (
                          <button type="button" className={`${secondaryBtn} !h-8 !px-2.5`} onClick={() => onHistory(c)} aria-label={`Call history of ${c.company_name}`} title="Call history">
                            <History className="h-4 w-4" />
                          </button>
                        )}
                        {c.assigned_to !== null && (
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => onLogCall(c)}
                            disabled={!campaignActive}
                            title={campaignActive ? 'Log a call' : 'The campaign is not active'}
                          >
                            <PhoneCall className="h-3.5 w-3.5" /> Log call
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} onPageChange={(p) => setPage(p)} />
    </div>
  );
};
