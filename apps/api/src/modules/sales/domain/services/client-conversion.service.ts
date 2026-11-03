import { FieldError } from '../errors/sales.errors';
import { MSG } from './company-validator.service';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const WIN_NOTE_MAX = 5000;

/** The calendar date (YYYY-MM-DD) of an instant in Indian time. */
export function istDateString(at: Date): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-10-26" -> a Date at 00:00 UTC, which is how a date-only column is stored. */
export function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * BFD section 9, Part 1. "Won on" is the date the company said yes: today or a past date,
 * not before the lead was added. The Win note says what was agreed (the PO, the scope).
 */
export function validateWon(
  i: { won_on: string | null; win_note: string | null },
  leadAddedAt: Date,
  now: Date,
): FieldError[] {
  const errors: FieldError[] = [];
  if (!i.won_on) errors.push({ field: 'won_on', message: MSG.required });
  else if (!isRealDate(i.won_on)) errors.push({ field: 'won_on', message: 'Please enter a valid date (YYYY-MM-DD).' });
  else if (i.won_on > istDateString(now)) errors.push({ field: 'won_on', message: 'Won on must be today or a past date.' });
  else if (i.won_on < istDateString(leadAddedAt)) errors.push({ field: 'won_on', message: 'Won on cannot be before the lead was added.' });

  if (!i.win_note) errors.push({ field: 'win_note', message: MSG.required });
  else if (i.win_note.length > WIN_NOTE_MAX) errors.push({ field: 'win_note', message: `Please keep it under ${WIN_NOTE_MAX} characters.` });
  return errors;
}

/** "What will be carried forward" (BFD section 9, Part 2). Shown as a summary in the pop-up. */
export const CARRIED_FORWARD = [
  { key: 'company', label: 'Company details' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'communication', label: 'Communication history' },
  { key: 'notes', label: 'Notes and requirement' },
  { key: 'lead', label: 'Lead details' },
] as const;

/** The Sales Fields sheet has 31 company fields. */
export const COMPANY_FIELD_COUNT = 31;
