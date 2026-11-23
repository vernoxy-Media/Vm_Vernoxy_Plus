import React, { useEffect, useState } from 'react';
import { PhoneCall, PhoneMissed } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useLogCampaignCall } from '../../hooks/useCampaigns';
import { parseApiError } from '../../utils/error';
import { CALL_OUTCOMES, type CampaignCompany, type LogCallValues } from '../../types/campaign.types';
import { FieldError, inputCls, labelCls, primaryBtn, secondaryBtn, textareaCls } from './campaign-ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campaignId: number;
  company: CampaignCompany | null;
  reasons: string[];
  onLogged?: () => void;
}

type Result = 'Received' | 'Not received';

/** Local "datetime-local" value to an ISO string; empty stays undefined. */
function toIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** The default follow-up: tomorrow 10:00 in the user's time. */
function tomorrowMorning(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const LogCallModal: React.FC<Props> = ({ isOpen, onClose, campaignId, company, reasons, onLogged }) => {
  const log = useLogCampaignCall(campaignId);
  const [result, setResult] = useState<Result>('Received');
  const [outcome, setOutcome] = useState('');
  const [discussed, setDiscussed] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [reason, setReason] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setResult('Received');
    setOutcome('');
    setDiscussed('');
    setMinutes('');
    setSeconds('');
    setReason('');
    setFollowUp('');
    setErrors({});
    setFormError(null);
  }, [isOpen, company?.campaign_company_id]);

  if (!company) return null;

  const clear = (field: string) => setErrors((e) => (e[field] ? { ...e, [field]: '' } : e));

  const pickOutcome = (v: string) => {
    setOutcome(v);
    clear('outcome');
    // A call back needs a date; start it at tomorrow morning so it is one click less.
    if (v === 'Call back later' && !followUp) setFollowUp(tomorrowMorning());
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (result === 'Received') {
      if (!outcome) next.outcome = 'Please fill this field.';
      if (!discussed.trim()) next.what_discussed = 'Please fill this field.';
      if ((minutes && Number(minutes) < 0) || (seconds && (Number(seconds) < 0 || Number(seconds) > 59))) {
        next.call_duration_seconds = 'Enter minutes, and seconds from 0 to 59.';
      }
      if (outcome === 'Call back later' && !followUp) next.next_follow_up_on = 'Pick when to call back.';
    } else if (!reason) {
      next.not_received_reason = 'Please fill this field.';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const values: LogCallValues = { call_status: result };
    if (result === 'Received') {
      values.outcome = outcome;
      values.what_discussed = discussed.trim();
      const total = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
      if (total > 0) values.call_duration_seconds = total;
    } else {
      values.not_received_reason = reason;
    }
    const nextAt = toIso(followUp);
    if (nextAt) values.next_follow_up_on = nextAt;

    setFormError(null);
    log.mutate(
      { campaignCompanyId: company.campaign_company_id, values },
      {
        onSuccess: () => {
          onLogged?.();
          onClose();
        },
        onError: (err) => {
          const parsed = parseApiError(err);
          if (Object.keys(parsed.fieldErrors).length > 0) setErrors(parsed.fieldErrors);
          setFormError(parsed.message);
        },
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Log call"
      subtitle={
        <span>
          {company.company_name}
          {company.contact_person ? ` · ${company.contact_person}` : ''}
          {company.mobile ? ` · ${company.mobile}` : ''}
        </span>
      }
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" className={secondaryBtn} onClick={onClose} disabled={log.isPending}>
            Cancel
          </button>
          <button type="button" className={primaryBtn} onClick={submit} disabled={log.isPending}>
            {log.isPending ? 'Saving…' : 'Save call'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {formError && Object.values(errors).every((m) => !m) && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {formError}
          </div>
        )}

        <div>
          <span className={labelCls}>What happened?</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { v: 'Received', label: 'Connected', hint: 'They picked up', icon: PhoneCall },
                { v: 'Not received', label: 'Not received', hint: 'Nobody answered', icon: PhoneMissed },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => {
                  setResult(o.v);
                  setErrors({});
                }}
                aria-pressed={result === o.v}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  result === o.v ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <o.icon className={`h-4 w-4 ${result === o.v ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>
                  <span className="block font-semibold text-gray-900">{o.label}</span>
                  <span className="block text-[11px] text-gray-500">{o.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {result === 'Received' ? (
          <>
            <div>
              <label className={labelCls} htmlFor="call-outcome">
                Result <span className="text-rose-500">*</span>
              </label>
              <select id="call-outcome" className={inputCls} value={outcome} onChange={(e) => pickOutcome(e.target.value)}>
                <option value="">Select a result</option>
                {CALL_OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <FieldError message={errors.outcome} />
            </div>

            <div>
              <label className={labelCls} htmlFor="call-discussed">
                What was discussed <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="call-discussed"
                rows={3}
                className={textareaCls}
                value={discussed}
                onChange={(e) => {
                  setDiscussed(e.target.value);
                  clear('what_discussed');
                }}
                placeholder="One or two lines about the conversation"
              />
              <FieldError message={errors.what_discussed} />
            </div>

            <div>
              <span className={labelCls}>Call length (optional)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  aria-label="Minutes"
                  className={`${inputCls} w-24`}
                  value={minutes}
                  onChange={(e) => {
                    setMinutes(e.target.value);
                    clear('call_duration_seconds');
                  }}
                  placeholder="min"
                />
                <input
                  type="number"
                  min={0}
                  max={59}
                  aria-label="Seconds"
                  className={`${inputCls} w-24`}
                  value={seconds}
                  onChange={(e) => {
                    setSeconds(e.target.value);
                    clear('call_duration_seconds');
                  }}
                  placeholder="sec"
                />
              </div>
              <FieldError message={errors.call_duration_seconds} />
            </div>
          </>
        ) : (
          <div>
            <label className={labelCls} htmlFor="call-reason">
              Reason <span className="text-rose-500">*</span>
            </label>
            <select
              id="call-reason"
              className={inputCls}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                clear('not_received_reason');
              }}
            >
              <option value="">Select a reason</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <FieldError message={errors.not_received_reason} />
          </div>
        )}

        <div>
          <label className={labelCls} htmlFor="call-next">
            Next follow-up {outcome === 'Call back later' && result === 'Received' ? <span className="text-rose-500">*</span> : <span className="font-normal text-gray-400">(optional)</span>}
          </label>
          <input
            id="call-next"
            type="datetime-local"
            className={inputCls}
            value={followUp}
            onChange={(e) => {
              setFollowUp(e.target.value);
              clear('next_follow_up_on');
            }}
          />
          <FieldError message={errors.next_follow_up_on} />
        </div>
      </div>
    </Modal>
  );
};
