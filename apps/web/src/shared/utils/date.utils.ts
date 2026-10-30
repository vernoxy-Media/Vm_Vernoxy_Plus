/**
 * Formats a date string, Date object, or timestamp into uniform DD-MM-YYYY format
 * as specified in BFD requirement GEN-02.
 */
export function formatDisplayDate(dateVal?: string | Date | null): string {
  if (!dateVal) return '';

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    // If already in YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}-${m}-${y}`;
    }
    // If already in DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed;
    }
  }

  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(dateVal);
  }
}

/**
 * Formats duration in minutes to standard BFD representation: "Xh Ym"
 */
export function formatDisplayMinutes(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
