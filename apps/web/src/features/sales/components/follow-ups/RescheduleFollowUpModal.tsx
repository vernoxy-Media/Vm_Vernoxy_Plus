import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  
  
  AlertTriangle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useSalesFollowUpControllerReschedule } from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { istInputToIso, toInputDateTimeIST } from '../../utils/date';
import { parseApiError } from '../../utils/error';
import type { SalesFollowUpItem } from '../../types/sales.types';

export interface RescheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: SalesFollowUpItem | null;
  onSuccess?: () => void;
}

export const RescheduleFollowUpModal: React.FC<RescheduleFollowUpModalProps> = ({
  isOpen,
  onClose,
  followUp,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [followUpOnIST, setFollowUpOnIST] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(11, 0, 0, 0);
    return toInputDateTimeIST(d.toISOString());
  });

  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rescheduleMutation = useSalesFollowUpControllerReschedule();

  if (!followUp) return null;

  const rescheduleCount = followUp.rescheduled_count ?? 0;
  const isApproachingThreshold = rescheduleCount >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason.trim()) {
      setErrorMessage('Please state the reason for rescheduling');
      return;
    }

    const isoDate = istInputToIso(followUpOnIST);
    if (!isoDate) {
      setErrorMessage('Invalid date or time');
      return;
    }

    try {
      await rescheduleMutation.mutateAsync({
        id: followUp.id,
        data: {
          follow_up_on: isoDate,
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
      setErrorMessage(parsed.message || 'Failed to reschedule follow-up');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !rescheduleMutation.isPending && onClose()}
      title="Reschedule Follow-up"
      subtitle={`${followUp.type} with ${followUp.company_name || 'Lead'}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to reschedule</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {isApproachingThreshold && (
          <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Notice:</strong> This follow-up has already been rescheduled{' '}
              {rescheduleCount} times. Rescheduling for the 3rd time triggers a review notification to the sales administrator.
            </p>
          </div>
        )}

        {/* New Date and Time */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            New Date & Time (IST) <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={followUpOnIST}
            onChange={(e) => setFollowUpOnIST(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Reason for Rescheduling <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Client requested callback on Thursday; decision maker unavailable today..."
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

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
            disabled={rescheduleMutation.isPending || !reason.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 shadow-sm transition-colors min-h-[44px]"
          >
            {rescheduleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Confirm Reschedule</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
