import { ValidationDomainError } from '../errors/organization.errors';

/**
 * Rules for what is typed into an employee's profile. Pure, so they can be tested without a database.
 */

/** A person's name: letters (any language), spaces, and the . ' - that real names contain. No digits or symbols. */
const NAME_RE = /^[\p{L}][\p{L}\p{M} .'’-]*$/u;

export function assertPersonName(value: string | null | undefined, field: string, label = 'Name'): string {
  const v = (value ?? '').trim().replace(/\s+/g, ' ');
  if (!v) throw new ValidationDomainError(`${label} is required`, field);
  if (v.length > 100) throw new ValidationDomainError(`${label} must be at most 100 characters`, field);
  if (!NAME_RE.test(v)) {
    throw new ValidationDomainError(`${label} can contain only letters, spaces and . ' - (no numbers or special characters)`, field);
  }
  return v;
}

export interface EmergencyContact {
  name: string;
  relation: string | null;
  number: string;
}

export const MAX_EMERGENCY_CONTACTS = 5;

const DIGITS = /^\+?[0-9]{7,15}$/;

/**
 * The emergency contacts of an employee, checked and cleaned. A row left completely empty is dropped; a row with
 * only a name or only a number is an error, so a contact is never saved half way.
 */
export function normalizeEmergencyContacts(input: unknown): EmergencyContact[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new ValidationDomainError('Emergency contacts must be a list', 'emergency_contacts');
  const out: EmergencyContact[] = [];
  for (const raw of input) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const name = String(r.name ?? '').trim();
    const number = String(r.number ?? '').replace(/[\s()-]/g, '');
    const relation = String(r.relation ?? '').trim();
    if (!name && !number && !relation) continue;
    if (!name) throw new ValidationDomainError('Emergency contact name is required', 'emergency_contacts');
    if (!number) throw new ValidationDomainError(`Phone number of ${name} is required`, 'emergency_contacts');
    const cleanName = assertPersonName(name, 'emergency_contacts', 'Emergency contact name');
    if (!DIGITS.test(number)) {
      throw new ValidationDomainError(`Phone number of ${cleanName} must have 7 to 15 digits`, 'emergency_contacts');
    }
    if (relation && !/^[\p{L}][\p{L}\p{M} .'’/-]{0,49}$/u.test(relation)) {
      throw new ValidationDomainError(`Relation of ${cleanName} can contain only letters`, 'emergency_contacts');
    }
    out.push({ name: cleanName, relation: relation || null, number });
  }
  if (out.length > MAX_EMERGENCY_CONTACTS) {
    throw new ValidationDomainError(`At most ${MAX_EMERGENCY_CONTACTS} emergency contacts can be saved`, 'emergency_contacts');
  }
  return out;
}

/** A salary or PF amount: a number, never negative. */
export function assertAmount(value: unknown, field: string, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new ValidationDomainError(`${label} must be a number`, field);
  if (n < 0) throw new ValidationDomainError(`${label} cannot be negative`, field);
  return n;
}
