import { FieldError } from '../errors/sales.errors';
import { FIRST_NOTE_MAX_LENGTH, SERVICE_FIT_MAX_LENGTH, joinServiceFit } from '../entities/sales-lead';
import { MSG } from './company-validator.service';

export interface ConvertToLeadFields {
  lead_source: string | null;
  lead_by_id: number | null;
  service_fit: string[];
  first_note: string | null;
}

/** BFD section 6, Part 2: Lead Source, Lead By and Service Fit are required. Status and Date Added are system fields. */
export function validateConvertToLead(input: ConvertToLeadFields): FieldError[] {
  const errors: FieldError[] = [];
  if (!input.lead_source) errors.push({ field: 'lead_source', message: MSG.required });
  if (input.lead_by_id === null || !Number.isInteger(input.lead_by_id) || input.lead_by_id <= 0) {
    errors.push({ field: 'lead_by_id', message: MSG.required });
  }
  if (input.service_fit.length === 0) {
    errors.push({ field: 'service_fit', message: MSG.required });
  } else if (joinServiceFit(input.service_fit).length > SERVICE_FIT_MAX_LENGTH) {
    errors.push({ field: 'service_fit', message: 'Please choose fewer services.' });
  }
  if (input.first_note !== null && input.first_note.length > FIRST_NOTE_MAX_LENGTH) {
    errors.push({ field: 'first_note', message: `The note must be at most ${FIRST_NOTE_MAX_LENGTH} characters.` });
  }
  return errors;
}

/** Trims, drops blanks and repeats (case-insensitive) while keeping the order the user picked. */
export function normalizeServiceFit(values: unknown): string[] {
  const list = Array.isArray(values) ? values : values === undefined || values === null ? [] : [values];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of list) {
    const s = String(v ?? '').trim();
    if (s && !seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      out.push(s);
    }
  }
  return out;
}
