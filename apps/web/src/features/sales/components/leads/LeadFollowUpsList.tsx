import React, { useState } from 'react';
import {
  Calendar,
  
  Plus,
  Phone,
  Mail,
  MessageSquare,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  RotateCcw,
  
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useSalesFollowUpControllerForLead } from '@vernoxy-pulse/api-client';

import { FollowUpFlagBadge } from '../common/FollowUpFlagBadge';
import { ScheduleFollowUpModal } from '../follow-ups/ScheduleFollowUpModal';
import { CompleteFollowUpModal } from '../follow-ups/CompleteFollowUpModal';
import { RescheduleFollowUpModal } from '../follow-ups/RescheduleFollowUpModal';
import { CancelFollowUpModal } from '../follow-ups/CancelFollowUpModal';
import { formatDateTimeIST } from '../../utils/date';
import type { FollowUpItem, SalesFollowUpItem, SalesContactItem } from '../../types/sales.types';

export interface LeadFollowUpsListProps {
  leadId: number;
  leadCode?: string;
  companyName?: string;
  contacts?: SalesContactItem[];
}

export const LeadFollowUpsList: React.FC<LeadFollowUpsListProps> = ({
  leadId,
  leadCode,
  companyName,
  contacts = [],
}) => {
  const { data: rawData, isLoading, refetch } = useSalesFollowUpControllerForLead(leadId, {
    query: {
      enabled: Boolean(leadId),
    },
  });

  const followUps: FollowUpItem[] = (
    (rawData as unknown as { data?: FollowUpItem[] })?.data ??
    (rawData as unknown as FollowUpItem[]) ??
    []
  );

  const toModalItem = (f: FollowUpItem): SalesFollowUpItem => ({
    id: f.follow_up_id,
    lead_id: f.related_to.lead_id,
    company_name: f.company.name,
    contact_name: f.contact?.name,
    type: f.type as SalesFollowUpItem['type'],
    due_date: f.follow_up_on,
    status: f.status,
    purpose: f.purpose,
    assigned_to_name: f.assigned_to.name,
    rescheduled_count: f.rescheduled_count,
  });
  const todayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<SalesFollowUpItem | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<SalesFollowUpItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SalesFollowUpItem | null>(null);

  const getChannelIcon = (type: string) => {
    switch (type?.toLowerCase()) {
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

  const pendingList = followUps.filter(
    (f) => f.status === 'Pending' || f.status === 'Overdue',
  );
  const completedList = followUps.filter(
    (f) => f.status === 'Completed' || f.status === 'Cancelled',
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Follow-ups ({followUps.length})
          </h3>
          <p className="text-xs text-gray-500">
            Open reminders, scheduled calls, meetings, and past completed outreach.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setScheduleModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors self-start sm:self-auto min-h-[38px]"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : followUps.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200">
          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-800">No follow-ups scheduled</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            Keep deals active by scheduling regular check-ins and demo reminders.
          </p>
          <button
            type="button"
            onClick={() => setScheduleModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Follow-up</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Open / Pending Follow-ups */}
          {pendingList.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Upcoming & Overdue ({pendingList.length})
              </h4>
              <div className="space-y-2.5">
                {pendingList.map((item) => (
                  <div
                    key={item.follow_up_id}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 shrink-0 mt-0.5">
                        {getChannelIcon(item.type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900">{item.purpose || item.type}</span>
                          <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-gray-100 text-gray-700 uppercase">
                            {item.type}
                          </span>
                          <FollowUpFlagBadge
                            flag={item.status === 'Overdue' ? 'overdue' : new Date(item.follow_up_on).getTime() < todayStart() + 86400000 ? 'today' : 'upcoming'}
                            at={item.follow_up_on}
                          />
                          {(item.rescheduled_count ?? 0) >= 3 && (
                            <span className="inline-flex items-center gap-1 text-2xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Rescheduled {item.rescheduled_count}x
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-2xs text-gray-500">
                          <span>Due: {formatDateTimeIST(item.follow_up_on)}</span>
                          {item.contact && <span>With: {item.contact.name}</span>}
                          {item.assigned_to && <span>Assigned: {item.assigned_to.name}</span>}
                        </div>
                      </div>
                    </div>

                    {item.actions.includes('complete') && (
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setCompleteTarget(toModalItem(item))}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-2xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Complete</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRescheduleTarget(toModalItem(item))}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                        <span>Reschedule</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCancelTarget(toModalItem(item))}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancel follow-up"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past / Completed Follow-ups */}
          {completedList.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Completed & Past ({completedList.length})
              </h4>
              <div className="space-y-2 opacity-80">
                {completedList.map((item) => (
                  <div
                    key={item.follow_up_id}
                    className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-white border border-gray-200 shrink-0">
                        {getChannelIcon(item.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{item.purpose || item.type}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                              item.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <span className="text-2xs text-gray-400">
                          {formatDateTimeIST(item.done_on || item.follow_up_on)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Modal */}
      <ScheduleFollowUpModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        leadId={leadId}
        leadCode={leadCode}
        companyName={companyName}
        contacts={contacts}
        onSuccess={() => refetch()}
      />

      {/* Complete Modal */}
      <CompleteFollowUpModal
        isOpen={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        followUp={completeTarget}
        onSuccess={() => refetch()}
      />

      {/* Reschedule Modal */}
      <RescheduleFollowUpModal
        isOpen={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        followUp={rescheduleTarget}
        onSuccess={() => refetch()}
      />

      {/* Cancel Modal */}
      <CancelFollowUpModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        followUp={cancelTarget}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
