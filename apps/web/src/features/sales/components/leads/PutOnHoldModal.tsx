import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  
  
  AlertCircle,
  Loader2,
  
  Phone,
  Mail,
  MessageSquare,
  Users,
} from 'lucide-react';
import { useSalesLeadStatusControllerHold } from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { istInputToIso, toInputDateTimeIST } from '../../utils/date';
import { parseApiError } from '../../utils/error';
import type { SalesFollowUpType } from '../../types/sales.types';

export interface PutOnHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadCode?: string;
  companyName?: string;
  onSuccess?: () => void;
}

export const PutOnHoldModal: React.FC<PutOnHoldModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadCode,
  companyName,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Next week date by default for check-back
  const getDefaultCheckBackDateTime = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(11, 0, 0, 0);
    return toInputDateTimeIST(nextWeek.toISOString());
  };

  const [reason, setReason] = useState('');
  const [followUpOnIST, setFollowUpOnIST] = useState(getDefaultCheckBackDateTime());
  const [type, setType] = useState<SalesFollowUpType>('Call');
  const purpose = '';
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const holdMutation = useSalesLeadStatusControllerHold();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!reason.trim()) {
      setErrorMessage('Please state the reason for putting this lead on hold');
      return;
    }

    if (!followUpOnIST) {
      setErrorMessage('Please specify a check-back date and time');
      return;
    }

    const isoDate = istInputToIso(followUpOnIST);
    if (!isoDate) {
      setErrorMessage('Invalid date or time format');
      return;
    }

    try {
      await holdMutation.mutateAsync({
        id: leadId,
        data: {
          reason: reason.trim(),
          follow_up_on: isoDate,
          type,
          purpose: purpose.trim() || `Check back on paused discussions: ${reason.trim()}`,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/follow-ups'] });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Failed to put lead on hold');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !holdMutation.isPending && onClose()}
      title="Put Lead On Hold"
      subtitle={
        companyName
          ? `${companyName} (${leadCode || `LEAD-${leadId}`})`
          : 'Pause sales outreach and schedule an automatic check-back follow-up.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to put on hold</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Reason for Hold */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Reason for Pause / Hold <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Client budget review scheduled for next month; awaiting management signoff..."
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Check-back Date & Time */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Check-back Date & Time (IST) <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={followUpOnIST}
            onChange={(e) => setFollowUpOnIST(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
          />
          <p className="text-2xs text-gray-500 mt-0.5">
            A Pending follow-up will automatically be scheduled for this check-back date.
          </p>
        </div>

        {/* Check-back follow-up type */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Check-back Channel
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { type: 'Call' as const, label: 'Call', icon: Phone },
              { type: 'Email' as const, label: 'Email', icon: Mail },
              { type: 'WhatsApp' as const, label: 'WhatsApp', icon: MessageSquare },
              { type: 'Meeting' as const, label: 'Meeting', icon: Users },
            ].map((opt) => {
              const Icon = opt.icon;
              const isSelected = type === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setType(opt.type)}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-colors ${
                    isSelected
                      ? 'border-amber-400 bg-amber-50 text-amber-800 font-semibold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
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
            disabled={holdMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 shadow-sm transition-colors min-h-[44px]"
          >
            {holdMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Put On Hold</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
