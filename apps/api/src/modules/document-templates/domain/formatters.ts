/**
 * Formatting shared by every document kind: Indian rupee amounts, amount in words, dates, masking.
 * Pure functions, no framework.
 */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** 110000 -> "1,10,000.00" (Indian digit grouping, always two decimals). */
export function formatAmount(n: number): string {
  return (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 110000 -> "₹ 1,10,000.00". */
export function formatRupees(n: number): string {
  return `₹ ${formatAmount(n)}`;
}

/** 25 -> "25", 24.5 -> "24.5" (day counts and hours never show trailing zeros). */
export function formatCount(n: number): string {
  return String(round2(Number(n) || 0));
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-05-31" -> "31-May-2025"; anything else -> "—". */
export function formatDate(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return '—';
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return `${String(d).padStart(2, '0')}-${MONTHS_SHORT[m - 1]}-${y}`;
}

/** "501234567890" -> "XXXX XXXX 7890". Slips are emailed and printed, so the full number never shows. */
export function maskAccount(account: string | null | undefined): string {
  const digits = String(account ?? '').replace(/\s+/g, '');
  if (!digits) return '—';
  return `XXXX XXXX ${digits.slice(-4)}`;
}

/** Empty or missing text -> "—". */
export function orDash(value: string | null | undefined): string {
  const t = String(value ?? '').trim();
  return t || '—';
}

/** 92200 -> "Rupees Ninety-Two Thousand Two Hundred Only" (Indian system: thousand, lakh, crore). */
export function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return 'Rupees Zero Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? `-${ones[x % 10]}` : ''}`);
  const three = (x: number) => (x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${two(x % 100)}` : ''}` : two(x));
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));
  return `Rupees ${parts.join(' ')} Only`;
}
