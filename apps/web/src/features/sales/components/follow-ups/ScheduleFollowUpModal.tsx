import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Building2, Loader2, Mail, MapPin, MessageSquare, Phone, Search, UserPlus, Users, X } from 'lucide-react';
import { customFetch, useSalesContactControllerList, useSalesFollowUpControllerSchedule, useSalesLeadControllerMasters } from '@vernoxy-pulse/api-client';

import { useAuth } from '@/features/auth/context/AuthContext';
import { Modal } from '../common/Modal';
import { useSalesRights } from '../../hooks/useSalesRights';
import { useDebounce } from '../../hooks/useDebounce';
import { istInputToIso, toInputDateTimeIST } from '../../utils/date';
import { parseApiError } from '../../utils/error';
import { unwrapList } from '../../utils/response';
import type { SalesContactItem, SalesFollowUpType, SalesLeadMastersResponse } from '../../types/sales.types';

export interface ScheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: number;
  companyName?: string;
  leadId?: number;
  leadCode?: string;
  contacts?: SalesContactItem[];
  defaultContactId?: number;
  /** Where to send the user to add a contact when the company has none. */
  addContactHref?: string;
  onSuccess?: () => void;
}

interface CompanyHit {
  company_id: number;
  company_code: string | null;
  name: string;
  city?: string | null;
}

const field =
  'w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]';

