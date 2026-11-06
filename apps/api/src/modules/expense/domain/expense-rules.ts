/**
 * Expense Management BFD 1.0 rules (pure, no database access).
 */

export const OFFICE = 'Office Expense';
export const PERSONAL = 'Personal Expense';
export const MAX_AMOUNT = 1000000;
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXT = /\.(pdf|jpe?g|png)$/i;

export interface ClaimInput {
  expense_date?: string | null;
  category_id?: number | null;
  expense_type?: string | null;
  amount?: number | null;
  merchant_name?: string | null;
  description?: string | null;
}

export interface CategoryRule {
  category_id: number;
  name: string;
  is_active: boolean;
  allowed_type: 'OFFICE' | 'PERSONAL' | 'BOTH';
  limit_per_claim: number | null;
  receipt_rule: 'ALWAYS' | 'ABOVE_THRESHOLD';
  receipt_threshold_amount: number;
}

export interface ReceiptFile {
  file_name: string;
  mime_type?: string | null;
  file_size_bytes: number;
}

export type FieldErrors = Record<string, string>;

/** Today as YYYY-MM-DD in the company timezone (Asia/Kolkata). */
export function todayStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

export function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return '';
  return typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

export function inr(n: number | null | undefined): string {
  return `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function typeAllowed(cat: Pick<CategoryRule, 'allowed_type'>, type: string): boolean {
  if (cat.allowed_type === 'BOTH') return type === OFFICE || type === PERSONAL;
  return cat.allowed_type === 'OFFICE' ? type === OFFICE : type === PERSONAL;
}

export function receiptRequired(cat: CategoryRule, amount: number): boolean {
  return cat.receipt_rule === 'ALWAYS' || amount > Number(cat.receipt_threshold_amount || 0);
}

/** "Save as Draft needs only the Expense Date" (BFD 4 Part 1, marker 9). */
export function draftErrors(input: ClaimInput, today = todayStr()): FieldErrors {
  const e: FieldErrors = {};
  if (!input.expense_date) e.expense_date = 'Please fill this field.';
  else if (input.expense_date > today) e.expense_date = 'The expense date cannot be in the future.';
  if (input.amount !== undefined && input.amount !== null && !validAmount(input.amount)) {
    e.amount = 'Please enter an amount more than 0.';
  }
  if (input.description && input.description.length > 500) e.description = 'The description can be up to 500 characters.';
  if (input.merchant_name && input.merchant_name.length > 100) e.merchant_name = 'Merchant / Paid to can be up to 100 characters.';
  return e;
}

export function validAmount(n: number): boolean {
  return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT && Math.round(n * 100) === Number((n * 100).toFixed(6));
}

/** "Stops" checks of BFD 4 Part 3. */
export function submitErrors(
  input: ClaimInput,
  category: CategoryRule | null,
  receipts: ReceiptFile[],
  today = todayStr(),
): FieldErrors {
  const e: FieldErrors = {};
  const need = 'Please fill this field.';
  if (!input.expense_date) e.expense_date = need;
  else if (input.expense_date > today) e.expense_date = 'The expense date cannot be in the future.';
  if (!input.category_id) e.category_id = need;
  else if (!category) e.category_id = 'This category is no longer in use. Please choose another.';
  else if (!category.is_active) e.category_id = 'This category is no longer in use. Please choose another.';
  if (!input.expense_type) e.expense_type = need;
  else if (category && !typeAllowed(category, input.expense_type)) {
    e.expense_type = `${category.name} allows only ${category.allowed_type === 'OFFICE' ? OFFICE : PERSONAL}.`;
  }
  if (input.amount === undefined || input.amount === null) e.amount = need;
  else if (!validAmount(Number(input.amount))) e.amount = 'Please enter an amount more than 0.';
  const desc = (input.description || '').trim();
  if (!desc) e.description = need;
  else if (desc.length < 10 || desc.length > 500) e.description = 'Please write at least 10 characters about the purpose.';
  if (input.merchant_name && input.merchant_name.length > 100) e.merchant_name = 'Merchant / Paid to can be up to 100 characters.';

  const fileError = receiptFileError(receipts);
  if (fileError) e.receipts = fileError;
  else if (category && input.amount && receiptRequired(category, Number(input.amount)) && receipts.length === 0) {
    e.receipts =
      category.receipt_rule === 'ALWAYS'
        ? 'A receipt is required for this category.'
        : `A receipt is required for this category above ${inr(category.receipt_threshold_amount)}.`;
  }
  return e;
}

export function receiptFileError(receipts: ReceiptFile[]): string | null {
  if (receipts.length > MAX_FILES) return 'Only PDF, JPG or PNG up to 5 MB, up to 5 files.';
  for (const r of receipts) {
    const okType = (r.mime_type && ALLOWED_MIME.includes(r.mime_type.toLowerCase())) || ALLOWED_EXT.test(r.file_name);
    if (!okType || Number(r.file_size_bytes) > MAX_FILE_BYTES) return 'Only PDF, JPG or PNG up to 5 MB, up to 5 files.';
  }
  return null;
}

export interface Flag {
  code: 'ABOVE_LIMIT' | 'POSSIBLE_DUPLICATE' | 'LATE';
  label: string;
  message: string;
  claim_no?: string | null;
  claim_id?: number | null;
}

/** "Flag" checks of BFD 4 Part 3: the claim goes through and the approver sees an amber flag. */
export function computeFlags(
  input: ClaimInput,
  category: CategoryRule | null,
  duplicate: { claim_id: number; claim_no: string | null } | null,
  claimWindowDays: number,
  today = todayStr(),
): Flag[] {
  const flags: Flag[] = [];
  if (category?.limit_per_claim && Number(input.amount) > Number(category.limit_per_claim)) {
    flags.push({
      code: 'ABOVE_LIMIT',
      label: 'Above limit',
      message: `This amount is above the ${inr(category.limit_per_claim)} limit for this category. Your approver will see this.`,
    });
  }
  if (duplicate) {
    flags.push({
      code: 'POSSIBLE_DUPLICATE',
      label: 'Possible duplicate',
      message: `You already have a claim with the same date, category and amount${duplicate.claim_no ? ` (${duplicate.claim_no})` : ''}.`,
      claim_no: duplicate.claim_no,
      claim_id: duplicate.claim_id,
    });
  }
  if (input.expense_date && daysBetween(input.expense_date, today) > claimWindowDays) {
    flags.push({
      code: 'LATE',
      label: 'Late',
      message: `This expense is older than ${claimWindowDays} days. Your approver will see this.`,
    });
  }
  return flags;
}

/** EXP/<year>/<month>/<running number> by month of submission (BFD 5). */
export function formatClaimNo(submittedOn: string, seq: number): string {
  const [y, m] = submittedOn.split('-');
  return `EXP/${y}/${m}/${String(seq).padStart(4, '0')}`;
}
