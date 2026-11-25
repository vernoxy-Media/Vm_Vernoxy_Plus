import { LEAD_STATUSES, LeadStatus } from '../entities/sales-lead';
import { matchKey } from '../entities/import-fields';
import { cleanText, nameKey, normalizeEmail, normalizeMobile } from './sales-normalization.service';
import {
  CALL_STATUSES,
  CONVERSATION_TYPES,
  NOTE_MAX,
  NOTE_TYPES,
  OUTCOMES,
  WHAT_DISCUSSED_MAX,
  validateContact,
} from './activity-validator.service';
import { PURPOSE_MAX, REASON_MAX } from './follow-up-validator.service';
import { statusAfterConversation } from './lead-workflow.service';

/**
 * The extra sheets of the bulk import (Contacts, Leads, Interactions, Follow-ups, Won, Notes).
 * Everything here is pure: it turns the raw cells of a sheet into a checked plan per company. The plan is
 * written to the database by the import repository. Rules mirror the screens (activity-validator,
 * follow-up-validator, lead-workflow); the only relaxation is that imported history may be in the past.
 */

export const HISTORY_SHEETS = ['contacts', 'leads', 'interactions', 'follow-ups', 'won', 'notes'] as const;
export type HistorySheet = (typeof HISTORY_SHEETS)[number];
export const SHEET_TITLE: Record<HistorySheet | 'companies', string> = {
  companies: 'Companies',
  contacts: 'Contacts',
  leads: 'Leads',
  interactions: 'Interactions',
  'follow-ups': 'Follow-ups',
  won: 'Won',
  notes: 'Notes',
};

export interface RawSheetRow {
  rowNumber: number;
  cells: Record<string, string>;
}
export type RawSheets = Partial<Record<HistorySheet, RawSheetRow[]>>;

export interface HistoryIssue {
  sheet: string;
  row: number;
  company_key: string | null;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface UserRef {
  emp_id: number;
  name: string;
  email: string | null;
}

export interface PlannedContact {
  row: number;
  name: string;
  designation: string | null;
  mobile: string | null;
  email: string | null;
  is_primary: boolean;
}
export interface PlannedLead {
  row: number;
  /** Raw text, checked against the masters by the existing company-row check. */
  lead_source: string | null;
  lead_by: string | null;
  service_fit: string | null;
  date_added: Date | null;
  stage: LeadStatus;
  lost_reason: string | null;
  lost_note: string | null;
  on_hold_reason: string | null;
  on_hold_date: Date | null;
}
export interface PlannedInteraction {
  row: number;
  contact_name: string;
  type: string;
  at: Date;
  what_discussed: string | null;
  outcome: string | null;
  call_status: string | null;
  not_received_reason: string | null;
  call_duration_seconds: number | null;
  done_by_id: number | null;
}
export type PlannedFollowUpStatus = 'Pending' | 'Overdue' | 'Completed' | 'Cancelled';
export interface PlannedFollowUp {
  row: number;
  contact_name: string;
  follow_up_on: Date;
  type: string;
  purpose: string | null;
  assigned_to_id: number;
  status: PlannedFollowUpStatus;
  done_on: Date | null;
  outcome: string | null;
  what_happened: string | null;
  reason: string | null;
}
export interface PlannedNote {
  row: number;
  note_type: string;
  note: string;
  is_pinned: boolean;
  created_by_id: number | null;
  created_on: Date | null;
}
export interface PlannedWon {
  row: number;
  won_on: Date;
  project_revenue: number | null;
  win_note: string;
  owner_id: number | null;
}

export interface CompanyPlan {
  key: string;
  contacts: PlannedContact[];
  lead: PlannedLead | null;
  interactions: PlannedInteraction[];
  follow_ups: PlannedFollowUp[];
  notes: PlannedNote[];
  won: PlannedWon | null;
}

export interface HistoryBuild {
  plans: Map<string, CompanyPlan>;
  issues: HistoryIssue[];
  /** Company keys that have at least one error in their extra sheets: the whole company is not imported. */
  blocked: Set<string>;
}

// ------------------------------------------------------------------ cells ----

/** A row's cells looked up by header without spaces, case or punctuation ("Company Key *" -> "companykey"). */
export function cellReader(cells: Record<string, string>) {
  const byKey = new Map<string, string>();
  for (const [k, v] of Object.entries(cells)) byKey.set(matchKey(k), v ?? '');
  return (...names: string[]): string | null => {
    for (const n of names) {
      const v = byKey.get(matchKey(n));
      if (v !== undefined && v.trim() !== '') return v.trim();
    }
    return null;
  };
}

const YES = new Set(['yes', 'y', 'true', '1']);
const NO = new Set(['no', 'n', 'false', '0']);
export function parseYesNo(v: string | null): boolean | null | undefined {
  if (v === null) return undefined;
  const s = v.toLowerCase();
  if (YES.has(s)) return true;
  if (NO.has(s)) return false;
  return null;
}

/** YYYY-MM-DD, or day-first DD-MM-YYYY / DD/MM/YYYY (the way dates are read in India). Returns y/m/d or null. */
export function parseDateParts(v: string | null): { y: number; m: number; d: number } | null {
  if (!v) return null;
  let y: number;
  let m: number;
  let d: number;
  let hit = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/.exec(v.trim());
  if (hit) {
    [y, m, d] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  } else if ((hit = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s].*)?$/.exec(v.trim()))) {
    [d, m, y] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  } else return null;
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** HH:mm, H:mm, HH:mm:ss, or 3:15 PM. Returns minutes since midnight or null. */
export function parseTimeMinutes(v: string | null): number | null {
  if (!v) return null;
  const hit = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)?$/i.exec(v.trim());
  if (!hit) return null;
  let h = Number(hit[1]);
  const min = Number(hit[2]);
  const ap = hit[3]?.toLowerCase();
  if (min > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
  } else if (h > 23) return null;
  return h * 60 + min;
}

