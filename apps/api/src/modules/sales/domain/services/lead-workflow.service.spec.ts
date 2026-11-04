import {
  allowedActions,
  canApplyAction,
  canEditEntry,
  canMoveTo,
  canWorkOnLead,
  evaluateQualification,
  reopenTarget,
  resolveAssignee,
  statusAfterConversation,
} from './lead-workflow.service';
import { isNotReceivedCall, validateContact, validateConversation, validateNote } from './activity-validator.service';

const NOW = new Date('2026-10-30T10:00:00Z');

describe('lead status actions', () => {
  it('lets a lead move to any stage with no condition', () => {
    expect(canApplyAction('qualify', 'Contacted')).toBe(true);
    expect(canApplyAction('qualify', 'New')).toBe(true); // no conversation needed first
    expect(canApplyAction('qualify', 'Lost')).toBe(true);
    expect(canApplyAction('hold', 'Qualified')).toBe(true);
    expect(canApplyAction('hold', 'New')).toBe(true);
    expect(canApplyAction('lost', 'New')).toBe(true);
    expect(canApplyAction('lost', 'On Hold')).toBe(true);
    expect(canApplyAction('reopen', 'Lost')).toBe(true);
    expect(canApplyAction('reopen', 'On Hold')).toBe(true);
    expect(canApplyAction('reopen', 'Contacted')).toBe(false);
  });

  it('can move between any two of the five stages, but never out of Converted or to the same stage', () => {
    const stages = ['New', 'Contacted', 'Qualified', 'On Hold', 'Lost'] as const;
    for (const from of stages) {
      for (const to of stages) expect(canMoveTo(from, to)).toBe(from !== to);
    }
    expect(canMoveTo('Converted', 'New')).toBe(false);
    // Converted is reached with Mark as Won, not by moving
    expect(canMoveTo('Qualified', 'Converted')).toBe(false);
    expect(canMoveTo('New', 'Nowhere')).toBe(false);
  });

  it('a Converted lead is locked: no action applies', () => {
    expect(allowedActions('Converted')).toEqual([]);
  });

  it('lists what a status can do', () => {
    expect(allowedActions('New')).toEqual(['qualify', 'hold', 'lost']);
    expect(allowedActions('Contacted')).toEqual(['qualify', 'hold', 'lost']);
    expect(allowedActions('On Hold')).toEqual(['qualify', 'lost', 'reopen']);
    expect(allowedActions('Lost')).toEqual(['qualify', 'hold', 'reopen']);
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

describe('logging a call (received / not received)', () => {
  const base = {
    type: 'Call',
    contact_id: 5,
    communication_date: new Date('2026-10-30T09:00:00Z'),
    what_discussed: null as string | null,
    outcome: null as string | null,
    call_status: null as string | null,
    not_received_reason: null as string | null,
  };
  const fields = (errs: { field: string }[]) => errs.map((e) => e.field);

  it('a received call needs the call time and what was discussed', () => {
    const ok = validateConversation({ ...base, call_status: 'Received', what_discussed: 'Asked for a quote', outcome: 'Interested' }, NOW, { requireOutcome: true });
    expect(ok).toEqual([]);

    const noTalk = validateConversation({ ...base, call_status: 'Received', outcome: 'Interested' }, NOW, { requireOutcome: true });
    expect(fields(noTalk)).toContain('what_discussed');

    const noTime = validateConversation({ ...base, call_status: 'Received', communication_date: null, what_discussed: 'Hi', outcome: 'Interested' }, NOW, { requireOutcome: true });
    expect(fields(noTime)).toContain('communication_date');
  });

  it('a call with no status counts as received, so older callers still work', () => {
    expect(validateConversation({ ...base, what_discussed: 'Quick call', outcome: 'Interested' }, NOW, { requireOutcome: true })).toEqual([]);
    expect(fields(validateConversation({ ...base, outcome: 'Interested' }, NOW, { requireOutcome: true }))).toContain('what_discussed');
  });

  it('a call that was not received needs a reason and nothing else', () => {
    const noReason = validateConversation({ ...base, call_status: 'Not received' }, NOW, { requireOutcome: true });
    expect(fields(noReason)).toEqual(['not_received_reason']);

    const ok = validateConversation({ ...base, call_status: 'Not received', not_received_reason: 'Busy' }, NOW, { requireOutcome: true });
    expect(ok).toEqual([]);
    expect(isNotReceivedCall({ type: 'Call', call_status: 'Not received' })).toBe(true);
  });

  it('only a call has a status, and a reason belongs only to a call that was not received', () => {
    expect(fields(validateConversation({ ...base, type: 'Email', call_status: 'Received', what_discussed: 'x', outcome: 'Interested' }, NOW, { requireOutcome: true }))).toContain('call_status');
    expect(fields(validateConversation({ ...base, call_status: 'Received', not_received_reason: 'Busy', what_discussed: 'x', outcome: 'Interested' }, NOW, { requireOutcome: true }))).toContain('not_received_reason');
    expect(fields(validateConversation({ ...base, call_status: 'Maybe', what_discussed: 'x', outcome: 'Interested' }, NOW, { requireOutcome: true }))).toContain('call_status');
  });
});

describe('who a follow-up is assigned to', () => {
  const sales = { emp_id: 5, is_admin: false };
  const admin = { emp_id: 1, is_admin: true };

  it('starts as the person adding it', () => {
    expect(resolveAssignee(undefined, sales)).toBe(5);
    expect(resolveAssignee(null, admin)).toBe(1);
  });

  it('only the Admin can give it to someone else', () => {
    expect(resolveAssignee(9, admin)).toBe(9);
    expect(resolveAssignee(9, sales)).toBe(5); // a Sales User cannot hand it to anyone, whatever is sent
  });
});
