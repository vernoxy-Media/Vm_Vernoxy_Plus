import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Phone, PhoneOff, Mail, MessageSquare, Users, MapPin, Plus, User, Loader2 } from 'lucide-react';
import { ConversationBodyDto, useSalesActivityControllerLeadConversations, useSalesActivityControllerLogOnLead } from '@vernoxy-pulse/api-client';

import { LogCommunicationModal, type LogCommunicationPayload } from '../common/LogCommunicationModal';
import { formatDateTimeIST, timeAgo } from '../../utils/date';
import { unwrapList } from '../../utils/response';
import type { ConversationItem, SalesContactItem } from '../../types/sales.types';

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

  const [modalOpen, setModalOpen] = useState(false);
  const logMutation = useSalesActivityControllerLogOnLead();

  const handleOpenLog = () => setModalOpen(true);

  React.useEffect(() => {
    if (autoOpen) handleOpenLog();
  }, [autoOpen]);

  const saveLog = async (payload: LogCommunicationPayload) => {
    await logMutation.mutateAsync({ id: leadId, data: payload as unknown as ConversationBodyDto });
    queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}/conversations`] });
    queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}/follow-ups`] });
    queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
  };

  const getChannelIcon = (channel: string, notReceived = false) => {
    if (notReceived) return <PhoneOff className="w-4 h-4 text-rose-600" />;
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
                {getChannelIcon(conv.type, conv.call_status === 'Not received')}
              </div>

              {/* Card */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs group-hover:border-gray-300 transition-colors space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{conv.call_status === 'Not received' ? 'Call not received' : (conv.outcome ?? 'Conversation')}</span>
                    <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-gray-100 text-gray-700 uppercase">
                      {conv.type}
                    </span>
                    {conv.call_status === 'Not received' && conv.not_received_reason && (
                      <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-rose-100">{conv.not_received_reason}</span>
                    )}
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

      <LogCommunicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log Conversation"
        contacts={contacts}
        onSubmit={saveLog}
      />
    </div>
  );
};
