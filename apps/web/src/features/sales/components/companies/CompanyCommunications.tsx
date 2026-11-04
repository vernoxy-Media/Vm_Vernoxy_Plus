import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { Loader2, Mail, MapPin, MessageSquare, Phone, PhoneOff, Plus, User, Users } from 'lucide-react';
import { LogCommunicationModal, type LogCommunicationPayload } from '../common/LogCommunicationModal';
import { formatDateTimeIST, timeAgo } from '../../utils/date';
import { unwrapList } from '../../utils/response';
import type { ConversationItem, SalesContactItem } from '../../types/sales.types';

interface Props {
  companyId: number;
  contacts: SalesContactItem[];
  /** The pop-up is opened from here and from the button at the top of the page. */
  logOpen: boolean;
  onLogOpenChange: (open: boolean) => void;
}

const iconFor = (c: ConversationItem) => {
  if (c.call_status === 'Not received') return <PhoneOff className="h-4 w-4 text-rose-600" />;
  switch (c.type.toLowerCase()) {
    case 'email':
      return <Mail className="h-4 w-4 text-purple-600" />;
    case 'whatsapp':
      return <MessageSquare className="h-4 w-4 text-emerald-600" />;
    case 'meeting':
      return <Users className="h-4 w-4 text-amber-600" />;
    case 'site visit':
      return <MapPin className="h-4 w-4 text-rose-600" />;
    default:
      return <Phone className="h-4 w-4 text-blue-600" />;
  }
};

/** The company's communication history, with "Log Communication" (calls are Received or Not received). */
export const CompanyCommunications: React.FC<Props> = ({ companyId, contacts, logOpen, onLogOpenChange }) => {
  const queryClient = useQueryClient();
  const key = ['/api/v1/sales/companies', companyId, 'communications'];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => customFetch<unknown>(`/api/v1/sales/companies/${companyId}/communications?limit=20`),
  });
  const items = unwrapList<ConversationItem>(data);
  const activeContacts = contacts.filter((c) => c.is_active);

  const save = async (payload: LogCommunicationPayload) => {
    await customFetch(`/api/v1/sales/companies/${companyId}/communications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/companies/${companyId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/leads'] });
  };

  return (
    <div className="space-y-4 rounded-xl border border-gray-200/80 bg-white p-5 shadow-2xs sm:p-6">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Communication ({items.length})</h3>
            <p className="text-xs text-gray-500">Calls, emails, meetings and visits with this company.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onLogOpenChange(true)}
          className="inline-flex min-h-[38px] items-center gap-1.5 self-start rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-2xs transition-colors hover:bg-primary/90 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Log Communication</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">Nothing logged yet. Log the first call or visit.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => {
            const missed = c.call_status === 'Not received';
            return (
              <li key={c.communication_id} className="flex gap-3 rounded-xl border border-gray-200 p-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white">{iconFor(c)}</span>
                <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{missed ? 'Call not received' : (c.outcome ?? 'Conversation')}</span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-700">{c.type}</span>
                      {missed && c.not_received_reason && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-100">{c.not_received_reason}</span>}
                    </div>
                    <span className="text-[11px] text-gray-400">{formatDateTimeIST(c.communication_date)}</span>
                  </div>
                  {c.what_discussed && <p className="whitespace-pre-line leading-relaxed text-gray-700">{c.what_discussed}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
                    <span className="flex items-center gap-3">
                      {c.contact && (
                        <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                          <User className="h-3 w-3 text-gray-400" />
                          {c.contact.name}
                        </span>
                      )}
                      <span>Logged by {c.logged_by?.name ?? 'Representative'}</span>
                    </span>
                    <span>{timeAgo(c.communication_date)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <LogCommunicationModal isOpen={logOpen} onClose={() => onLogOpenChange(false)} title="Log Communication" contacts={activeContacts} onSubmit={save} />
    </div>
  );
};
