import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@vernoxy-pulse/api-client';
import { AlertCircle, CheckCircle2, Loader2, Mail, MapPin, MessageSquare, Phone, PhoneOff, Users } from 'lucide-react';
import { Modal } from './Modal';
import { istInputToIso, toInputDateTimeIST } from '../../utils/date';
import { parseApiError } from '../../utils/error';
import type { SalesContactItem } from '../../types/sales.types';
import { CallDurationInput, EMPTY_DURATION, durationError, durationSeconds, type DurationValue } from './CallDurationInput';

const OUTCOMES = ['Interested', 'Not interested', 'Call back later', 'Needs more information', 'No response'] as const;
const CHANNELS = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit'] as const;
type Channel = (typeof CHANNELS)[number];

const ICONS: Record<Channel, React.ReactNode> = {
  Call: <Phone className="h-4 w-4 text-blue-600" />,
  Email: <Mail className="h-4 w-4 text-purple-600" />,
  WhatsApp: <MessageSquare className="h-4 w-4 text-emerald-600" />,
  Meeting: <Users className="h-4 w-4 text-amber-600" />,
  'Site Visit': <MapPin className="h-4 w-4 text-rose-600" />,
};

/** What goes to the server. The page that opens the pop-up sends it (to a lead or to a company). */
export interface LogCommunicationPayload {
  type: string;
  contact_id?: number;
  communication_date: string;
  what_discussed?: string;
  outcome?: string;
  call_status?: 'Received' | 'Not received';
  not_received_reason?: string;
  /** A received call: how long it lasted, in seconds. */
  call_duration_seconds?: number;
  next_follow_up?: { follow_up_on?: string; type: string; purpose?: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  contacts: SalesContactItem[];
  /** Saves it. Throw to show the error in the pop-up. */
  onSubmit: (payload: LogCommunicationPayload) => Promise<void>;
}

const field =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 min-h-[44px]';

/**
 * Log a call, email, WhatsApp, meeting or site visit. Used on a lead and on a company.
 * A call is either Received (the call time and the conversation are written) or Not received (a reason is picked).
 */
export const LogCommunicationModal: React.FC<Props> = ({ isOpen, onClose, title = 'Log Communication', subtitle, contacts, onSubmit }) => {
  const firstContact = () => contacts.find((c) => c.is_primary)?.person_id ?? contacts[0]?.person_id ?? '';

  const [type, setType] = useState<Channel>('Call');
  const [callStatus, setCallStatus] = useState<'Received' | 'Not received' | ''>('');
  const [reason, setReason] = useState('');
  const [contactId, setContactId] = useState<number | ''>('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState<DurationValue>(EMPTY_DURATION);
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextWhen, setNextWhen] = useState('');
  const [nextType, setNextType] = useState<Channel>('Call');
  const [nextPurpose, setNextPurpose] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: reasons = [] } = useQuery({
    queryKey: ['lookups', 'call_not_received_reason'],
    queryFn: () => customFetch<Array<{ id: number; label: string }>>('/api/v1/lookups/options?type=call_not_received_reason'),
    enabled: isOpen,
    staleTime: 5 * 60_000,
  });

  // A fresh form each time the pop-up opens
  useEffect(() => {
    if (!isOpen) return;
    setType('Call');
    setCallStatus('');
    setReason('');
    setContactId(firstContact());
    setWhen(toInputDateTimeIST(new Date().toISOString()));
    setDuration(EMPTY_DURATION);
    setOutcome('');
    setNotes('');
    setScheduleNext(false);
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(11, 0, 0, 0);
    setNextWhen(toInputDateTimeIST(d.toISOString()));
    setNextType('Call');
    setNextPurpose('');
    setError(null);
    setFieldErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const isCall = type === 'Call';
  const notReceived = isCall && callStatus === 'Not received';
  const received = !isCall || callStatus === 'Received';

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!contactId) e.contact_id = 'Please choose who this was with.';
    // A call that was not received has no call time to write down: it is saved as now
    if (!when && !notReceived) e.communication_date = isCall ? 'Please enter when the call was made.' : 'Please enter the date and time.';
    if (isCall && callStatus === 'Received') {
      const de = durationError(duration);
      if (de) e.call_duration_seconds = de;
    }
    if (isCall && !callStatus) e.call_status = 'Was the call received or not?';
    if (notReceived && !reason) e.not_received_reason = 'Please pick why the call was not received.';
    if (received && !notes.trim()) e.what_discussed = isCall ? 'Please write what was discussed on the call.' : 'Please write what was discussed.';
    if (received && !outcome) e.outcome = 'Please choose the outcome.';
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    const e = validate();
    setFieldErrors(e);
    if (Object.keys(e).length > 0) return;

    const payload: LogCommunicationPayload = {
      type,
      contact_id: Number(contactId),
      communication_date: notReceived ? new Date().toISOString() : istInputToIso(when),
      ...(isCall && callStatus === 'Received' ? { call_duration_seconds: durationSeconds(duration) as number } : {}),
      ...(isCall ? { call_status: callStatus as 'Received' | 'Not received' } : {}),
      ...(notReceived
        ? { not_received_reason: reason, ...(notes.trim() ? { what_discussed: notes.trim() } : {}) }
        : { what_discussed: notes.trim(), outcome }),
      ...(scheduleNext ? { next_follow_up: { follow_up_on: istInputToIso(nextWhen), type: nextType, purpose: nextPurpose.trim() || undefined } } : {}),
    };

    setSaving(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(parseApiError(err).message || 'Could not save this.');
    } finally {
      setSaving(false);
    }
  };

