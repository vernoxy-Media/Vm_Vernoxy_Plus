import React from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { useReceivedCalls, type ReceivedCallRecord, type SalesReportFilters } from '../../hooks/useSalesReport';
import { parseApiError } from '../../utils/error';
import { fmtDateTime, secondaryBtn } from '../campaigns/campaign-ui';

interface Props {
  /** The chosen outcome, or null when the popup is closed. */
  outcome: string | null;
  filters: SalesReportFilters;
  canChooseUser: boolean;
  onClose: () => void;
}

/** One entry per company, keeping the server's order. A call with no company stays on its own. */
function byCompany(calls: ReceivedCallRecord[]) {
  const groups = new Map<string, ReceivedCallRecord[]>();
  for (const c of calls) {
    const key = c.company_id !== null ? `company-${c.company_id}` : `call-${c.communication_id}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  return [...groups.entries()];
}

export const ReceivedCallsModal: React.FC<Props> = ({ outcome, filters, canChooseUser, onClose }) => {
  const { data, isLoading, isError, error } = useReceivedCalls(filters, canChooseUser, outcome);
  if (outcome === null) return null;
  const calls = data?.items ?? [];
  const companies = byCompany(calls);

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      title={`Received calls: ${outcome}`}
      subtitle={data ? `${calls.length} ${calls.length === 1 ? 'call' : 'calls'}, grouped by company` : undefined}
      footer={
        <div className="flex w-full justify-end">
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
        <ul className="space-y-3">
          {companies.map(([key, rows]) => (
            <li key={key} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                {rows[0].company_id !== null ? (
                  <Link to={`/sales/companies/${rows[0].company_id}`} className="font-semibold text-blue-700 hover:underline">
                    {rows[0].company_name}
                  </Link>
                ) : (
                  <span className="font-semibold text-gray-900">{rows[0].company_name ?? 'No company'}</span>
                )}
                <span className="shrink-0 text-xs font-medium text-gray-500">
                  {rows.length} {rows.length === 1 ? 'call' : 'calls'}
                </span>
              </div>
              <ul className="mt-2 divide-y divide-gray-100">
                {rows.map((c) => (
                  <li key={c.communication_id} className="py-2">
                    <p className="text-xs text-gray-500">
                      {fmtDateTime(c.call_date)}
                      {c.contact_person ? ` · Spoke with ${c.contact_person}` : ''}
                      {c.called_by ? ` · By ${c.called_by}` : ''}
                    </p>
                    {c.what_discussed && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-700">{c.what_discussed}</p>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};
