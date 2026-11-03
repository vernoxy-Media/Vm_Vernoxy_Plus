import { FieldError } from '../errors/sales.errors';
import { CONVERSATION_TYPES, OUTCOMES, WHAT_DISCUSSED_MAX } from './activity-validator.service';
import { MSG } from './company-validator.service';

/** A little slack so a form filled "now" is not rejected by clock drift. */
const SLACK_MS = 2 * 60 * 1000;
export const PURPOSE_MAX = 500;
export const REASON_MAX = 500;

export const NEXT_STEPS = ['schedule', 'qualify', 'hold', 'lost', 'none'] as const;
export type NextStepAction = (typeof NEXT_STEPS)[number];

/** Outcomes after which the popup suggests "Mark as lost" ("Not interested"). The user may pick another step. */
export const OUTCOMES_SUGGESTING_LOST: readonly string[] = ['Not interested'];

function checkDate(field: string, at: Date | null, now: Date, errors: FieldError[], what: string) {
  if (!at || Number.isNaN(at.getTime())) errors.push({ field, message: MSG.required });
  else if (at.getTime() < now.getTime() - SLACK_MS) errors.push({ field, message: `${what} must be today or later.` });
}

/** Schedule next follow-up / "+ Schedule Follow-up" (BFD section 7, Part 2). `prefix` namespaces the field names. */
export function validateSchedule(
  i: { follow_up_on: Date | null; type: string | null; contact_id: number | null; purpose: string | null },
  now: Date,
  prefix = '',
): FieldError[] {
  const errors: FieldError[] = [];
  checkDate(`${prefix}follow_up_on`, i.follow_up_on, now, errors, 'The follow-up');
  if (!i.type) errors.push({ field: `${prefix}type`, message: MSG.required });
  else if (!(CONVERSATION_TYPES as readonly string[]).includes(i.type)) {
    errors.push({ field: `${prefix}type`, message: `Choose one of: ${CONVERSATION_TYPES.join(', ')}.` });
  }
  if (i.contact_id === null || !Number.isInteger(i.contact_id)) errors.push({ field: `${prefix}contact_id`, message: MSG.required });
  if (i.purpose && i.purpose.length > PURPOSE_MAX) {
    errors.push({ field: `${prefix}purpose`, message: `Please keep it under ${PURPOSE_MAX} characters.` });
  }
  return errors;
}

/** Reschedule: a new date and time and a reason; the old date stays in History. */
export function validateReschedule(i: { follow_up_on: Date | null; reason: string | null }, now: Date): FieldError[] {
  const errors: FieldError[] = [];
  checkDate('follow_up_on', i.follow_up_on, now, errors, 'The new date');
  if (!i.reason) errors.push({ field: 'reason', message: MSG.required });
  else if (i.reason.length > REASON_MAX) errors.push({ field: 'reason', message: `Please keep it under ${REASON_MAX} characters.` });
  return errors;
}

export function validateCancel(i: { reason: string | null }): FieldError[] {
  if (!i.reason) return [{ field: 'reason', message: MSG.required }];
  if (i.reason.length > REASON_MAX) return [{ field: 'reason', message: `Please keep it under ${REASON_MAX} characters.` }];
  return [];
}

/**
 * Complete Follow-up (BFD section 7, Part 5). Done on starts as now; it can be earlier but not
 * before the follow-up was created, and not in the future.
 */
export function validateComplete(
  i: { done_on: Date | null; outcome: string | null; what_happened: string | null; next_step: string | null },
  followUpCreatedAt: Date,
  now: Date,
): FieldError[] {
  const errors: FieldError[] = [];
  if (!i.done_on || Number.isNaN(i.done_on.getTime())) errors.push({ field: 'done_on', message: MSG.required });
  else if (i.done_on.getTime() > now.getTime() + SLACK_MS) errors.push({ field: 'done_on', message: 'The date and time cannot be in the future.' });
  else if (i.done_on.getTime() < followUpCreatedAt.getTime() - SLACK_MS) {
    errors.push({ field: 'done_on', message: 'It cannot be before the follow-up was created.' });
  }
  if (!i.outcome) errors.push({ field: 'outcome', message: MSG.required });
  else if (!(OUTCOMES as readonly string[]).includes(i.outcome)) {
    errors.push({ field: 'outcome', message: `Choose one of: ${OUTCOMES.join(', ')}.` });
  }
  if (!i.what_happened) errors.push({ field: 'what_happened', message: MSG.required });
  else if (i.what_happened.length > WHAT_DISCUSSED_MAX) {
    errors.push({ field: 'what_happened', message: `Please keep it under ${WHAT_DISCUSSED_MAX} characters.` });
  }
  if (!i.next_step) errors.push({ field: 'next_step.action', message: MSG.required });
  else if (!(NEXT_STEPS as readonly string[]).includes(i.next_step)) {
    errors.push({ field: 'next_step.action', message: `Choose one of: ${NEXT_STEPS.join(', ')}.` });
  }
  return errors;
}
