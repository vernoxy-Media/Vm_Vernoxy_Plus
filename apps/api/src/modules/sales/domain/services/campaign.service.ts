import { FieldError } from '../errors/sales.errors';
import { CALL_STATUSES, OUTCOMES, WHAT_DISCUSSED_MAX } from './activity-validator.service';

export const CAMPAIGN_TYPES = ['Calling', 'Meeting', 'Email', 'Calling + Meeting'] as const;
export const CAMPAIGN_STATUSES = ['Draft', 'Active', 'Paused', 'Completed'] as const;

/** The filters of the employee's calling list (BFD 4.2). "Pending" and "Not Called" are the same thing: no call yet. */
export const CALLING_FILTERS = ['pending', 'connected', 'not_received', 'interested', 'not_interested', 'follow_up_due', 'meeting_scheduled'] as const;
export type CallingFilter = (typeof CALLING_FILTERS)[number];

/** Lead stages a company can already be in, plus "No lead" for a company that has none. */
export const CAMPAIGN_LEAD_FILTERS = ['No lead', 'New', 'Contacted', 'Qualified', 'On Hold', 'Converted', 'Lost'] as const;

export const CALLING_STATUS_LABELS = ['Pending', 'Connected', 'Not Received', 'Interested', 'Not Interested'] as const;
export type CallingStatusLabel = (typeof CALLING_STATUS_LABELS)[number];

const REQUIRED = 'Please fill this field.';
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const FUTURE_TOLERANCE_MS = 2 * 60 * 1000;

export interface CampaignInput {
  name?: string | null;
  campaign_type?: string | null;
  target_cities?: string[] | null;
  target_state?: string | null;
  industry_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  objective?: string | null;
  description?: string | null;
  status?: string | null;
}