/** The CRM is used in India; file dates and times are Indian Standard Time. */
const IST = '+05:30';
export function toInstant(date: { y: number; m: number; d: number }, minutes: number): Date {
  const p = (n: number) => String(n).padStart(2, '0');
  return new Date(`${date.y}-${p(date.m)}-${p(date.d)}T${p(Math.floor(minutes / 60))}:${p(minutes % 60)}:00${IST}`);
}

const FUTURE_SLACK_MS = 2 * 60 * 1000;
const pick = <T extends string>(list: readonly T[], v: string | null): T | null => {
  if (v === null) return null;
  const hit = list.find((x) => x.toLowerCase() === v.toLowerCase());
  return hit ?? null;
};

// ------------------------------------------------------------------ build ----

// ------------------------------------------- row readers (shared with the separate Lead and Follow-up imports) ----

export type Reporter = (field: string, message: string, severity?: 'error' | 'warning') => void;
export type CellGetter = ReturnType<typeof cellReader>;
export type UserFinder = (v: string | null) => UserRef | null | undefined;

/** A date and a time cell as one moment (IST). Reports a problem on the field that is wrong; returns null then. */
export function readDateTime(rep: Reporter, dateField: string, timeField: string, d: string | null, t: string | null, required: boolean): Date | null {
  if (!d && !t) {
    if (required) {
      rep(dateField, 'Please fill this field.');
      rep(timeField, 'Please fill this field.');
    }
    return null;
  }
  const parts = parseDateParts(d);
  if (!parts) {
    rep(dateField, d ? 'Use the date format YYYY-MM-DD.' : 'Please fill this field.');
    return null;
  }
  const minutes = t === null ? (required ? null : 0) : parseTimeMinutes(t);
  if (minutes === null) {
    rep(timeField, t ? 'Use the time format HH:mm.' : 'Please fill this field.');
    return null;
  }
  return toInstant(parts, minutes);
}

