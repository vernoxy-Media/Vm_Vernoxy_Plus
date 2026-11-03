import {
  allowedActions,
  canApplyAction,
  canEditEntry,
  canWorkOnLead,
  evaluateQualification,
  reopenTarget,
  statusAfterConversation,
} from './lead-workflow.service';
import { validateContact, validateConversation, validateNote } from './activity-validator.service';

const NOW = new Date('2026-10-30T10:00:00Z');

describe('lead status actions', () => {
  it('follows the BFD status diagram', () => {
    expect(canApplyAction('qualify', 'Contacted')).toBe(true);
    expect(canApplyAction('qualify', 'New')).toBe(false); // needs a conversation first
    expect(canApplyAction('hold', 'Qualified')).toBe(true);
    expect(canApplyAction('hold', 'New')).toBe(false);
    expect(canApplyAction('lost', 'New')).toBe(true);
    expect(canApplyAction('lost', 'On Hold')).toBe(false);
    expect(canApplyAction('reopen', 'Lost')).toBe(true);
    expect(canApplyAction('reopen', 'On Hold')).toBe(true);
    expect(canApplyAction('reopen', 'Contacted')).toBe(false);
  });

  it('a Converted lead is locked: no action applies', () => {
    expect(allowedActions('Converted')).toEqual([]);
  });

  it('lists what a status can do', () => {
    expect(allowedActions('New')).toEqual(['lost']);
    expect(allowedActions('Contacted')).toEqual(['qualify', 'hold', 'lost']);
    expect(allowedActions('Lost')).toEqual(['reopen']);
  });

  it('Reopen: Lost goes back to Contacted, On Hold goes back to where it was', () => {
    expect(reopenTarget('Lost', 'Qualified')).toBe('Contacted');
    expect(reopenTarget('On Hold', 'Qualified')).toBe('Qualified');
    expect(reopenTarget('On Hold', 'Contacted')).toBe('Contacted');
    expect(reopenTarget('On Hold', null)).toBe('Contacted');
    expect(reopenTarget('On Hold', 'On Hold')).toBe('Contacted');
  });

  it('only the first conversation on a New lead moves it', () => {
    expect(statusAfterConversation('New')).toBe('Contacted');
    expect(statusAfterConversation('Qualified')).toBe('Qualified');
    expect(statusAfterConversation('On Hold')).toBe('On Hold');
  });
});

describe('qualification checklist', () => {
  const facts = (over: Partial<Parameters<typeof evaluateQualification>[0]> = {}) => ({
    service_fit_chosen: true,
    conversation_count: 1,
    note_types: new Set(['Requirement', 'Budget', 'Readiness']),
    ...over,
  });

  it('passes when everything is there', () => {
    const r = evaluateQualification(facts());
    expect(r.complete).toBe(true);
    expect(r.items.every((i) => i.done)).toBe(true);
  });

  it('shows exactly what is missing', () => {
    const r = evaluateQualification(facts({ conversation_count: 0, note_types: new Set(['Requirement', 'General']) }));
    expect(r.complete).toBe(false);
    expect(r.items.filter((i) => !i.done).map((i) => i.key)).toEqual(['conversation', 'budget', 'readiness']);
  });

  it('needs a Service Fit', () => {
    expect(evaluateQualification(facts({ service_fit_chosen: false })).items[0]).toMatchObject({ key: 'service_fit', done: false });
  });
});

describe('who can edit and who can work', () => {
  const entry = { created_by: 5, created_at: new Date('2026-10-30T08:00:00Z') };
  it('the author can edit for 24 hours, then it is locked', () => {
    expect(canEditEntry(entry, { emp_id: 5, is_admin: false }, NOW)).toBe(true);
    expect(canEditEntry(entry, { emp_id: 5, is_admin: false }, new Date('2026-10-31T08:00:01Z'))).toBe(false);
    expect(canEditEntry(entry, { emp_id: 6, is_admin: false }, NOW)).toBe(false);
  });
  it('the Admin can always edit', () => {
    expect(canEditEntry(entry, { emp_id: 1, is_admin: true }, new Date('2027-01-01T00:00:00Z'))).toBe(true);
  });
  it('only the Lead By user or the Admin works on a lead', () => {
    expect(canWorkOnLead({ lead_by_id: 5 }, { emp_id: 5, is_admin: false })).toBe(true);
    expect(canWorkOnLead({ lead_by_id: 5 }, { emp_id: 6, is_admin: false })).toBe(false);
    expect(canWorkOnLead({ lead_by_id: 5 }, { emp_id: 6, is_admin: true })).toBe(true);
  });
});

describe('conversation, note and contact validation', () => {
  const good = { type: 'Call', contact_id: 3, communication_date: new Date('2026-10-30T09:00:00Z'), what_discussed: 'Demo', outcome: 'Interested' };

  it('accepts a complete conversation', () => {
    expect(validateConversation(good, NOW, { requireOutcome: true })).toEqual([]);
  });
  it('requires type, contact, date, what was discussed and (in the popup) outcome', () => {
    const errs = validateConversation({ type: null, contact_id: null, communication_date: null, what_discussed: null, outcome: null }, NOW, { requireOutcome: true });
    expect(errs.map((e) => e.field)).toEqual(['type', 'contact_id', 'communication_date', 'what_discussed', 'outcome']);
    expect(validateConversation({ ...good, outcome: null }, NOW, { requireOutcome: false })).toEqual([]);
  });
  it('rejects the future, an unknown type and an unknown outcome', () => {
    const errs = validateConversation({ ...good, type: 'Telepathy', outcome: 'Maybe', communication_date: new Date('2026-10-31T10:00:00Z') }, NOW, { requireOutcome: true });
    expect(errs.map((e) => e.field)).toEqual(['type', 'communication_date', 'outcome']);
  });
  it('notes are General / Requirement / Budget / Readiness only (Win and Lost are system notes)', () => {
    expect(validateNote({ note_type: 'Budget', note: 'Rs 3-4 lakh' })).toEqual([]);
    expect(validateNote({ note_type: 'Win', note: 'x' })[0].field).toBe('note_type');
    expect(validateNote({ note_type: 'Lost', note: 'x' })[0].field).toBe('note_type');
    expect(validateNote({ note_type: 'General', note: null })[0].field).toBe('note');
  });
  it('a contact needs a name and a mobile or an email, both valid', () => {
    expect(validateContact({ name: 'A', designation: null, mobile: '9825041236', email: null })).toEqual([]);
    expect(validateContact({ name: 'A', designation: null, mobile: null, email: 'a@b.in' })).toEqual([]);
    expect(validateContact({ name: null, designation: null, mobile: null, email: null }).map((e) => e.field)).toEqual(['name', 'mobile']);
    expect(validateContact({ name: 'A', designation: null, mobile: '12', email: 'x' }).map((e) => e.field)).toEqual(['mobile', 'email']);
  });
});
