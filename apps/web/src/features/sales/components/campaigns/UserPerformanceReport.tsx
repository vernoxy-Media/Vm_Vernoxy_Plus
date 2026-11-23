import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { useUserPerformance, usePositiveLeads, useUserCalls } from '../../hooks/useCampaigns';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { TableSkeleton } from '../common/SkeletonLoader';
import { parseApiError } from '../../utils/error';
import { formatDateTimeIST } from '../../utils/date';
import { cardCls, inputCls, secondaryBtn } from './campaign-ui';

const th = 'px-4 py-3';
const td = 'px-4 py-3 text-gray-700';

/**
 * Campaign Performance Report: a user-wise calling summary for a date range.
 * The Admin sees every user; a Sales user only gets their own row (the server enforces that).
 */
export const UserPerformanceReport: React.FC<{ title?: string }> = ({ title = 'Campaign performance - user wise' }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [openUser, setOpenUser] = useState<{ emp_id: number; name: string } | null>(null);
  const [callsUser, setCallsUser] = useState<{ emp_id: number; name: string } | null>(null);

  const invalidRange = Boolean(from && to && to < from);
  const range = { from: from || undefined, to: to || undefined };
  const { data, isLoading, isError, error, refetch } = useUserPerformance(range, !invalidRange);
  const items = data?.items ?? [];
  const filtered = Boolean(from || to);

  return (
    <section className="space-y-3" aria-label="Campaign performance, user wise">
      {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
      <div className={`${cardCls} flex flex-wrap items-end gap-3 p-3`}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600">From date</span>
          <input type="date" className={`${inputCls} !w-44`} aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600">To date</span>
          <input type="date" className={`${inputCls} !w-44`} aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        {filtered && (
          <button type="button" className={secondaryBtn} onClick={() => { setFrom(''); setTo(''); }}>
            Clear
          </button>
        )}
        <p className="ml-auto self-center text-xs text-gray-500">
          {filtered ? `Showing ${from || 'start'} to ${to || 'today'}` : 'Showing all dates'} · click a Calls done or Positive responses number to see details
        </p>
      </div>
      {invalidRange && <p className="text-sm text-rose-600">The To date cannot be before the From date.</p>}

      {isLoading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-700">{parseApiError(error).message}</p>
          <button type="button" className={`${secondaryBtn} mt-3`} onClick={() => refetch()}>Try again</button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No calling activity" description={filtered ? 'Nothing was allotted or called in this date range.' : 'Nothing is assigned yet.'} />
      ) : (
        <div className={`${cardCls} overflow-x-auto`}>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className={th}>User</th>
                <th className={th} title="Companies assigned in campaigns running in this period">Calls allotted</th>
                <th className={th} title="Calls made in this period">Calls done</th>
                <th className={th} title="Calls that were picked up">Calls received</th>
                <th className={th} title="Companies that said Interested. Click to see them.">Positive responses</th>
                <th className={th} title="Allotted companies not yet called">Pending calls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((r) => (
                <tr key={r.emp_id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.emp_name}</td>
                  <td className={td}>{r.calls_allotted}</td>
                  <td className="px-4 py-3">
                    {r.calls_done > 0 ? (
                      <button
                        type="button"
                        className="font-semibold text-blue-600 underline-offset-2 hover:underline"
                        onClick={() => setCallsUser({ emp_id: r.emp_id, name: r.emp_name })}
                        aria-label={`Show ${r.calls_done} calls of ${r.emp_name}`}
                      >
                        {r.calls_done}
                      </button>
                    ) : (
                      <span className="text-gray-700">0</span>
                    )}
                  </td>
                  <td className={td}>{r.calls_received}</td>
                  <td className="px-4 py-3">
                    {r.positive_responses > 0 ? (
                      <button
                        type="button"
                        className="font-semibold text-blue-600 underline-offset-2 hover:underline"
                        onClick={() => setOpenUser({ emp_id: r.emp_id, name: r.emp_name })}
                        aria-label={`Show ${r.positive_responses} positive leads of ${r.emp_name}`}
                      >
                        {r.positive_responses}
                      </button>
                    ) : (
                      <span className="text-gray-700">0</span>
                    )}
                  </td>
                  <td className={td}>{r.pending_calls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {callsUser && <UserCallsModal user={callsUser} from={from || undefined} to={to || undefined} onClose={() => setCallsUser(null)} />}
      {openUser && <PositiveLeadsModal user={openUser} from={from || undefined} to={to || undefined} onClose={() => setOpenUser(null)} />}
    </section>
  );
};

const UserCallsModal: React.FC<{ user: { emp_id: number; name: string }; from?: string; to?: string; onClose: () => void }> = ({ user, from, to, onClose }) => {
  const { data, isLoading, isError, error, refetch } = useUserCalls({ emp_id: user.emp_id, from, to });
  const items = data?.items ?? [];

  return (
    <Modal isOpen onClose={onClose} size="4xl" title={`Calls - ${user.name}`} subtitle={from || to ? `${from ?? 'Start'} to ${to ?? 'today'}` : 'All dates'}>
      {isLoading ? (
        <TableSkeleton rows={4} columns={6} />
      ) : isError ? (
        <div className="p-4 text-center">
          <p className="text-sm text-gray-700">{parseApiError(error).message}</p>
          <button type="button" className={`${secondaryBtn} mt-3`} onClick={() => refetch()}>Try again</button>
        </div>
      ) : items.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-500">No calls in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className={th}>Company</th>
                <th className={th}>Campaign</th>
                <th className={th}>Call date</th>
                <th className={th}>Call status</th>
                <th className={th}>Result</th>
                <th className={th}>What was discussed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => (
                <tr key={c.call_id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{c.company_name}</p>
                    <p className="text-xs text-gray-500">{[c.contact_person, c.contact_number].filter(Boolean).join(' · ') || '-'}</p>
                  </td>
                  <td className={td}>{c.campaign_name}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDateTimeIST(c.call_date)}</td>
                  <td className={td}>{c.call_status === 'Received' ? 'Connected' : 'Not received'}</td>
                  <td className={td}>{c.outcome || c.not_received_reason || '-'}</td>
                  <td className={`${td} max-w-xs`}>{c.what_discussed || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};

const PositiveLeadsModal: React.FC<{ user: { emp_id: number; name: string }; from?: string; to?: string; onClose: () => void }> = ({ user, from, to, onClose }) => {
  const { data, isLoading, isError, error, refetch } = usePositiveLeads({ emp_id: user.emp_id, from, to });
  const items = data?.items ?? [];

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="4xl"
      title={`Positive leads - ${user.name}`}
      subtitle={from || to ? `${from ?? 'Start'} to ${to ?? 'today'}` : 'All dates'}
    >
      {isLoading ? (
        <TableSkeleton rows={4} columns={7} />
      ) : isError ? (
        <div className="p-4 text-center">
          <p className="text-sm text-gray-700">{parseApiError(error).message}</p>
          <button type="button" className={`${secondaryBtn} mt-3`} onClick={() => refetch()}>Try again</button>
        </div>
      ) : items.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-500">No positive leads in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className={th}>Company</th>
                <th className={th}>Contact person</th>
                <th className={th}>Contact number</th>
                <th className={th}>Campaign</th>
                <th className={th}>Call date</th>
                <th className={th}>Lead status</th>
                <th className={th}>Assigned user</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((l) => (
                <tr key={l.campaign_company_id}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{l.company_name}</td>
                  <td className={td}>{l.contact_person || '-'}</td>
                  <td className={td}>{l.contact_number || '-'}</td>
                  <td className={td}>{l.campaign_name}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDateTimeIST(l.call_date)}</td>
                  <td className={td}>{l.lead_status}</td>
                  <td className={td}>{l.assigned_user || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};