/** Lead Source, Lead By, Service Fit (raw text: checked against the masters later), Date Added, status, lost / on-hold details. */
export function readLeadFields(get: CellGetter, rep: Reporter, now: Date, row: number): PlannedLead {
  const rawStatus = get('Lead Status', 'Status');
  let stage: LeadStatus = 'New';
  if (rawStatus) {
    const s = pick(LEAD_STATUSES, rawStatus);
    if (!s) rep('Lead Status', `Choose one of: ${LEAD_STATUSES.join(', ')}.`);
    else stage = s;
  }
  const added = get('Date Added');
  let dateAdded: Date | null = null;
  if (added) {
    const parts = parseDateParts(added);
    if (!parts) rep('Date Added', 'Use the date format YYYY-MM-DD.');
    else {
      dateAdded = toInstant(parts, 9 * 60);
      if (dateAdded.getTime() > now.getTime() + FUTURE_SLACK_MS) rep('Date Added', 'The date cannot be in the future.');
    }
  }
  const lead: PlannedLead = {
    row,
    lead_source: get('Lead Source'),
    lead_by: get('Lead By'),
    service_fit: get('Service Fit'),
    date_added: dateAdded,
    stage,
    lost_reason: cleanText(get('Lost Reason')),
    lost_note: cleanText(get('Lost Note')),
    on_hold_reason: cleanText(get('On Hold Reason')),
    on_hold_date: null,
  };
  for (const [field, v] of [['Lead Source', lead.lead_source], ['Lead By', lead.lead_by], ['Service Fit', lead.service_fit]] as const) {
    if (!v) rep(field, 'Please fill this field.');
  }
  if (stage === 'Lost' && !lead.lost_reason) rep('Lost Reason', 'Please fill this field when the status is Lost.');
  if (stage === 'On Hold' && !lead.on_hold_reason) rep('On Hold Reason', 'Please fill this field when the status is On Hold.');
  const holdDate = get('On Hold Date');
  if (holdDate) {
    const parts = parseDateParts(holdDate);
    if (!parts) rep('On Hold Date', 'Use the date format YYYY-MM-DD.');
    else lead.on_hold_date = toInstant(parts, 9 * 60);
  }
  return lead;
}

/** The follow-up part of a row: date and time, type, purpose, assignee, status and the completed / cancelled details. */
export function readFollowUpFields(get: CellGetter, rep: Reporter, findUser: UserFinder, now: Date): Omit<PlannedFollowUp, 'row' | 'contact_name'> | null {
  const on = readDateTime(rep, 'Follow-up Date', 'Follow-up Time', get('Follow-up Date'), get('Follow-up Time'), true);

  const rawType = get('Type');
  const type = pick(CONVERSATION_TYPES, rawType);
  if (!rawType) rep('Type', 'Please fill this field.');
  else if (!type) rep('Type', `Choose one of: ${CONVERSATION_TYPES.join(', ')}.`);

  const purpose = cleanText(get('Purpose'));
  if (purpose && purpose.length > PURPOSE_MAX) rep('Purpose', `Please keep it under ${PURPOSE_MAX} characters.`);

  const rawAssignee = get('Assigned To');
  const assignee = findUser(rawAssignee);
  if (!rawAssignee) rep('Assigned To', 'Please fill this field.');
  else if (assignee === null) rep('Assigned To', `"${rawAssignee}" is not a Sales user.`);

  const rawStatus = get('Status');
  const status = pick(['Pending', 'Completed', 'Cancelled'] as const, rawStatus);
  if (!rawStatus) rep('Status', 'Please fill this field.');
  else if (!status) rep('Status', 'Choose one of: Pending, Completed, Cancelled.');

  let doneOn: Date | null = null;
  let outcome: string | null = null;
  let happened: string | null = null;
  let reason: string | null = null;
  if (status === 'Completed') {
    const dd = get('Done On Date');
    const dt = get('Done Time');
    doneOn = dd || dt ? readDateTime(rep, 'Done On Date', 'Done Time', dd, dt, true) : on;
    if (doneOn && doneOn.getTime() > now.getTime() + FUTURE_SLACK_MS) rep('Done On Date', 'The date and time cannot be in the future.');
    const rawOutcome = get('Outcome');
    outcome = pick(OUTCOMES, rawOutcome);
    if (!rawOutcome) rep('Outcome', 'Please fill this field.');
    else if (!outcome) rep('Outcome', `Choose one of: ${OUTCOMES.join(', ')}.`);
    happened = cleanText(get('Completion Note'));
    if (!happened) rep('Completion Note', 'Please fill this field.');
    else if (happened.length > WHAT_DISCUSSED_MAX) rep('Completion Note', `Please keep it under ${WHAT_DISCUSSED_MAX} characters.`);
  } else if (status === 'Cancelled') {
    reason = cleanText(get('Cancel Reason'));
    if (!reason) rep('Cancel Reason', 'Please fill this field.');
    else if (reason.length > REASON_MAX) rep('Cancel Reason', `Please keep it under ${REASON_MAX} characters.`);
  }

  if (!(on && type && assignee && status)) return null;
  // A pending follow-up whose time has passed would be turned Overdue by the daily job anyway.
  const finalStatus: PlannedFollowUpStatus = status === 'Pending' && on.getTime() < now.getTime() ? 'Overdue' : status;
  if (finalStatus === 'Overdue') rep('Status', 'The date has passed, so this follow-up is imported as Overdue.', 'warning');
  return { follow_up_on: on, type, purpose, assigned_to_id: assignee.emp_id, status: finalStatus, done_on: doneOn, outcome, what_happened: happened, reason };
}

