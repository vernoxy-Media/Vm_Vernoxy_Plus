import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  Mail,
  MessageSquare,
  Users,
  MapPin,
  Plus,
  
  
  User,
  AlertCircle,
  Loader2,
  
  
} from 'lucide-react';
import {
  ConversationBodyDtoOutcome,
  useSalesActivityControllerLeadConversations,
  useSalesActivityControllerLogOnLead,
  
} from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { formatDateTimeIST, timeAgo, istInputToIso, toInputDateTimeIST } from '../../utils/date';
import { parseApiError } from '../../utils/error';
import { unwrapList } from '../../utils/response';
import type {
  ConversationItem,
  SalesContactItem,
  SalesFollowUpType,
} from '../../types/sales.types';

export interface ConversationTimelineProps {
  leadId: number;
  contacts: SalesContactItem[];
  /** Open the Log Conversation pop-up as soon as the tab shows. */
  autoOpen?: boolean;
}

export const ConversationTimeline: React.FC<ConversationTimelineProps> = ({
  leadId,
  contacts = [],
  autoOpen = false,
}) => {
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: convRaw, isLoading } = useSalesActivityControllerLeadConversations(
    leadId,
    undefined as never,
    {
      query: {
        enabled: Boolean(leadId),
      },
    },
  );

  const conversations: ConversationItem[] = unwrapList<ConversationItem>(convRaw);

  // Log Conversation modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<SalesFollowUpType>('Call');
  const [contactId, setContactId] = useState<number | ''>(
    contacts[0]?.person_id || contacts[0]?.company_person_id || '',
  );
  const [outcome, setOutcome] = useState<ConversationBodyDtoOutcome | ''>('');
  const [notes, setNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextDateTimeIST, setNextDateTimeIST] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(11, 0, 0, 0);
    return toInputDateTimeIST(d.toISOString());
  });
  const [nextType, setNextType] = useState<SalesFollowUpType>('Call');
  const [nextPurpose, setNextPurpose] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mutations
  const logMutation = useSalesActivityControllerLogOnLead();

  const handleOpenLog = () => {
    setType('Call');
    setContactId(contacts[0]?.person_id || contacts[0]?.company_person_id || '');
    setOutcome('');
    setNotes('');
    setScheduleNext(false);
    setErrorMessage(null);
    setModalOpen(true);
  };

  React.useEffect(() => {
    if (autoOpen) handleOpenLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!outcome.trim()) {
      setErrorMessage('Please choose the outcome of the conversation.');
      return;
    }

    const nextFollowUpPayload = scheduleNext
      ? {
          follow_up_on: istInputToIso(nextDateTimeIST) || undefined,
          type: nextType,
          purpose: nextPurpose.trim() || undefined,
        }
      : undefined;

    try {
      await logMutation.mutateAsync({
        id: leadId,
        data: {
          type,
          contact_id: contactId ? Number(contactId) : undefined,
          outcome: outcome as ConversationBodyDtoOutcome,
          what_discussed: notes.trim() || undefined,
          next_follow_up: nextFollowUpPayload,
        },
      });

      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}/conversations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}/follow-ups`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });

      setModalOpen(false);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Failed to log conversation');
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel?.toLowerCase()) {
      case 'call':
        return <Phone className="w-4 h-4 text-blue-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-purple-600" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'meeting':
        return <Users className="w-4 h-4 text-amber-600" />;
      case 'site visit':
        return <MapPin className="w-4 h-4 text-rose-600" />;
      default:
        return <Phone className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Conversations Log ({conversations.length})
          </h3>
          <p className="text-xs text-gray-500">
            Calls, emails, meetings, and WhatsApp exchanges with prospect contacts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenLog}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors self-start sm:self-auto min-h-[38px]"
        >
          <Plus className="w-4 h-4" />
          <span>Log Conversation</span>
        </button>
      </div>

      {/* Timeline List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200">
          <Phone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-800">No conversations logged yet</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            Logging your first conversation will automatically advance this lead from &ldquo;New&rdquo; to
            &ldquo;Contacted&rdquo;.
          </p>
          <button
            type="button"
            onClick={handleOpenLog}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Log First Conversation</span>
          </button>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:inset-0 before:left-3 sm:before:left-4 before:w-0.5 before:bg-gray-200">
          {conversations.map((conv) => (
            <div key={conv.communication_id} className="relative group text-xs space-y-2">
              {/* Dot Icon */}
              <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-2xs flex items-center justify-center shrink-0">
                {getChannelIcon(conv.type)}
              </div>

              {/* Card */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs group-hover:border-gray-300 transition-colors space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{conv.outcome ?? 'Conversation'}</span>
                    <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-gray-100 text-gray-700 uppercase">
                      {conv.type}
                    </span>
                  </div>

                  <span className="text-2xs text-gray-400">{formatDateTimeIST(conv.communication_date)}</span>
                </div>

                {conv.what_discussed && (
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">{conv.what_discussed}</p>
                )}

                <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-2xs text-gray-400">
                  <div className="flex items-center gap-3">
                    {conv.contact && (
                      <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                        <User className="w-3 h-3 text-gray-400" />
                        {conv.contact.name}
                      </span>
                    )}
                    <span>Logged by {conv.logged_by?.name || 'Representative'}</span>
                  </div>

                  <span>{timeAgo(conv.communication_date)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Conversation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !logMutation.isPending && setModalOpen(false)}
        title="Log Sales Conversation"
        subtitle="Record what was discussed and, if you like, set the next follow-up in the same step."
        size="md"
      >
        <form onSubmit={handleSubmitLog} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to log</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Channel Used
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit'] as SalesFollowUpType[]).map(
                (ch) => {
                  const isSelected = type === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setType(ch)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {getChannelIcon(ch)}
                      <span className="mt-1 text-2xs">{ch}</span>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Contact Person */}
          {contacts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Contact Person Spoken To
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
              >
                <option value="">Select contact...</option>
                {contacts.map((c) => (
                  <option key={c.company_person_id} value={c.person_id || c.company_person_id}>
                    {c.name} {c.designation ? `(${c.designation})` : ''} {c.is_primary ? '★ Primary' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Outcome */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Outcome <span className="text-red-500">*</span>
            </label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as ConversationBodyDtoOutcome | '')}
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

          {/* Discussion Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Discussion Details / Minutes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Discussed machinery overhaul project. They currently work with vendor X. Decision committee meets next Tuesday..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Atomic Next Follow-up Schedule Toggle */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 border-gray-300 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-800">
                Schedule next follow-up with this conversation
              </span>
            </label>

            {scheduleNext && (
              <div className="mt-3 p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs font-semibold text-gray-700 mb-1">
                      Next Due Date & Time (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={nextDateTimeIST}
                      onChange={(e) => setNextDateTimeIST(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-semibold text-gray-700 mb-1">Channel</label>
                    <select
                      value={nextType}
                      onChange={(e) => setNextType(e.target.value as SalesFollowUpType)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
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
                    placeholder="e.g. Share quotation and follow up on Tuesday meeting"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={logMutation.isPending || !outcome}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
            >
              {logMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Conversation</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
