import { FieldError } from '../errors/sales.errors';
import { MSG } from './company-validator.service';

export const CONVERSATION_TYPES = ['Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit'] as const;
export const OUTCOMES = ['Interested', 'Not interested', 'Call back later', 'Needs more information', 'No response'] as const;
export const NOTE_TYPES = ['General', 'Requirement', 'Budget', 'Readiness'] as const; // Win and Lost notes are made by the system
export const WHAT_DISCUSSED_MAX = 5000;
export const NOTE_MAX = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** A little slack so a form filled "now" is not rejected by clock drift. */
const FUTURE_TOLERANCE_MS = 2 * 60 * 1000;

export interface ConversationInput {
  type: string | null;
  contact_id: number | null;
  communication_date: Date | null;
  what_discussed: string | null;
  outcome: string | null;
}

/** BFD section 7, Part 1/2. Quick log leaves the outcome empty, the full popup requires it. */
export function validateConversation(i: ConversationInput, now: Date, opts: { requireOutcome: boolean }): FieldError[] {
  const errors: FieldError[] = [];
  if (!i.type) errors.push({ field: 'type', message: MSG.required });
  else if (!(CONVERSATION_TYPES as readonly string[]).includes(i.type)) {
    errors.push({ field: 'type', message: `Choose one of: ${CONVERSATION_TYPES.join(', ')}.` });
  }
  if (i.contact_id === null || !Number.isInteger(i.contact_id)) errors.push({ field: 'contact_id', message: MSG.required });

  if (i.communication_date === null || Number.isNaN(i.communication_date.getTime())) {
    errors.push({ field: 'communication_date', message: MSG.required });
  } else if (i.communication_date.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    errors.push({ field: 'communication_date', message: 'The date and time cannot be in the future.' });
  }

  if (!i.what_discussed) errors.push({ field: 'what_discussed', message: MSG.required });
  else if (i.what_discussed.length > WHAT_DISCUSSED_MAX) {
    errors.push({ field: 'what_discussed', message: `Please keep it under ${WHAT_DISCUSSED_MAX} characters.` });
  }

  if (!i.outcome) {
    if (opts.requireOutcome) errors.push({ field: 'outcome', message: MSG.required });
  } else if (!(OUTCOMES as readonly string[]).includes(i.outcome)) {
    errors.push({ field: 'outcome', message: `Choose one of: ${OUTCOMES.join(', ')}.` });
  }
  return errors;
}

export function validateNote(i: { note_type: string | null; note: string | null }): FieldError[] {
  const errors: FieldError[] = [];
  if (!i.note_type) errors.push({ field: 'note_type', message: MSG.required });
  else if (!(NOTE_TYPES as readonly string[]).includes(i.note_type)) {
    errors.push({ field: 'note_type', message: `Choose one of: ${NOTE_TYPES.join(', ')}.` });
  }
  if (!i.note) errors.push({ field: 'note', message: MSG.required });
  else if (i.note.length > NOTE_MAX) errors.push({ field: 'note', message: `Please keep it under ${NOTE_MAX} characters.` });
  return errors;
}

/** BFD section 5, Part 1: a contact needs a name and either a mobile or an email. */
export function validateContact(i: {
  name: string | null;
  designation: string | null;
  mobile: string | null;
  email: string | null;
}): FieldError[] {
  const errors: FieldError[] = [];
  if (!i.name) errors.push({ field: 'name', message: MSG.required });
  if (!i.mobile && !i.email) {
    errors.push({ field: 'mobile', message: 'Please enter a mobile number or an email so this person can be reached.' });
  }
  if (i.mobile && !/^\d{10}$/.test(i.mobile)) errors.push({ field: 'mobile', message: MSG.mobile });
  if (i.email && !EMAIL_RE.test(i.email)) errors.push({ field: 'email', message: MSG.email });
  return errors;
}
