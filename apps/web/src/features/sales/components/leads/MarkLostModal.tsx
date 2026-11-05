import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  
  AlertCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  useSalesLeadStatusControllerLost,
  useSalesLeadControllerMasters,
} from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { parseApiError } from '../../utils/error';
import { EMPTY_LEAD_MASTERS } from '../../types/sales.types';
import type { SalesLeadMastersResponse } from '../../types/sales.types';

export interface MarkLostModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadCode?: string;
  companyName?: string;
  onSuccess?: () => void;
}

export const MarkLostModal: React.FC<MarkLostModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadCode,
  companyName,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Fetch masters
  const { data: mastersRaw } = useSalesLeadControllerMasters();
  const masters: SalesLeadMastersResponse = (
    (mastersRaw as unknown as { data?: SalesLeadMastersResponse })?.data ??
    (mastersRaw as unknown as SalesLeadMastersResponse) ?? EMPTY_LEAD_MASTERS
  );

  const reasonList = masters.lost_reasons ?? [];

  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lostMutation = useSalesLeadStatusControllerLost();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason) {
      setErrorMessage('Please choose a lost reason');
      return;
    }
    if (reason === 'Other' && !note.trim()) {
      setErrorMessage('Please provide an explanation when selecting "Other"');
      return;
    }

    try {
      await lostMutation.mutateAsync({
        id: leadId,
        data: {
          reason,
          note: note.trim() || undefined,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/follow-ups'] });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Failed to mark lead as lost');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !lostMutation.isPending && onClose()}
      title="Mark Lead as Lost"
      subtitle={
        companyName
          ? `${companyName} (${leadCode || `LEAD-${leadId}`})`
          : 'Record reasons for deal loss. Any open pending follow-ups will be cancelled.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to mark as lost</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Marking this lead as Lost will archive the opportunity and automatically cancel any
            scheduled future follow-ups. You can reopen this lead at any time later.
          </p>
        </div>

        {/* Reason Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Primary Reason for Loss <span className="text-red-500">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
          >
            <option value="">Select a reason...</option>
            {reasonList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Additional Note */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Additional Details / Competitor Info {reason === 'Other' && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={
              reason === 'Other'
                ? 'Required: please explain why the deal was lost...'
                : 'Optional: name of winning competitor, feedback on our proposal, or timeline details...'
            }
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={lostMutation.isPending || (reason === 'Other' && !note.trim())}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 shadow-sm transition-colors min-h-[44px]"
          >
            {lostMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Confirm Lost</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
