/**
 * Timezone and Date utilities for Sales module.
 * Display requirement: UTC ISO -> IST (Asia/Kolkata) as "30 Oct 2026, 4:30 PM".
 */


export function parseDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format date in IST (Asia/Kolkata) as "30 Oct 2026, 4:30 PM"
 */
export function formatDateTimeIST(dateInput: string | Date | null | undefined): string {
  const d = parseDate(dateInput);
  if (!d) return '—';

  // Format using Intl.DateTimeFormat with Asia/Kolkata
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return formatter.format(d);
}

/**
 * Format date in IST as "30 Oct 2026"
 */
export function formatDateIST(dateInput: string | Date | null | undefined): string {
  const d = parseDate(dateInput);
  if (!d) return '—';

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return formatter.format(d);
}

/**
 * Format time in IST as "4:30 PM"
 */
export function formatTimeIST(dateInput: string | Date | null | undefined): string {
  const d = parseDate(dateInput);
  if (!d) return '—';

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return formatter.format(d);
}

/**
 * Format date for HTML datetime-local input in local/IST representation (YYYY-MM-DDTHH:mm)
 */
export function toInputDateTimeIST(dateInput?: string | Date | null): string {
  const d = parseDate(dateInput) ?? new Date();

  // Get parts in Asia/Kolkata
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  let hour = getPart('hour');
  if (hour === '24') hour = '00';
  const minute = getPart('minute');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Format date for HTML date input (YYYY-MM-DD)
 */
export function toInputDateIST(dateInput?: string | Date | null): string {
  const d = parseDate(dateInput) ?? new Date();

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
}

/**
 * Convert local datetime string (YYYY-MM-DDTHH:mm) entered in IST to UTC ISO string for backend
 */
export function istInputToIso(datetimeLocal: string): string {
  if (!datetimeLocal) return new Date().toISOString();
  // Assume datetimeLocal was chosen in IST (UTC+05:30)
  // Append +05:30 offset so Date constructor parses it accurately
  const withOffset = datetimeLocal.length === 16 ? `${datetimeLocal}:00+05:30` : `${datetimeLocal}+05:30`;
  const parsed = new Date(withOffset);
  return isNaN(parsed.getTime()) ? new Date(datetimeLocal).toISOString() : parsed.toISOString();
}

/**
 * Relative time ago
 */
export function timeAgo(dateInput: string | Date | null | undefined): string {
  const d = parseDate(dateInput);
  if (!d) return '—';

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return formatDateIST(d);
}

/**
 * Remaining time in hours/minutes until deadline
 */
export function formatRemainingHours(deadlineInput: string | Date | null | undefined): string {
  const d = parseDate(deadlineInput);
  if (!d) return '0h';

  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return 'expired';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