/** Won On, Project Revenue, Win Note and Owner. Null when a required part is missing or wrong. */
export function readWonFields(get: CellGetter, rep: Reporter, findUser: UserFinder, now: Date, row: number): PlannedWon | null {
  const wonRaw = get('Won On');
  const parts = parseDateParts(wonRaw);
  let wonOn: Date | null = null;
  if (!wonRaw) rep('Won On', 'Please fill this field.');
  else if (!parts) rep('Won On', 'Use the date format YYYY-MM-DD.');
  else {
    wonOn = toInstant(parts, 9 * 60);
    if (wonOn.getTime() > now.getTime() + FUTURE_SLACK_MS) rep('Won On', 'The date cannot be in the future.');
  }
  const note = cleanText(get('Win Note'));
  if (!note) rep('Win Note', 'Please fill this field.');
  const revRaw = get('Project Revenue');
  let revenue: number | null = null;
  if (revRaw) {
    const n = Number(revRaw.replace(/[₹,\s]/g, '').replace(/^rs\.?/i, ''));
    if (!Number.isFinite(n) || n < 0) rep('Project Revenue', 'Please enter 0 or more.');
    else revenue = n;
  }
  const rawOwner = get('Owner');
  const owner = findUser(rawOwner);
  if (rawOwner && owner === null) rep('Owner', `"${rawOwner}" is not a Sales user.`);
  if (!(wonOn && note)) return null;
  return { row, won_on: wonOn, project_revenue: revenue, win_note: note, owner_id: owner ? owner.emp_id : null };
}

export const userFinder = (users: UserRef[]): UserFinder => {
  const byName = new Map<string, UserRef>();
  for (const u of users) {
    byName.set(u.name.trim().toLowerCase(), u);
    if (u.email) byName.set(u.email.trim().toLowerCase(), u);
  }
  return (v) => (v === null ? undefined : (byName.get(v.toLowerCase()) ?? null));
};

