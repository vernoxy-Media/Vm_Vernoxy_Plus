/** One call attempt, with what the company-wise report and the call history need. */
export interface CompanyCallAttempt {
  communication_id: number;
  company_id: number | null;
  lead_id: number | null;
  company_name: string | null;
  /** The contact person saved on the company. */
  company_contact: string | null;
  /** The person named on this call. */
  call_contact: string | null;
  call_date: Date;
  call_status: string | null;
  not_received_reason: string | null;
  outcome: string | null;
  duration_seconds: number | null;
  remark: string | null;
  called_by: string | null;
}

export interface CompanyCallRow {
  /** Unique per row. */
  key: string;
  company_id: number | null;
  company_name: string;
  contact_person: string | null;
  total: number;
  received: number;
  not_received: number;
  /** Outcome of the most recent RECEIVED call. */
  latest_outcome: string | null;
  /** Date and remark of the most recent attempt, received or not. */
  last_call_date: Date;
  last_remark: string | null;
}

export const COMPANY_CALL_SORTS = [
  'company_name',
  'contact_person',
  'total',
  'received',
  'not_received',
  'latest_outcome',
  'last_call_date',
  'last_remark',
] as const;
export type CompanyCallSort = (typeof COMPANY_CALL_SORTS)[number];

export interface CompanyCallView {
  /** Matches the company name or the contact person. */
  q?: string;
  sort?: CompanyCallSort;
  dir?: 'asc' | 'desc';
}

const newestFirst = (a: CompanyCallAttempt, b: CompanyCallAttempt) =>
  b.call_date.getTime() - a.call_date.getTime() || b.communication_id - a.communication_id;

/** One row per company that has at least one received call among the given attempts. */
export function buildCompanyCallRows(attempts: CompanyCallAttempt[]): CompanyCallRow[] {
  const groups = new Map<string, CompanyCallAttempt[]>();
  for (const a of attempts) {
    // A call on a lead that has no company is grouped by that lead.
    const key = a.company_id !== null ? `company-${a.company_id}` : a.lead_id !== null ? `lead-${a.lead_id}` : `call-${a.communication_id}`;
    const group = groups.get(key);
    if (group) group.push(a);
    else groups.set(key, [a]);
  }

  const rows: CompanyCallRow[] = [];
  for (const [key, group] of groups) {
    const calls = [...group].sort(newestFirst);
    const received = calls.filter((c) => c.call_status === 'Received');
    if (received.length === 0) continue;
    const last = calls[0];
    const notReceived = calls.filter((c) => c.call_status === 'Not received').length;
    rows.push({
      key,
      company_id: last.company_id,
      company_name: last.company_name ?? 'No company',
      contact_person: last.company_contact?.trim() || calls.find((c) => c.call_contact?.trim())?.call_contact || null,
      // A call saved with neither status is not counted, so the total always equals the two parts.
      total: received.length + notReceived,
      received: received.length,
      not_received: notReceived,
      latest_outcome: received[0].outcome,
      last_call_date: last.call_date,
      last_remark: last.remark,
    });
  }
  return rows;
}

/** Applies the search and the sort. Empty values always go to the end. */
export function viewCompanyCallRows(rows: CompanyCallRow[], { q, sort = 'last_call_date', dir = 'desc' }: CompanyCallView): CompanyCallRow[] {
  const needle = q?.trim().toLowerCase();
  const found = needle ? rows.filter((r) => `${r.company_name}\n${r.contact_person ?? ''}`.toLowerCase().includes(needle)) : rows;
  const sign = dir === 'asc' ? 1 : -1;
  return [...found].sort((a, b) => {
    const x = a[sort];
    const y = b[sort];
    if (x === null || y === null) {
      if (x !== y) return x === null ? 1 : -1;
    } else {
      const order =
        typeof x === 'string' ? x.localeCompare(y as string, 'en', { sensitivity: 'base' }) : Number(x) - Number(y);
      if (order !== 0) return order * sign;
    }
    return a.company_name.localeCompare(b.company_name);
  });
}