  const err = (key: string) => (fieldErrors[key] ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors[key]}</p> : null);

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} title={title} subtitle={subtitle ?? 'Record what happened. You can set the next follow-up in the same step.'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p>{error}</p>
          </div>
        )}

        {/* How */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700">Channel used</label>
          <div className="grid grid-cols-5 gap-1.5">
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setType(ch)}
                aria-pressed={type === ch}
                className={`flex flex-col items-center justify-center rounded-lg border p-2 text-xs font-medium transition-colors ${
                  type === ch ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {ICONS[ch]}
                <span className="mt-1 text-[11px]">{ch}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Received / Not received */}
        {isCall && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700">
              Was the call received? <span className="text-red-500">*</span>
            </label>
            <div role="radiogroup" aria-label="Call status" className="grid grid-cols-2 gap-2">
              <button
                type="button"
                role="radio"
                aria-checked={callStatus === 'Received'}
                onClick={() => setCallStatus('Received')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  callStatus === 'Received' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" /> Received
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={callStatus === 'Not received'}
                onClick={() => setCallStatus('Not received')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  callStatus === 'Not received' ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PhoneOff className="h-4 w-4" /> Not received
              </button>
            </div>
            {err('call_status')}
          </div>
        )}

        {/* Who */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">
            {isCall ? 'Contact called' : 'Contact person'} <span className="text-red-500">*</span>
          </label>
          <select value={contactId} onChange={(e) => setContactId(e.target.value ? Number(e.target.value) : '')} className={field}>
            <option value="">Select contact...</option>
            {contacts.map((c) => (
              <option key={c.company_person_id} value={c.person_id}>
                {c.name} {c.designation ? `(${c.designation})` : ''} {c.is_primary ? '★ Primary' : ''}
              </option>
            ))}
          </select>
          {contacts.length === 0 && <p className="mt-1 text-xs text-amber-700">This company has no contacts yet. Add one first.</p>}
          {err('contact_id')}
        </div>

        {/* When: not asked for a call that was not received */}
        {(!isCall || callStatus === 'Received') && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              {isCall ? 'Call date & time' : 'Date & time'} (IST) <span className="text-red-500">*</span>
            </label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
            {err('communication_date')}
          </div>
        )}

        {/* Received call: how long it lasted */}
        {isCall && callStatus === 'Received' && <CallDurationInput value={duration} onChange={setDuration} error={fieldErrors.call_duration_seconds} />}

        {/* Not received: the reason */}
        {notReceived && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={field}>
              <option value="">Select a reason...</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
            {err('not_received_reason')}
          </div>
        )}

        {/* Received (or any other channel): the conversation */}
        {(received && (!isCall || callStatus)) && (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                {isCall ? 'Conversation' : 'What was discussed'} <span className="text-red-500">*</span>
              </label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="What was discussed, what the contact said, what happens next..." className={`${field} min-h-0`} />
              {err('what_discussed')}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">
                Outcome <span className="text-red-500">*</span>
              </label>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={field}>
                <option value="">Select outcome...</option>
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              {err('outcome')}
            </div>
          </>
        )}

        {notReceived && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">Note (optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering about this attempt" className={`${field} min-h-0`} />
          </div>
        )}

        {/* Next follow-up */}
        {(!isCall || callStatus) && (
          <div className="border-t border-gray-100 pt-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={scheduleNext} onChange={(e) => setScheduleNext(e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary/20" />
              <span className="text-xs font-semibold text-gray-800">{notReceived ? 'Schedule a call back' : 'Schedule next follow-up'}</span>
            </label>
            {scheduleNext && (
              <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-700">Due (IST)</label>
                    <input type="datetime-local" value={nextWhen} onChange={(e) => setNextWhen(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-700">Channel</label>
                    <select value={nextType} onChange={(e) => setNextType(e.target.value as Channel)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20">
                      {CHANNELS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <input type="text" value={nextPurpose} onChange={(e) => setNextPurpose(e.target.value)} placeholder="Purpose, e.g. Share the quotation" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-3">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{notReceived ? 'Save attempt' : 'Save'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
