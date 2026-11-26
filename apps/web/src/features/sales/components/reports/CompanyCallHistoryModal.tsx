import React from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { useCompanyCallHistory, type CompanyCallRow } from '../../hooks/useSalesReport';
import { parseApiError } from '../../utils/error';
import { fmtDuration, secondaryBtn } from '../campaigns/campaign-ui';
import { fmtCallDate } from './format';

interface Props {
  /** The chosen company, or null when the popup is closed. */
  company: CompanyCallRow | null;
  isAdmin: boolean;
  onClose: () => void;
}

export const CompanyCallHistoryModal: React.FC<Props> = ({ company, isAdmin, onClose }) => {
  const { data, isLoading, isError, error } = useCompanyCallHistory(company?.company_id ?? null);
  if (!company) return null;
  const calls = data?.items ?? [];

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="4xl"
      title={`Call history: ${company.company_name}`}
      subtitle={isAdmin ? 'All calls from every date. The report filters do not apply here.' : 'All your calls from every date. The report filters do not apply here.'}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Link to={`/sales/companies/${company.company_id}`} className="text-sm font-semibold text-blue-700 hover:underline">
            Open company
          </Link>
          <button type="button" className={secondaryBtn} onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {isLoading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading…</p>
      ) : isError ? (
        <p role="alert" className="py-6 text-center text-sm text-rose-600">
          {parseApiError(error).message}
        </p>
      ) : calls.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No calls found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <th className="py-2 pr-3">Call date</th>
                <th className="px-3 py-2">Sales user</th>
                <th className="px-3 py-2">Call status</th>
                <th className="px-3 py-2">Outcome</th>
                <th className="px-3 py-2">Duration</th>
                <th className="py-2 pl-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {calls.map((c) => (
                <tr key={c.communication_id}>
                  <td className="whitespace-nowrap py-2.5 pr-3">{fmtCallDate(c.call_date)}</td>
                  <td className="px-3 py-2.5">{c.called_by ?? '-'}</td>
                  <td className={`px-3 py-2.5 font-semibold ${c.call_status === 'Received' ? 'text-emerald-600' : c.call_status === 'Not received' ? 'text-rose-600' : 'text-slate-400'}`}>
                    {c.call_status ?? 'Not recorded'}
                  </td>
                  <td className="px-3 py-2.5">{c.outcome ?? '-'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{fmtDuration(c.duration_seconds)}</td>
                  <td className="whitespace-pre-wrap break-words py-2.5 pl-3 text-slate-700">{c.remark || c.not_received_reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};
