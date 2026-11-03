import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSalesFollowUpControllerCancel } from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { parseApiError } from '../../utils/error';
import type { SalesFollowUpItem } from '../../types/sales.types';

export interface CancelFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: SalesFollowUpItem | null;
  onSuccess?: () => void;
}

export const CancelFollowUpModal: React.FC<CancelFollowUpModalProps> = ({
  isOpen,
  onClose,
  followUp,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cancelMutation = useSalesFollowUpControllerCancel();

  if (!followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason.trim()) {
      setErrorMessage('Please state the reason for cancellation');
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        id: followUp.id,
        data: {
          reason: reason.trim(),
        },
      });

      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
      if (followUp.lead_id) {
        queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${followUp.lead_id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${followUp.lead_id}/follow-ups`] });
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Failed to cancel follow-up');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !cancelMutation.isPending && onClose()}
      title="Cancel Follow-up"
      subtitle={`${followUp.type} with ${followUp.company_name || 'Lead'}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to cancel</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Reason for Cancellation <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. No longer needed; lead converted; duplicate follow-up..."
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
          >
            Keep Active
          </button>
          <button
            type="submit"
            disabled={cancelMutation.isPending || !reason.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 shadow-sm transition-colors min-h-[44px]"
          >
            {cancelMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Cancel Follow-up</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
