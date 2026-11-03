import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  
  
  Phone,
  Mail,
  MessageSquare,
  Users,
  MapPin,
  AlertCircle,
  Loader2,
  
} from 'lucide-react';
import { useSalesFollowUpControllerSchedule } from '@vernoxy-pulse/api-client';

import { Modal } from '../common/Modal';
import { istInputToIso, toInputDateTimeIST } from '../../utils/date';
import { parseApiError } from '../../utils/error';
import type { SalesContactItem, SalesFollowUpType } from '../../types/sales.types';

export interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: number;
  companyName?: string;
  leadId?: number;
  leadCode?: string;
  contacts?: SalesContactItem[];
  defaultContactId?: number;
  onSuccess?: () => void;
}

export const ScheduleFollowUpModal: React.FC<ScheduleFollowUpModalProps> = ({
  isOpen,
  onClose,
  companyId,
  companyName,
  leadId,
  leadCode,
  contacts = [],
  defaultContactId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Tomorrow at 11:00 AM IST by default
  const getDefaultDateTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    return toInputDateTimeIST(tomorrow.toISOString());
  };

  const [contactId, setContactId] = useState<number | ''>(defaultContactId ?? '');
  const [type, setType] = useState<SalesFollowUpType>('Call');
  const [dateTimeIST, setDateTimeIST] = useState<string>(getDefaultDateTime());
  const [purpose, setPurpose] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set default contact when contacts load
  useEffect(() => {
    if (contacts.length > 0 && !contactId) {
      const primary = contacts.find((c) => c.is_primary) || contacts[0];
      if (primary) setContactId(primary.person_id || primary.company_person_id);
    }
  }, [contacts, contactId]);

  const scheduleMutation = useSalesFollowUpControllerSchedule();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!dateTimeIST) {
      setErrorMessage('Please select date and time for the follow-up');
      return;
    }

    const isoTime = istInputToIso(dateTimeIST);
    if (!isoTime) {
      setErrorMessage('Invalid date or time format');
      return;
    }

    try {
      await scheduleMutation.mutateAsync({
        data: {
          lead_id: leadId || undefined,
          company_id: !leadId ? companyId : undefined,
          contact_id: contactId ? Number(contactId) : undefined,
          follow_up_on: isoTime,
          type,
          purpose: purpose.trim() || undefined,
        },
      });

      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/follow-ups'] });
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/companies/${companyId}`] });
      }
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}/follow-ups`] });
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Failed to schedule follow-up');
    }
  };

  const typeOptions: Array<{ type: SalesFollowUpType; label: string; icon: React.ElementType }> = [
    { type: 'Call', label: 'Call', icon: Phone },
    { type: 'Email', label: 'Email', icon: Mail },
    { type: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare },
    { type: 'Meeting', label: 'Meeting', icon: Users },
    { type: 'Site Visit', label: 'Site Visit', icon: MapPin },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !scheduleMutation.isPending && onClose()}
      title="Schedule Follow-up"
      subtitle={
        companyName
          ? `For ${companyName}${leadCode ? ` (${leadCode})` : ''}`
          : 'Set a reminder for the next sales follow-up.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to schedule</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Follow-up Type Chips */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Follow-up Type</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {typeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = type === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setType(opt.type)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-2xs font-semibold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date and Time (IST) */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Date & Time (IST) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={dateTimeIST}
              onChange={(e) => setDateTimeIST(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
            />
          </div>
          <p className="text-2xs text-gray-400 mt-0.5">Times are in Indian Standard Time (IST)</p>
        </div>

        {/* Contact Person */}
        {contacts.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person</label>
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

        {/* Purpose / Agenda */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Purpose / Notes</label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={3}
            placeholder="e.g. Discuss revised quote, demonstrate product sample, follow up on decision timeline..."
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
            disabled={scheduleMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
          >
            {scheduleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Schedule Follow-up</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