function isRealDate(s: string): boolean {
  if (!YMD.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Validates a campaign form. On create every required field must be present; on update only the fields that were sent are
 * checked (`partial`), and the date order is checked against the stored dates by the caller passing both.
 */
export function validateCampaign(i: CampaignInput, opts: { partial: boolean }): FieldError[] {
  const errors: FieldError[] = [];
  const has = (k: keyof CampaignInput) => !opts.partial || i[k] !== undefined;

  if (has('name')) {
    const name = (i.name ?? '').trim();
    if (!name) errors.push({ field: 'name', message: REQUIRED });
    else if (name.length > 200) errors.push({ field: 'name', message: 'Please keep the name under 200 characters.' });
  }
  if (has('campaign_type') && !(CAMPAIGN_TYPES as readonly string[]).includes(i.campaign_type ?? '')) {
    errors.push({ field: 'campaign_type', message: `Choose one of: ${CAMPAIGN_TYPES.join(', ')}.` });
  }
  if (i.target_cities !== undefined && i.target_cities !== null) {
    if (i.target_cities.length > 50 || i.target_cities.some((c) => !c.trim() || c.length > 100)) {
      errors.push({ field: 'target_cities', message: 'Enter up to 50 cities, each under 100 characters.' });
    }
  }
  if (i.target_state && i.target_state.length > 100) errors.push({ field: 'target_state', message: 'Please keep the state under 100 characters.' });
  if (i.industry_id !== undefined && i.industry_id !== null && !Number.isInteger(i.industry_id)) {
    errors.push({ field: 'industry_id', message: 'Choose an industry from the list.' });
  }

  let startOk = false;
  let endOk = false;
  if (has('start_date')) {
    if (!i.start_date) errors.push({ field: 'start_date', message: REQUIRED });
    else if (!isRealDate(i.start_date)) errors.push({ field: 'start_date', message: 'Enter a valid date.' });
    else startOk = true;
  }
  if (has('end_date')) {
    if (!i.end_date) errors.push({ field: 'end_date', message: REQUIRED });
    else if (!isRealDate(i.end_date)) errors.push({ field: 'end_date', message: 'Enter a valid date.' });
    else endOk = true;
  }
  if (startOk && endOk && i.end_date! < i.start_date!) {
    errors.push({ field: 'end_date', message: 'The end date cannot be before the start date.' });
  }

  if (i.objective && i.objective.length > 2000) errors.push({ field: 'objective', message: 'Please keep it under 2000 characters.' });
  if (i.description && i.description.length > 5000) errors.push({ field: 'description', message: 'Please keep it under 5000 characters.' });
  if (i.status !== undefined && i.status !== null && !(CAMPAIGN_STATUSES as readonly string[]).includes(i.status)) {
    errors.push({ field: 'status', message: `Choose one of: ${CAMPAIGN_STATUSES.join(', ')}.` });
  }
  return errors;
}

export interface CampaignCallInput {
  call_status?: string | null;
  not_received_reason?: string | null;
  outcome?: string | null;
  what_discussed?: string | null;
  call_duration_seconds?: number | null;
  next_follow_up_on?: Date | null;
}

/** The result of one call attempt. Same rules as logging a call on a lead: a received call needs notes and a result, a missed one needs a reason. */
export function validateCampaignCall(i: CampaignCallInput, now: Date): FieldError[] {
  const errors: FieldError[] = [];
  if (!i.call_status) {
    errors.push({ field: 'call_status', message: REQUIRED });
    return errors;
  }
  if (!(CALL_STATUSES as readonly string[]).includes(i.call_status)) {
    errors.push({ field: 'call_status', message: `Choose one of: ${CALL_STATUSES.join(', ')}.` });
    return errors;
  }
  const notReceived = i.call_status === 'Not received';

  if (notReceived) {
    if (!i.not_received_reason?.trim()) errors.push({ field: 'not_received_reason', message: REQUIRED });
    if (i.outcome) errors.push({ field: 'outcome', message: 'A call that was not received has no result.' });
    if (i.call_duration_seconds !== undefined && i.call_duration_seconds !== null) {
      errors.push({ field: 'call_duration_seconds', message: 'The call length is only for a call that was received.' });
    }
  } else {
    if (i.not_received_reason) errors.push({ field: 'not_received_reason', message: 'A reason is only for a call that was not received.' });
    if (!i.what_discussed?.trim()) errors.push({ field: 'what_discussed', message: REQUIRED });
    else if (i.what_discussed.length > WHAT_DISCUSSED_MAX) {
      errors.push({ field: 'what_discussed', message: `Please keep it under ${WHAT_DISCUSSED_MAX} characters.` });
    }
    if (!i.outcome) errors.push({ field: 'outcome', message: REQUIRED });
    else if (!(OUTCOMES as readonly string[]).includes(i.outcome)) {
      errors.push({ field: 'outcome', message: `Choose one of: ${OUTCOMES.join(', ')}.` });
    }
    const d = i.call_duration_seconds;
    if (d !== undefined && d !== null && (!Number.isInteger(d) || d < 1 || d >= 86400)) {
      errors.push({ field: 'call_duration_seconds', message: 'Enter how long the call lasted, for example 3 min 28 sec (up to 23 h 59 min).' });
    }
  }

  const next = i.next_follow_up_on ?? null;
  if (next !== null) {
    if (Number.isNaN(next.getTime())) errors.push({ field: 'next_follow_up_on', message: 'Enter a valid date and time.' });
    else if (next.getTime() < now.getTime() - FUTURE_TOLERANCE_MS) {
      errors.push({ field: 'next_follow_up_on', message: 'The next follow-up cannot be in the past.' });
    }
  } else if (i.outcome === 'Call back later') {
    errors.push({ field: 'next_follow_up_on', message: 'Pick when to call back.' });
  }
  return errors;
}

/** What the calling list shows for a company: the state of its latest call. */
export function deriveCallingStatus(c: {
  call_attempts: number;
  last_call_status: string | null;
  last_outcome: string | null;
}): CallingStatusLabel {
  if (!c.call_attempts) return 'Pending';
  if (c.last_call_status === 'Not received') return 'Not Received';
  if (c.last_outcome === 'Interested') return 'Interested';
  if (c.last_outcome === 'Not interested') return 'Not Interested';
  return 'Connected';
}

/**
 * Hands the ids out to the employees in turn so every employee gets the same number, give or take one
 * ("Equal distribution among employees").
 */
export function splitEqually(ids: number[], empIds: number[]): { emp_id: number; ids: number[] }[] {
  const plan = empIds.map((emp_id) => ({ emp_id, ids: [] as number[] }));
  if (plan.length === 0) return plan;
  const base = Math.floor(ids.length / plan.length);
  const extra = ids.length % plan.length;
  let at = 0;
  plan.forEach((p, n) => {
    const take = base + (n < extra ? 1 : 0);
    p.ids = ids.slice(at, at + take);
    at += take;
  });
  return plan;
}
