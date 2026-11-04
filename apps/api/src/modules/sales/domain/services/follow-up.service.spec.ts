import {
  allowedFollowUpActions,
  effectiveStatus,
  formatIst,
  isDailySummaryTime,
  messages,
  upcomingFrom,
} from './follow-up.service';
import { validateCancel, validateComplete, validateReschedule, validateSchedule } from './follow-up-validator.service';

const NOW = new Date('2026-10-30T10:00:00Z'); // 15:30 IST, Friday
const at = (iso: string) => new Date(iso);

describe('follow-up status', () => {
  it('Pending turns Overdue 15 minutes after the due time, computed on every read', () => {
    expect(effectiveStatus('Pending', at('2026-10-30T09:50:00Z'), NOW)).toBe('Pending'); // 10 minutes late: still Pending
    expect(effectiveStatus('Pending', at('2026-10-30T09:40:00Z'), NOW)).toBe('Overdue'); // 20 minutes late
    expect(effectiveStatus('Pending', at('2026-10-31T09:00:00Z'), NOW)).toBe('Pending');
  });

  it('Completed and Cancelled never change with time', () => {
    expect(effectiveStatus('Completed', at('2026-01-01T00:00:00Z'), NOW)).toBe('Completed');
    expect(effectiveStatus('Cancelled', at('2026-01-01T00:00:00Z'), NOW)).toBe('Cancelled');
    expect(effectiveStatus('Overdue', at('2026-10-31T00:00:00Z'), NOW)).toBe('Overdue');
  });

  it('Upcoming starts at the next Indian midnight', () => {
    expect(upcomingFrom(NOW).toISOString()).toBe('2026-10-30T18:30:00.000Z');
  });

  it('the daily summary is due from 9:30 IST', () => {
    expect(isDailySummaryTime(at('2026-10-30T03:59:00Z'))).toBe(false); // 09:29 IST
    expect(isDailySummaryTime(at('2026-10-30T04:00:00Z'))).toBe(true); // 09:30 IST
    expect(isDailySummaryTime(at('2026-10-30T18:00:00Z'))).toBe(true); // 23:30 IST
  });
});

describe('who can act on a follow-up', () => {
  const f = { status: 'Pending' as const, assigned_to: 5, created_by: 9, lead_by_id: 6 };
  const full = ['view', 'edit', 'complete', 'reschedule', 'cancel'];
  it('the assignee, the Lead By user and the Admin can; others can only view', () => {
    expect(allowedFollowUpActions(f, { emp_id: 5, is_admin: false })).toEqual(full);
    expect(allowedFollowUpActions(f, { emp_id: 6, is_admin: false })).toEqual(full);
    expect(allowedFollowUpActions(f, { emp_id: 1, is_admin: true })).toEqual(full);
    expect(allowedFollowUpActions(f, { emp_id: 7, is_admin: false })).toEqual(['view']);
    expect(allowedFollowUpActions(f, { emp_id: 9, is_admin: false })).toEqual(['view']); // creator of a lead follow-up has no say
  });
  it('for a company without a lead the creator can act too', () => {
    expect(allowedFollowUpActions({ ...f, lead_by_id: null }, { emp_id: 9, is_admin: false })).toEqual(full);
  });
  it('a finished follow-up can only be viewed, even by the Admin', () => {
    expect(allowedFollowUpActions({ ...f, status: 'Completed' }, { emp_id: 1, is_admin: true })).toEqual(['view']);
    expect(allowedFollowUpActions({ ...f, status: 'Cancelled' }, { emp_id: 5, is_admin: false })).toEqual(['view']);
    expect(allowedFollowUpActions({ ...f, status: 'Overdue' }, { emp_id: 5, is_admin: false })).toEqual(full);
  });
});

describe('messages (BFD section 7, Part 6)', () => {
  const facts = { company_name: 'Patel Precision Engineering', type: 'Call', at: at('2026-10-28T05:30:00Z'), contact_name: 'Kunal Shah' };
  it('formats Indian time', () => {
    expect(formatIst(at('2026-10-28T05:30:00Z'))).toBe('28 Oct, 11:00');
  });
  it('matches the examples of the document', () => {
    expect(messages.assigned('Kishan Patel', facts).body).toBe('Kishan Patel gave you a follow-up: Patel Precision Engineering, 28 Oct, 11:00, Call.');
    expect(messages.reminder(facts).body).toBe('Follow-up in 1 hour: Call Kunal Shah, Patel Precision Engineering.');
    expect(messages.reminder(facts, new Date(facts.at.getTime() - 20 * 60000)).title).toContain('in 20 minutes');
    expect(messages.reminder(facts, new Date(facts.at.getTime() + 60000)).title).toContain('due now');
    expect(messages.overdue(facts).body).toBe('Follow-up with Patel Precision Engineering is overdue since 28 Oct, 11:00.');
    expect(messages.rescheduledThrice('Gujarat Agro Exports', 3).body).toBe('The follow-up with Gujarat Agro Exports has been moved 3 times.');
    expect(messages.dailySummary(3, 1).body).toBe('You have 3 follow-ups today and 1 overdue.');
    expect(messages.dailySummary(1, 0).body).toBe('You have 1 follow-up today and 0 overdue.');
  });
});

describe('follow-up validation', () => {
  const ok = { follow_up_on: at('2026-10-31T10:00:00Z'), type: 'Call', contact_id: 3, purpose: 'Send quotation' };
  it('accepts a complete schedule, with field names namespaced by a prefix', () => {
    expect(validateSchedule(ok, NOW)).toEqual([]);
    expect(validateSchedule({ ...ok, follow_up_on: null, type: 'SMS', contact_id: null }, NOW, 'next_step.').map((e) => e.field)).toEqual([
      'next_step.follow_up_on', 'next_step.type', 'next_step.contact_id',
    ]);
  });
  it('allows today, rejects the past', () => {
    expect(validateSchedule({ ...ok, follow_up_on: at('2026-10-30T11:00:00Z') }, NOW)).toEqual([]);
    expect(validateSchedule({ ...ok, follow_up_on: at('2026-10-29T10:00:00Z') }, NOW)[0].field).toBe('follow_up_on');
  });
  it('reschedule needs a date and a reason; cancel needs a reason', () => {
    expect(validateReschedule({ follow_up_on: ok.follow_up_on, reason: 'Client travelling' }, NOW)).toEqual([]);
    expect(validateReschedule({ follow_up_on: null, reason: null }, NOW).map((e) => e.field)).toEqual(['follow_up_on', 'reason']);
    expect(validateCancel({ reason: null })[0].field).toBe('reason');
    expect(validateCancel({ reason: 'Wrong number' })).toEqual([]);
  });
  it('complete: Done on starts now, cannot be future or before the follow-up existed; outcome, what happened and the next step are required', () => {
    const created = at('2026-10-28T10:00:00Z');
    const good = { done_on: NOW, outcome: 'Interested', what_happened: 'Quote sent', next_step: 'none' };
    expect(validateComplete(good, created, NOW)).toEqual([]);
    expect(validateComplete({ ...good, done_on: at('2026-10-27T10:00:00Z') }, created, NOW)[0].field).toBe('done_on');
    expect(validateComplete({ ...good, done_on: at('2026-11-02T10:00:00Z') }, created, NOW)[0].field).toBe('done_on');
    expect(validateComplete({ done_on: NOW, outcome: null, what_happened: null, next_step: null }, created, NOW).map((e) => e.field)).toEqual(['outcome', 'what_happened', 'next_step.action']);
    expect(validateComplete({ ...good, next_step: 'dance' }, created, NOW)[0].field).toBe('next_step.action');
  });
});
