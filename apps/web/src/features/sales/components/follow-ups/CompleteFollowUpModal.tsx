import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  
  
  
  
  
  
  
  
  AlertCircle,
  Loader2,
  
} from 'lucide-react';
import { ConversationBodyDtoOutcome, useSalesFollowUpControllerComplete } from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { istInputToIso, toInputDateTimeIST } from '../../utils/date';
import { parseApiError } from '../../utils/error';
import type {
  SalesFollowUpType,
  NextStepAction,
  SalesFollowUpItem,
} from '../../types/sales.types';

export interface CompleteFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: SalesFollowUpItem | null;
  onSuccess?: () => void;
}

export const CompleteFollowUpModal: React.FC<CompleteFollowUpModalProps> = ({
  isOpen,
  onClose,
  followUp,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [outcome, setOutcome] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [nextAction, setNextAction] = useState<NextStepAction>('schedule');

  // Next schedule parameters
  const [nextDateTimeIST, setNextDateTimeIST] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(11, 0, 0, 0);
    return toInputDateTimeIST(d.toISOString());
  });
  const [nextType, setNextType] = useState<SalesFollowUpType>('Call');
  const [nextPurpose, setNextPurpose] = useState('');

  // Hold parameters
  const [holdReason, setHoldReason] = useState('');
  const [holdCheckBackIST, setHoldCheckBackIST] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(11, 0, 0, 0);
    return toInputDateTimeIST(d.toISOString());
  });

  // Lost parameters
  const [lostReason, setLostReason] = useState('Price too high');
  const [lostNote, setLostNote] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completeMutation = useSalesFollowUpControllerComplete();

  if (!followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!outcome) {
      setErrorMessage('Please choose the outcome of this follow-up');
      return;
    }
    if (!whatHappened.trim()) {
      setErrorMessage('Please describe what happened during this follow-up');
      return;
    }

    // Build next_step object
    let nextStepPayload: {
      action: NextStepAction;
      follow_up_on?: string;
      type?: SalesFollowUpType;
      purpose?: string;
      reason?: string;
      lost_reason?: string;
      note?: string;
    } = { action: nextAction };

    if (nextAction === 'schedule') {
      const isoTime = istInputToIso(nextDateTimeIST);
      if (!isoTime) {
        setErrorMessage('Invalid date or time for the next follow-up');
        return;
      }
      nextStepPayload = {
        action: 'schedule',
        follow_up_on: isoTime,
        type: nextType,
        purpose: nextPurpose.trim() || undefined,
      };
    } else if (nextAction === 'hold') {
      const isoTime = istInputToIso(holdCheckBackIST);
      if (!isoTime) {
        setErrorMessage('Invalid check-back date or time');
        return;
      }
      if (!holdReason.trim()) {
        setErrorMessage('Please provide a reason for putting the talks on hold');
        return;
      }
      nextStepPayload = {
        action: 'hold',
        follow_up_on: isoTime,
        reason: holdReason.trim(),
      };
    } else if (nextAction === 'lost') {
      if (lostReason === 'Other' && !lostNote.trim()) {
        setErrorMessage('Please provide a note explaining why the deal was lost');
        return;
      }
      nextStepPayload = {
        action: 'lost',
        lost_reason: lostReason,
        note: lostNote.trim() || undefined,
      };
    }

    try {
      await completeMutation.mutateAsync({
        id: followUp.id,
        data: {
          outcome: outcome as never,
          what_happened: whatHappened.trim(),
          next_step: nextStepPayload as never,
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
      setErrorMessage(parsed.message || 'Failed to complete follow-up');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !completeMutation.isPending && onClose()}
      title="Complete Follow-up"
      subtitle={`${followUp.type} with ${followUp.company_name || 'Lead'} • ${followUp.contact_name || 'Contact'}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to complete</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Outcome */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Outcome Status <span className="text-red-500">*</span>
          </label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
          >
            <option value="">Select outcome...</option>
            {Object.values(ConversationBodyDtoOutcome).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        {/* What Happened (Saved as conversation) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            What Happened / Discussion Summary <span className="text-red-500">*</span>
          </label>
          <textarea
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            rows={3}
            placeholder="Summarize key points discussed, client feedback, and any agreed next steps. (Saved as a conversation record)"
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Next Step Selector */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold text-gray-700 mb-2">Next Pipeline Action</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
            {[
              { action: 'schedule' as const, label: 'Next Follow-up' },
              { action: 'qualify' as const, label: 'Qualify Lead' },
              { action: 'hold' as const, label: 'Put On Hold' },
              { action: 'lost' as const, label: 'Mark Lost' },
              { action: 'none' as const, label: 'No Action' },
            ].map((opt) => (
              <button
                key={opt.action}
                type="button"
                onClick={() => setNextAction(opt.action)}
                className={`p-2 rounded-lg border text-center transition-colors font-medium text-xs ${
                  nextAction === opt.action
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Next Step Config Panels */}
          {nextAction === 'schedule' && (
            <div className="mt-3 p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Date & Time (IST)</label>
                  <input
                    type="datetime-local"
                    value={nextDateTimeIST}
                    onChange={(e) => setNextDateTimeIST(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Channel</label>
                  <select
                    value={nextType}
                    onChange={(e) => setNextType(e.target.value as SalesFollowUpType)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white"
                  >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Site Visit">Site Visit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-2xs font-semibold text-gray-700 mb-1">Purpose</label>
                <input
                  type="text"
                  value={nextPurpose}
                  onChange={(e) => setNextPurpose(e.target.value)}
                  placeholder="e.g. Check quote review status"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>
          )}

          {nextAction === 'hold' && (
            <div className="mt-3 p-3.5 rounded-lg border border-amber-200 bg-amber-50/50 space-y-3 animate-in fade-in duration-150 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason for Hold</label>
                <input
                  type="text"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="e.g. Awaiting budget sanction"
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Check-back Date (IST)</label>
                <input
                  type="datetime-local"
                  value={holdCheckBackIST}
                  onChange={(e) => setHoldCheckBackIST(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white"
                />
              </div>
            </div>
          )}

          {nextAction === 'lost' && (
            <div className="mt-3 p-3.5 rounded-lg border border-red-200 bg-red-50/50 space-y-3 animate-in fade-in duration-150 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Lost Reason</label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white"
                >
                  <option value="Price too high">Price too high</option>
                  <option value="Went with competitor">Went with competitor</option>
                  <option value="Project cancelled">Project cancelled</option>
                  <option value="Unresponsive">Unresponsive</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {lostReason === 'Other' && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Note</label>
                  <input
                    type="text"
                    value={lostNote}
                    onChange={(e) => setLostNote(e.target.value)}
                    placeholder="Explanation required..."
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
              )}
            </div>
          )}
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
            disabled={completeMutation.isPending || !whatHappened.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors min-h-[44px]"
          >
            {completeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Complete Follow-up</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
