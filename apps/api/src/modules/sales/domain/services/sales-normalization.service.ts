/** Pure helpers that turn raw form input into the shape that is stored and compared. */

export function cleanText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

/**
 * Keeps digits only. A leading country code (+91 / 91 / 0) is dropped when the
 * result is longer than 10 digits, so "+91 98250 41236" becomes "9825041236".
 * Anything that is still not 10 digits is returned as typed so the validator
 * can report it.
 */
export function normalizeMobile(value: unknown): string | null {
  const raw = cleanText(value);
  if (raw === null) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits === '' ? raw : digits;
}

export function normalizeEmail(value: unknown): string | null {
  const raw = cleanText(value);
  return raw === null ? null : raw.toLowerCase();
}

/** Comparison key for "same Company Name in the same City". */
export function nameKey(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Initials shown in the avatar of the Company column, e.g. "Shree Ganesh Polymers" -> "SG". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