export function buildHistory(
  sheets: RawSheets,
  companyKeys: Map<string, { row: number }>,
  users: UserRef[],
  now: Date = new Date(),
): HistoryBuild {
  const issues: HistoryIssue[] = [];
  const plans = new Map<string, CompanyPlan>();
  const blocked = new Set<string>();
  const planOf = (key: string): CompanyPlan => {
    let p = plans.get(key);
    if (!p) plans.set(key, (p = { key, contacts: [], lead: null, interactions: [], follow_ups: [], notes: [], won: null }));
    return p;
  };

  /** Records a problem and, for an error, blocks the company the row belongs to. */
  const report = (sheet: HistorySheet, row: number, key: string | null, field: string, message: string, severity: 'error' | 'warning' = 'error') => {
    issues.push({ sheet: SHEET_TITLE[sheet], row, company_key: key, field, message, severity });
    if (severity === 'error' && key) blocked.add(key);
  };

  const userByName = new Map<string, UserRef>();
  for (const u of users) {
    userByName.set(u.name.trim().toLowerCase(), u);
    if (u.email) userByName.set(u.email.trim().toLowerCase(), u);
  }
  const findUser = (v: string | null): UserRef | null | undefined => (v === null ? undefined : (userByName.get(v.toLowerCase()) ?? null));

  /** The company key of a row, or null (with the error recorded) when it is empty or not in the Companies sheet. */
  const keyOf = (sheet: HistorySheet, r: RawSheetRow, get: ReturnType<typeof cellReader>): string | null => {
    const key = get('Company Key');
    if (!key) {
      report(sheet, r.rowNumber, null, 'Company Key', 'Please fill this field.');
      return null;
    }
    if (!companyKeys.has(key)) {
      report(sheet, r.rowNumber, key, 'Company Key', `"${key}" is not in the Companies sheet.`);
      return null;
    }
    return key;
  };

  // ---- Contacts ----------------------------------------------------------
  for (const r of sheets.contacts ?? []) {
    const get = cellReader(r.cells);
    const key = keyOf('contacts', r, get);
    if (!key) continue;
    const name = cleanText(get('Contact Name'));
    const c = {
      name,
      designation: cleanText(get('Designation')),
      mobile: normalizeMobile(get('Mobile')),
      email: normalizeEmail(get('Email')),
    };
    for (const e of validateContact(c)) report('contacts', r.rowNumber, key, e.field === 'name' ? 'Contact Name' : e.field === 'mobile' ? 'Mobile' : 'Email', e.message);
    const primary = parseYesNo(get('Is Primary'));
    if (primary === null) report('contacts', r.rowNumber, key, 'Is Primary', 'Please enter Yes or No.');
    const plan = planOf(key);
    if (name && plan.contacts.some((x) => nameKey(x.name) === nameKey(name))) {
      report('contacts', r.rowNumber, key, 'Contact Name', `"${name}" is already listed for this company; contact names must be unique inside a company.`);
    }
    if (name) plan.contacts.push({ row: r.rowNumber, name, designation: c.designation, mobile: c.mobile, email: c.email, is_primary: primary === true });
  }
  for (const plan of plans.values()) {
    const primaries = plan.contacts.filter((c) => c.is_primary);
    if (primaries.length > 1) report('contacts', primaries[1].row, plan.key, 'Is Primary', 'Only one contact per company can be primary.');
    if (primaries.length === 0 && plan.contacts.length > 0) plan.contacts[0].is_primary = true;
  }

  // ---- Leads -------------------------------------------------------------
  for (const r of sheets.leads ?? []) {
    const get = cellReader(r.cells);
    const key = keyOf('leads', r, get);
    if (!key) continue;
    const plan = planOf(key);
    if (plan.lead) {
      report('leads', r.rowNumber, key, 'Company Key', 'A company can have only one lead in an import.');
      continue;
    }
    const lead = readLeadFields(get, (f, m, s) => report('leads', r.rowNumber, key, f, m, s), now, r.rowNumber);
    plan.lead = lead;
  }

  // ---- Contact lookup for interactions and follow-ups ---------------------
  const contactNamed = (key: string, name: string): PlannedContact | undefined => planOf(key).contacts.find((c) => nameKey(c.name) === nameKey(name));
  const needContact = (sheet: HistorySheet, r: RawSheetRow, key: string, name: string | null): string | null => {
    if (!name) {
      report(sheet, r.rowNumber, key, 'Contact Name', 'Please fill this field.');
      return null;
    }
    if (!contactNamed(key, name)) {
      report(sheet, r.rowNumber, key, 'Contact Name', `"${name}" is not in the Contacts sheet for ${key}.`);
      return null;
    }
    return name;
  };
  const dateTime = (sheet: HistorySheet, r: RawSheetRow, key: string, dateField: string, timeField: string, d: string | null, t: string | null, required: boolean): Date | null =>
    readDateTime((f, m, s) => report(sheet, r.rowNumber, key, f, m, s), dateField, timeField, d, t, required);

  // ---- Interactions ------------------------------------------------------
  for (const r of sheets.interactions ?? []) {
    const get = cellReader(r.cells);
    const key = keyOf('interactions', r, get);
    if (!key) continue;
    const contactName = needContact('interactions', r, key, get('Contact Name'));
    const at = dateTime('interactions', r, key, 'Date', 'Time', get('Date'), get('Time'), true);
    if (at && at.getTime() > now.getTime() + FUTURE_SLACK_MS) report('interactions', r.rowNumber, key, 'Date', 'The date and time cannot be in the future.');

    const rawType = get('Type');
    const type = pick(CONVERSATION_TYPES, rawType);
    if (!rawType) report('interactions', r.rowNumber, key, 'Type', 'Please fill this field.');
    else if (!type) report('interactions', r.rowNumber, key, 'Type', `Choose one of: ${CONVERSATION_TYPES.join(', ')}.`);

    const rawStatus = get('Call Status');
    const callStatus = pick(CALL_STATUSES, rawStatus);
    if (rawStatus && !callStatus) report('interactions', r.rowNumber, key, 'Call Status', `Choose one of: ${CALL_STATUSES.join(', ')}.`);
    if (callStatus && type && type !== 'Call') report('interactions', r.rowNumber, key, 'Call Status', 'Only a call can be marked received or not received.');
    const notReceived = type === 'Call' && callStatus === 'Not received';
    const reason = cleanText(get('Not Received Reason'));
    if (notReceived && !reason) report('interactions', r.rowNumber, key, 'Not Received Reason', 'Please fill this field.');
    if (!notReceived && reason) report('interactions', r.rowNumber, key, 'Not Received Reason', 'A reason is only for a call that was not received.');

    const minutesRaw = get('Call Duration (min)', 'Call Duration');
    let seconds: number | null = null;
    if (minutesRaw) {
      const m = Number(minutesRaw.replace(/,/g, ''));
      if (type !== 'Call' || notReceived) report('interactions', r.rowNumber, key, 'Call Duration (min)', 'The call length is only for a call that was received.');
      else if (!(m > 0) || m * 60 >= 86400) report('interactions', r.rowNumber, key, 'Call Duration (min)', 'Enter how long the call lasted in minutes, for example 3.5.');
      else seconds = Math.max(1, Math.round(m * 60));
    }

    const what = cleanText(get('What Discussed'));
    if (!what && !notReceived) report('interactions', r.rowNumber, key, 'What Discussed', 'Please fill this field.');
    if (what && what.length > WHAT_DISCUSSED_MAX) report('interactions', r.rowNumber, key, 'What Discussed', `Please keep it under ${WHAT_DISCUSSED_MAX} characters.`);

    const rawOutcome = get('Outcome');
    const outcome = pick(OUTCOMES, rawOutcome);
    if (rawOutcome && !outcome) report('interactions', r.rowNumber, key, 'Outcome', `Choose one of: ${OUTCOMES.join(', ')}.`);
    if (!rawOutcome && !notReceived) report('interactions', r.rowNumber, key, 'Outcome', 'Please fill this field.');

    const rawBy = get('Done By');
    const by = findUser(rawBy);
    if (rawBy && by === null) report('interactions', r.rowNumber, key, 'Done By', `"${rawBy}" is not a Sales user.`);

    if (contactName && at && type) {
      planOf(key).interactions.push({
        row: r.rowNumber, contact_name: contactName, type, at, what_discussed: what, outcome,
        call_status: type === 'Call' ? (callStatus ?? 'Received') : null,
        not_received_reason: notReceived ? reason : null,
        call_duration_seconds: seconds, done_by_id: by ? by.emp_id : null,
      });
    }
  }

  // ---- Follow-ups --------------------------------------------------------
  for (const r of sheets['follow-ups'] ?? []) {
    const get = cellReader(r.cells);
    const key = keyOf('follow-ups', r, get);
    if (!key) continue;
    const contactName = needContact('follow-ups', r, key, get('Contact Name'));
    const fu = readFollowUpFields(get, (f, m, s) => report('follow-ups', r.rowNumber, key, f, m, s), findUser, now);
    if (contactName && fu) planOf(key).follow_ups.push({ row: r.rowNumber, contact_name: contactName, ...fu });
  }

  // ---- Notes -------------------------------------------------------------
  for (const r of sheets.notes ?? []) {
    const get = cellReader(r.cells);
    const key = keyOf('notes', r, get);
    if (!key) continue;
    const rawType = get('Note Type');
    const type = pick(NOTE_TYPES, rawType);
    if (!rawType) report('notes', r.rowNumber, key, 'Note Type', 'Please fill this field.');
    else if (!type) report('notes', r.rowNumber, key, 'Note Type', `Choose one of: ${NOTE_TYPES.join(', ')}.`);
    const note = cleanText(get('Note'));
    if (!note) report('notes', r.rowNumber, key, 'Note', 'Please fill this field.');
    else if (note.length > NOTE_MAX) report('notes', r.rowNumber, key, 'Note', `Please keep it under ${NOTE_MAX} characters.`);
    const pinned = parseYesNo(get('Is Pinned'));
    if (pinned === null) report('notes', r.rowNumber, key, 'Is Pinned', 'Please enter Yes or No.');
    const rawBy = get('Created By');
    const by = findUser(rawBy);
    if (rawBy && by === null) report('notes', r.rowNumber, key, 'Created By', `"${rawBy}" is not a Sales user.`);
    const created = get('Created On');
    let createdOn: Date | null = null;
    if (created) {
      const parts = parseDateParts(created);
      if (!parts) report('notes', r.rowNumber, key, 'Created On', 'Use the date format YYYY-MM-DD.');
      else {
        createdOn = toInstant(parts, 9 * 60);
        if (createdOn.getTime() > now.getTime() + FUTURE_SLACK_MS) report('notes', r.rowNumber, key, 'Created On', 'The date cannot be in the future.');
      }
    }
    if (type && note) planOf(key).notes.push({ row: r.rowNumber, note_type: type, note, is_pinned: pinned === true, created_by_id: by ? by.emp_id : null, created_on: createdOn });
  }

  // ---- Won ---------------------------------------------------------------
  for (const r of sheets.won ?? []) {
    const get = cellReader(r.cells);
    const key = keyOf('won', r, get);
    if (!key) continue;
    const plan = planOf(key);
    if (plan.won) {
      report('won', r.rowNumber, key, 'Company Key', 'A company can have only one Won row in an import.');
      continue;
    }
    const won = readWonFields(get, (f, m, s) => report('won', r.rowNumber, key, f, m, s), findUser, now, r.rowNumber);
    if (won) plan.won = won;
  }

  // ---- Cross-sheet rules ---------------------------------------------------
  for (const plan of plans.values()) {
    const hasWonRow = plan.won !== null;
    const lead = plan.lead;
    if (hasWonRow && !lead) report('won', plan.won!.row, plan.key, 'Company Key', 'A Won row needs a row in the Leads sheet.');
    if (lead) {
      // A blank status next to a Won row means Converted; otherwise a blank status is New (as on screen).
      if (hasWonRow && lead.stage === 'New') lead.stage = 'Converted';
      if (lead.stage === 'Converted' && !hasWonRow) report('leads', lead.row, plan.key, 'Lead Status', 'A Converted lead needs a row in the Won sheet.');
      if (hasWonRow && lead.stage !== 'Converted') report('won', plan.won!.row, plan.key, 'Company Key', `The lead status is ${lead.stage}; a company with a Won row must be Converted.`);
      // First received conversation moves a New lead to Contacted, as on screen.
      if (lead.stage === 'New' && plan.interactions.some((i) => !(i.type === 'Call' && i.call_status === 'Not received'))) {
        lead.stage = statusAfterConversation('New');
      }
      // Pending follow-ups of a lead that ends Lost or Converted are cancelled, as on screen.
      if (lead.stage === 'Lost' || lead.stage === 'Converted') {
        for (const f of plan.follow_ups) {
          if (f.status === 'Pending' || f.status === 'Overdue') {
            f.status = 'Cancelled';
            f.reason = lead.stage === 'Lost' ? 'Lead marked as Lost' : 'Lead converted to client';
            issues.push({ sheet: SHEET_TITLE['follow-ups'], row: f.row, company_key: plan.key, field: 'Status', message: `The lead is ${lead.stage}, so this follow-up is imported as Cancelled.`, severity: 'warning' });
          }
        }
      }
    } else {
      if (plan.notes.length > 0) report('notes', plan.notes[0].row, plan.key, 'Company Key', 'Notes belong to a lead; add a row for this company in the Leads sheet.');
    }
  }

  return { plans, issues, blocked };
}
