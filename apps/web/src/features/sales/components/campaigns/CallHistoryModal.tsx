import React from 'react';
import { PhoneCall, PhoneMissed } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useCampaignCalls } from '../../hooks/useCampaigns';
import { parseApiError } from '../../utils/error';
import type { CampaignCompany } from '../../types/campaign.types';
import { fmtDateTime, fmtDuration, secondaryBtn } from './campaign-ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campaignId: number;
  company: CampaignCompany | null;
}

export const CallHistoryModal: React.FC<Props> = ({ isOpen, onClose, campaignId, company }) => {
  const { data, isLoading, isError, error } = useCampaignCalls(isOpen ? campaignId : undefined, company?.campaign_company_id);
  if (!company) return null;
  const calls = data?.items ?? [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Call history"
      subtitle={company.company_name}
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
        <p className="py-6 text-center text-sm text-gray-500">No calls yet.</p>
      ) : (
        <ol className="space-y-3">
          {calls.map((c) => {
            const missed = c.call_status === 'Not received';
            return (
              <li key={c.call_id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${missed ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {missed ? <PhoneMissed className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />}
                    {missed ? 'Not received' : 'Connected'}
                    {c.outcome ? <span className="font-medium text-gray-700"> · {c.outcome}</span> : null}
                  </span>
                  <span className="text-xs text-gray-500">{fmtDateTime(c.called_at)}</span>
                </div>
                {missed ? (
                  c.not_received_reason && <p className="mt-1 text-sm text-gray-600">Reason: {c.not_received_reason}</p>
                ) : (
                  <>
                    {c.what_discussed && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{c.what_discussed}</p>}
                    {c.call_duration_seconds ? <p className="mt-1 text-xs text-gray-500">Length: {fmtDuration(c.call_duration_seconds)}</p> : null}
                  </>
                )}
                {c.emp_name && <p className="mt-1 text-xs text-gray-400">By {c.emp_name}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
};