export const ScheduleFollowUpModal: React.FC<ScheduleFollowUpModalProps> = ({
  isOpen,
  onClose,
  companyId,
  companyName,
  leadId,
  leadCode,
  contacts: contactsProp = [],
  defaultContactId,
  addContactHref,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // From the Follow-ups page nothing is known yet, so the user picks the company first.
  const needsPicker = !leadId && !companyId;
  const [pickQuery, setPickQuery] = useState('');
  const [picked, setPicked] = useState<CompanyHit | null>(null);
  const debouncedQuery = useDebounce(pickQuery.trim(), 250);

  const { data: foundRaw, isFetching: searching } = useQuery({
    queryKey: ['/api/v1/sales/companies', 'pick', debouncedQuery],
    queryFn: () => customFetch<unknown>(`/api/v1/sales/companies?q=${encodeURIComponent(debouncedQuery)}&limit=8&page=1`),
    enabled: isOpen && needsPicker && !picked && debouncedQuery.length >= 2,
  });
  const found = unwrapList<CompanyHit>(foundRaw);

  const { data: pickedContactsRaw } = useSalesContactControllerList(picked?.company_id ?? 0, {
    query: { enabled: Boolean(picked) },
  });
  const contacts: SalesContactItem[] = needsPicker ? unwrapList<SalesContactItem>(pickedContactsRaw).filter((c) => c.is_active) : contactsProp;
  const targetName = picked?.name ?? companyName;

  // Who will do it: the Sales users and Admins
  const { data: mastersRaw } = useSalesLeadControllerMasters({ query: { enabled: isOpen } });
  const people = (((mastersRaw as unknown as { data?: SalesLeadMastersResponse })?.data ?? (mastersRaw as unknown as SalesLeadMastersResponse | undefined))?.lead_by_users ?? []);
  // Only the Admin chooses who it is for; it starts as themselves. Everyone else assigns it to themselves.
  const { user } = useAuth();
  const { isAdmin } = useSalesRights();
  const [assignedTo, setAssignedTo] = useState<number | ''>(user?.emp_id ?? '');

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
  const [contactError, setContactError] = useState(false);

  // A fresh start each time the pop-up opens
  useEffect(() => {
    if (!isOpen) return;
    setPicked(null);
    setPickQuery('');
    setErrorMessage(null);
    setContactError(false);
    setContactId(defaultContactId ?? '');
    setDateTimeIST(getDefaultDateTime());
    setPurpose('');
    setAssignedTo(user?.emp_id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Pre-select the primary contact once the contacts are known
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
    setContactError(false);

    if (needsPicker && !picked) {
      setErrorMessage('Choose the company this follow-up is for.');
      return;
    }
    if (contacts.length === 0) {
      setContactError(true);
      setErrorMessage('This company has no contact person yet. Add a contact first, then schedule the follow-up.');
      return;
    }
    if (!contactId) {
      setContactError(true);
      setErrorMessage('Choose who the follow-up is with.');
      return;
    }
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
          company_id: !leadId ? (companyId ?? picked?.company_id) : undefined,
          contact_id: Number(contactId),
          follow_up_on: isoTime,
          type,
          assigned_to: isAdmin && assignedTo ? Number(assignedTo) : undefined,
          purpose: purpose.trim() || undefined,
        },
      });

      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/follow-ups'] });
      const cid = companyId ?? picked?.company_id;
      if (cid) queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/companies/${cid}`] });
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/v1/sales/leads/${leadId}/follow-ups`] });
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      // Say which field is wrong instead of a general "correct the highlighted fields".
      const specific = Object.entries(parsed.fieldErrors).map(([name, msg]) => `${name.replace(/_/g, ' ')}: ${msg}`);
      if (parsed.fieldErrors.contact_id) setContactError(true);
      setErrorMessage(specific.length > 0 ? specific.join(' · ') : parsed.message || 'Failed to schedule follow-up');
    }
  };

  const typeOptions: Array<{ type: SalesFollowUpType; label: string; icon: React.ElementType }> = [
    { type: 'Call', label: 'Call', icon: Phone },
    { type: 'Email', label: 'Email', icon: Mail },
    { type: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare },
    { type: 'Meeting', label: 'Meeting', icon: Users },
    { type: 'Site Visit', label: 'Site Visit', icon: MapPin },
  ];

  const noContacts = contacts.length === 0 && (!needsPicker || Boolean(picked));

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !scheduleMutation.isPending && onClose()}
      title="Schedule Follow-up"
      subtitle={targetName ? `For ${targetName}${leadCode ? ` (${leadCode})` : ''}` : 'Set a reminder for the next sales follow-up.'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errorMessage && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to schedule</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Which company, when this was opened from the Follow-ups page */}
        {needsPicker && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Company <span className="text-red-500">*</span>
            </label>
            {picked ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-2.5">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
                  <Building2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{picked.name}</span>
                  {picked.company_code && <span className="shrink-0 text-xs font-medium text-gray-500">{picked.company_code}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(null);
                    setContactId('');
                  }}
                  aria-label="Choose a different company"
                  className="rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} placeholder="Search a company by name..." className={`${field} pl-9`} autoComplete="off" />
                {debouncedQuery.length >= 2 && (
                  <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {searching && <li className="px-3.5 py-2 text-xs text-gray-500">Searching...</li>}
                    {!searching && found.length === 0 && <li className="px-3.5 py-2 text-xs text-gray-500">No company matches "{debouncedQuery}".</li>}
                    {found.map((c) => (
                      <li key={c.company_id}>
                        <button type="button" onClick={() => setPicked(c)} className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm hover:bg-gray-50">
                          <span className="truncate font-medium text-gray-900">{c.name}</span>
                          <span className="shrink-0 text-xs text-gray-400">{[c.company_code, c.city].filter(Boolean).join(' · ')}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
                    isSelected ? 'border-primary bg-primary/10 text-primary shadow-2xs font-semibold' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
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
          <input type="datetime-local" value={dateTimeIST} onChange={(e) => setDateTimeIST(e.target.value)} className={field} />
          <p className="text-2xs text-gray-400 mt-0.5">Times are in Indian Standard Time (IST)</p>
        </div>

        {/* Contact Person: always shown, because a follow-up is always with someone */}
        {(!needsPicker || picked) && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Contact Person <span className="text-red-500">*</span>
            </label>
            {noContacts ? (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-semibold">This company has no contact person yet.</p>
                  <p>A follow-up is always with someone. Add a contact first, then come back here.</p>
                  {addContactHref && (
                    <Link to={addContactHref} onClick={onClose} className="inline-block font-semibold text-amber-800 underline">
                      Add a contact
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <select
                value={contactId}
                onChange={(e) => {
                  setContactId(e.target.value ? Number(e.target.value) : '');
                  setContactError(false);
                }}
                aria-invalid={contactError || undefined}
                className={`${field} ${contactError ? 'border-red-400 ring-2 ring-red-100' : ''}`}
              >
                <option value="">Select contact...</option>
                {contacts.map((c) => (
                  <option key={c.company_person_id} value={c.person_id || c.company_person_id}>
                    {c.name} {c.designation ? `(${c.designation})` : ''} {c.is_primary ? '★ Primary' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Assigned to: the Admin only; it starts as themselves */}
        {isAdmin && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned to</label>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : '')} className={field}>
              {people.map((p) => (
                <option key={p.emp_id} value={p.emp_id}>
                  {p.name}
                  {p.emp_id === user?.emp_id ? ' (me)' : p.is_admin ? ' (Admin)' : ''}
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
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={scheduleMutation.isPending || noContacts}
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
