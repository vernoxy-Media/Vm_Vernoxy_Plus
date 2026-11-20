import { FollowUpUseCases } from './follow-up.use-cases';
import {
  ConflictSalesError,
  FieldValidationError,
  ForbiddenSalesError,
  NotFoundSalesError,
} from '../../domain/errors/sales.errors';

const NOW = new Date('2026-11-16T06:00:00.000Z');
const IN_2_DAYS = new Date('2026-11-18T06:00:00.000Z');
const admin = { emp_id: 1, is_admin: true, is_sales: false };
const owner = { emp_id: 7, is_admin: false, is_sales: true };
const stranger = { emp_id: 8, is_admin: false, is_sales: true };

function record(over: Record<string, unknown> = {}) {
  return {
    follow_up_id: 100,
    status: 'Pending',
    company: { company_id: 3, company_code: 'COM-0003', name: 'Acme', city: 'Surat' },
    lead: { lead_id: 10, lead_code: 'LEAD-0010', stage: 'Contacted', lead_by_id: 7 },
    contact: { person_id: 4, name: 'Rakesh' },
    follow_up_on: IN_2_DAYS,
    type: 'Meeting',
    purpose: 'Demo',
    assigned_to: { emp_id: 7, name: 'Meera' },
    created_by: 7,
    created_at: new Date('2026-11-10T06:00:00.000Z'),
    rescheduled_count: 0,
    done_on: null,
    outcome: null,
    what_happened: null,
    reason: null,
    completed_communication_id: null,
    calendar_event_id: null,
    ...over,
  };
}

function leadCtx(over: Record<string, unknown> = {}) {
  return { lead_id: 10, company_id: 3, lead_code: 'LEAD-0010', stage: 'Contacted', lead_by_id: 7, person_id: 4, ...over };
}

function setup(rec = record()) {
  const repo = {
    list: jest.fn().mockResolvedValue({ items: [rec], total: 1, page: 1, limit: 10, total_pages: 1, counts: {} }),
    listForLead: jest.fn().mockResolvedValue([rec]),
    get: jest.fn().mockResolvedValue(rec),
    create: jest.fn().mockResolvedValue({ follow_up_id: 101 }),
    updateDetails: jest.fn().mockResolvedValue(undefined),
    reschedule: jest.fn().mockResolvedValue({ count: 1 }),
    cancel: jest.fn().mockResolvedValue(undefined),
    complete: jest.fn().mockResolvedValue(undefined),
    setCalendarEvent: jest.fn().mockResolvedValue(undefined),
    employeeName: jest.fn().mockResolvedValue('Meera'),
    listAdminIds: jest.fn().mockResolvedValue([1, 2]),
  };
  const work = {
    getLeadForWork: jest.fn().mockResolvedValue(leadCtx()),
    getCompanyForLog: jest.fn().mockResolvedValue({ company_id: 3, open_lead: null }),
    getPrimaryContactPersonId: jest.fn().mockResolvedValue(4),
    isActiveContactOfCompany: jest.fn().mockResolvedValue(true),
    isEligibleAssignee: jest.fn().mockResolvedValue(true),
  };
  const activity = { logForFollowUp: jest.fn().mockResolvedValue({ communication_id: 900 }) };
  const status = {
    qualify: jest.fn().mockResolvedValue({ stage: 'Qualified' }),
    putOnHold: jest.fn().mockResolvedValue({ stage: 'On Hold' }),
    markLost: jest.fn().mockResolvedValue({ stage: 'Lost' }),
  };
  const uow = { run: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn({ tx: true })) };
  const notifier = { send: jest.fn().mockResolvedValue(undefined) };
  const calendar = { create: jest.fn().mockResolvedValue(555), update: jest.fn().mockResolvedValue(undefined), remove: jest.fn().mockResolvedValue(undefined) };
  const uc = new FollowUpUseCases(repo as never, work as never, activity as never, status as never, uow as never, notifier as never, calendar as never);
  return { uc, repo, work, activity, status, uow, notifier, calendar };
}

describe('FollowUpUseCases.list', () => {
  it('shows a Sales user only their own follow-ups, and the Admin everything', async () => {
    const a = setup();
    await a.uc.list({}, owner, NOW);
    expect(a.repo.list.mock.calls[0][0].scope_emp_id).toBe(7);
    const b = setup();
    await b.uc.list({}, admin, NOW);
    expect(b.repo.list.mock.calls[0][0].scope_emp_id).toBeUndefined();
  });

  it('opens on the Today tab and turns "me" into the signed-in person', async () => {
    const { uc, repo } = setup();
    const out = await uc.list({ assigned_to: 'me', lead_by: 12 }, owner, NOW);
    expect(out.tab).toBe('today');
    const p = repo.list.mock.calls[0][0];
    expect([p.assigned_to, p.lead_by_id]).toEqual([7, 12]);
  });

  it('passes the filters the drawer sends straight through', async () => {
    const { uc, repo } = setup();
    await uc.list({ type: ['Call'], city: ['Surat'], industry_ids: [2, 9], q: 'acme' }, admin, NOW);
    expect(repo.list.mock.calls[0][0]).toMatchObject({ type: ['Call'], city: ['Surat'], industry_ids: [2, 9], q: 'acme' });
  });

  it('keeps the page and the page size within bounds', async () => {
    const { uc, repo } = setup();
    await uc.list({ page: -5, limit: 100000 }, admin, NOW);
    expect(repo.list.mock.calls[0][0]).toMatchObject({ page: 1, limit: 100 });
    await uc.list({ limit: 0 }, admin, NOW);
    expect(repo.list.mock.calls[1][0].limit).toBe(1);
  });

  it('gives each row the buttons the viewer may press', async () => {
    const mine = await setup().uc.list({}, owner, NOW);
    expect(mine.items[0].actions).toEqual(['view', 'edit', 'complete', 'reschedule', 'cancel']);
    const theirs = await setup().uc.list({}, stranger, NOW);
    expect(theirs.items[0].actions).toEqual(['view']);
  });

  it('shows a Pending follow-up as Overdue once it is past its time', async () => {
    const late = record({ follow_up_on: new Date('2026-11-16T05:00:00.000Z') });
    const out = await setup(late).uc.list({}, owner, NOW);
    expect(out.items[0].status).toBe('Overdue');
  });

  it('locks every button for a lead that is already a client', async () => {
    const locked = record({ lead: { lead_id: 10, lead_code: 'LEAD-0010', stage: 'Converted', lead_by_id: 7 } });
    const out = await setup(locked).uc.list({}, admin, NOW);
    expect(out.items[0].actions).toEqual(['view']);
  });
});

describe('FollowUpUseCases.schedule', () => {
  const input = { lead_id: 10, follow_up_on: IN_2_DAYS, type: 'Call', purpose: 'Send quote' };

  it('plans a follow-up on a lead, assigned to the person scheduling it', async () => {
    const { uc, repo, calendar } = setup();
    await uc.schedule(input, owner, NOW);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ company_id: 3, lead_id: 10, contact_id: 4, assigned_to: 7, type: 'Call', actor_emp_id: 7 }));
    expect(calendar.create).toHaveBeenCalledTimes(1);
  });

  it('lets only the Admin give it to someone else, and tells that person', async () => {
    const a = setup();
    await a.uc.schedule({ ...input, assigned_to: 9 }, owner, NOW);
    expect(a.repo.create.mock.calls[0][0].assigned_to).toBe(7); // a Sales user cannot hand it over

    const b = setup(record({ assigned_to: { emp_id: 9, name: 'Kunal' } }));
    await b.uc.schedule({ ...input, assigned_to: 9 }, admin, NOW);
    expect(b.repo.create.mock.calls[0][0].assigned_to).toBe(9);
    expect(b.notifier.send).toHaveBeenCalledTimes(1);
  });

  it('does not message the person who gave themselves the follow-up', async () => {
    const { uc, notifier } = setup();
    await uc.schedule(input, owner, NOW);
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it('lists every problem at once and saves nothing', async () => {
    const { uc, repo } = setup();
    const err = await uc.schedule({ lead_id: 10, follow_up_on: new Date('2026-11-01T00:00:00.000Z'), type: 'Pigeon' }, owner, NOW).catch((e) => e);
    expect(err).toBeInstanceOf(FieldValidationError);
    expect(err.errors.map((e: { field: string }) => e.field)).toEqual(['follow_up_on', 'type']);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('refuses a contact who does not work at the company', async () => {
    const { uc, work } = setup();
    work.isActiveContactOfCompany.mockResolvedValue(false);
    const err = await uc.schedule({ ...input, contact_id: 99 }, owner, NOW).catch((e) => e);
    expect(err.errors[0].field).toBe('contact_id');
  });

  it('refuses an assignee who is not an active Sales user or Admin', async () => {
    const { uc, work } = setup();
    work.isEligibleAssignee.mockResolvedValue(false);
    const err = await uc.schedule({ ...input, assigned_to: 9 }, admin, NOW).catch((e) => e);
    expect(err.errors.map((e: { field: string }) => e.field)).toContain('assigned_to');
  });

  it('needs a lead or a company', async () => {
    const err = await setup().uc.schedule({ follow_up_on: IN_2_DAYS, type: 'Call' }, owner, NOW).catch((e) => e);
    expect(err).toBeInstanceOf(FieldValidationError);
  });

  it('plans a follow-up for a company that is not a lead yet, using its primary contact', async () => {
    const { uc, repo } = setup();
    await uc.schedule({ company_id: 3, follow_up_on: IN_2_DAYS, type: 'Call' }, owner, NOW);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ company_id: 3, lead_id: null, contact_id: 4 }));
  });

  it('puts a company follow-up on its open lead', async () => {
    const { uc, repo, work } = setup();
    work.getCompanyForLog.mockResolvedValue({ company_id: 3, open_lead: leadCtx() });
    await uc.schedule({ company_id: 3, follow_up_on: IN_2_DAYS, type: 'Call' }, owner, NOW);
    expect(repo.create.mock.calls[0][0].lead_id).toBe(10);
  });

  it('is refused for a lead you do not own, a lost lead and a converted lead', async () => {
    await expect(setup().uc.schedule(input, stranger, NOW)).rejects.toBeInstanceOf(ForbiddenSalesError);
    const lost = setup();
    lost.work.getLeadForWork.mockResolvedValue(leadCtx({ stage: 'Lost' }));
    await expect(lost.uc.schedule(input, owner, NOW)).rejects.toMatchObject({ code: 'LEAD_CLOSED' });
    const won = setup();
    won.work.getLeadForWork.mockResolvedValue(leadCtx({ stage: 'Converted' }));
    await expect(won.uc.schedule(input, owner, NOW)).rejects.toMatchObject({ code: 'LEAD_LOCKED' });
  });

  it('says so when the lead or the company does not exist', async () => {
    const a = setup();
    a.work.getLeadForWork.mockResolvedValue(null);
    await expect(a.uc.schedule(input, owner, NOW)).rejects.toBeInstanceOf(NotFoundSalesError);
    const b = setup();
    b.work.getCompanyForLog.mockResolvedValue(null);
    await expect(b.uc.schedule({ company_id: 3, follow_up_on: IN_2_DAYS, type: 'Call' }, owner, NOW)).rejects.toBeInstanceOf(NotFoundSalesError);
  });

  it('still saves when the Calendar is down', async () => {
    const { uc, calendar } = setup();
    calendar.create.mockRejectedValue(new Error('calendar down'));
    await expect(uc.schedule(input, owner, NOW)).resolves.toBeDefined();
  });
});

describe('FollowUpUseCases.reschedule', () => {
  const to = new Date('2026-11-20T06:00:00.000Z');

  it('moves the date with a reason and updates the Calendar', async () => {
    const { uc, repo, calendar } = setup(record({ calendar_event_id: 77 }));
    await uc.reschedule(100, { follow_up_on: to, reason: 'Client travelling' }, owner, NOW);
    expect(repo.reschedule).toHaveBeenCalledWith(100, { follow_up_on: to, reason: 'Client travelling' }, 7);
    expect(calendar.update).toHaveBeenCalledTimes(1);
  });

  it('needs a future date and a reason', async () => {
    const { uc, repo } = setup();
    const err = await uc.reschedule(100, { follow_up_on: new Date('2026-11-01T00:00:00.000Z'), reason: ' ' }, owner, NOW).catch((e) => e);
    expect(err.errors.map((e: { field: string }) => e.field)).toEqual(['follow_up_on', 'reason']);
    expect(repo.reschedule).not.toHaveBeenCalled();
  });

  it('tells the Admins when it has been rescheduled for the third time', async () => {
    const third = setup();
    third.repo.reschedule.mockResolvedValue({ count: 3 });
    await third.uc.reschedule(100, { follow_up_on: to, reason: 'Again' }, owner, NOW);
    expect((third.notifier.send.mock.calls[0][0] as unknown[]).length).toBe(2);

    const second = setup();
    second.repo.reschedule.mockResolvedValue({ count: 2 });
    await second.uc.reschedule(100, { follow_up_on: to, reason: 'Again' }, owner, NOW);
    expect(second.notifier.send).not.toHaveBeenCalled();
  });

  it('is refused for someone it is not theirs, and for a follow-up that is already closed', async () => {
    await expect(setup().uc.reschedule(100, { follow_up_on: to, reason: 'x' }, stranger, NOW)).rejects.toBeInstanceOf(ForbiddenSalesError);
    const done = setup(record({ status: 'Completed' }));
    await expect(done.uc.reschedule(100, { follow_up_on: to, reason: 'x' }, owner, NOW)).rejects.toBeInstanceOf(ConflictSalesError);
  });

  it('says so when the follow-up does not exist', async () => {
    const { uc, repo } = setup();
    repo.get.mockResolvedValue(null);
    await expect(uc.reschedule(100, { follow_up_on: to, reason: 'x' }, owner, NOW)).rejects.toBeInstanceOf(NotFoundSalesError);
  });
});

describe('FollowUpUseCases.cancel', () => {
  it('cancels with a reason and takes it off the Calendar', async () => {
    const { uc, repo, calendar } = setup(record({ calendar_event_id: 77 }));
    await uc.cancel(100, { reason: 'Deal closed elsewhere' }, owner, NOW);
    expect(repo.cancel).toHaveBeenCalledWith(100, 'Deal closed elsewhere', 7);
    expect(calendar.remove).toHaveBeenCalledWith(77, 7);
    expect(repo.setCalendarEvent).toHaveBeenCalledWith(100, null);
  });

  it('needs a reason', async () => {
    const { uc, repo } = setup();
    await expect(uc.cancel(100, { reason: '' }, owner, NOW)).rejects.toBeInstanceOf(FieldValidationError);
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  it('is refused for a stranger', async () => {
    await expect(setup().uc.cancel(100, { reason: 'x' }, stranger, NOW)).rejects.toBeInstanceOf(ForbiddenSalesError);
  });
});

describe('FollowUpUseCases.edit', () => {
  it('changes the purpose', async () => {
    const { uc, repo } = setup();
    await uc.edit(100, { purpose: ' Bring samples ' }, owner, NOW);
    expect(repo.updateDetails).toHaveBeenCalledWith(100, { purpose: 'Bring samples' }, 7);
  });

  it('refuses a purpose that is too long and a contact from another company', async () => {
    const { uc, work } = setup();
    await expect(uc.edit(100, { purpose: 'x'.repeat(501) }, owner, NOW)).rejects.toBeInstanceOf(FieldValidationError);
    work.isActiveContactOfCompany.mockResolvedValue(false);
    await expect(uc.edit(100, { contact_id: 99 }, owner, NOW)).rejects.toBeInstanceOf(FieldValidationError);
  });

  it('hands the follow-up to someone else: moves the Calendar event and tells them', async () => {
    const reassigned = record({ assigned_to: { emp_id: 9, name: 'Kunal' }, calendar_event_id: 77 });
    const { uc, repo, calendar, notifier } = setup();
    repo.get.mockResolvedValueOnce(record()).mockResolvedValue(reassigned);
    await uc.edit(100, { assigned_to: 9 }, admin, NOW);
    expect(repo.updateDetails).toHaveBeenCalledWith(100, { assigned_to: 9 }, 1);
    expect(calendar.remove).toHaveBeenCalledWith(77, 1);
    expect(calendar.create).toHaveBeenCalled();
    expect(notifier.send).toHaveBeenCalledTimes(1);
  });
});

describe('FollowUpUseCases.complete', () => {
  const done = { outcome: 'Interested', what_happened: 'Liked the demo', call_duration_seconds: 208, next_step: { action: 'none' as const } };
  const call = () => record({ type: 'Call' });

  it('saves the conversation and completes the follow-up in one transaction', async () => {
    const { uc, uow, activity, repo } = setup(call());
    const out = await uc.complete(100, { ...done, done_on: NOW }, owner, NOW);
    expect(uow.run).toHaveBeenCalledTimes(1);
    expect(activity.logForFollowUp).toHaveBeenCalledWith(expect.objectContaining({ lead_id: 10, contact_id: 4, type: 'Call', call_duration_seconds: 208 }), owner, NOW, { tx: true });
    expect(repo.complete).toHaveBeenCalledWith(100, expect.objectContaining({ communication_id: 900, outcome: 'Interested' }), 7, { tx: true });
    expect(out.conversation.communication_id).toBe(900);
  });

  it('needs the outcome, what happened and a next step', async () => {
    const { uc, repo } = setup(call());
    const err = await uc.complete(100, { call_duration_seconds: 60 }, owner, NOW).catch((e) => e);
    expect(err.errors.map((e: { field: string }) => e.field)).toEqual(['outcome', 'what_happened', 'next_step.action']);
    expect(repo.complete).not.toHaveBeenCalled();
  });

  it('needs the call length for a call, and refuses it for any other channel', async () => {
    const a = await setup(call()).uc.complete(100, { ...done, call_duration_seconds: null }, owner, NOW).catch((e) => e);
    expect(a.errors.map((e: { field: string }) => e.field)).toContain('call_duration_seconds');
    const b = await setup().uc.complete(100, done, owner, NOW).catch((e) => e);
    expect(b.errors.map((e: { field: string }) => e.field)).toContain('call_duration_seconds');
    const c = await setup(call()).uc.complete(100, { ...done, call_duration_seconds: 86400 }, owner, NOW).catch((e) => e);
    expect(c.errors.map((e: { field: string }) => e.field)).toContain('call_duration_seconds');
  });

  it('schedules the next follow-up as part of completing this one', async () => {
    const { uc, repo, activity } = setup(call());
    repo.get.mockResolvedValueOnce(call()).mockResolvedValueOnce(call()).mockResolvedValue(record({ follow_up_id: 101 }));
    const out = await uc.complete(100, { ...done, next_step: { action: 'schedule', follow_up_on: IN_2_DAYS, type: 'Email' } }, owner, NOW);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ lead_id: 10, type: 'Email', assigned_to: 7 }), { tx: true });
    expect(out.next_step.follow_up).not.toBeNull();
    expect(activity.logForFollowUp).toHaveBeenCalledTimes(1);
  });

  it('refuses a next follow-up in the past', async () => {
    const err = await setup(call()).uc.complete(100, { ...done, next_step: { action: 'schedule', follow_up_on: new Date('2026-11-01T00:00:00.000Z') } }, owner, NOW).catch((e) => e);
    expect(err.errors.map((e: { field: string }) => e.field)).toContain('next_step.follow_up_on');
  });

  it('runs the lead step the user picked: qualify, hold or lost', async () => {
    const q = setup(call());
    await q.uc.complete(100, { ...done, next_step: { action: 'qualify', service_fit: ['CRM'] } }, owner, NOW);
    expect(q.status.qualify).toHaveBeenCalledWith(10, { service_fit: ['CRM'] }, owner, { tx: true });

    const h = setup(call());
    await h.uc.complete(100, { ...done, next_step: { action: 'hold', follow_up_on: IN_2_DAYS, reason: 'Budget freeze' } }, owner, NOW);
    expect(h.status.putOnHold).toHaveBeenCalledTimes(1);

    const l = setup(call());
    await l.uc.complete(100, { ...done, outcome: 'Not interested', next_step: { action: 'lost', lost_reason: 'no_budget', note: 'Closed' } }, owner, NOW);
    expect(l.status.markLost).toHaveBeenCalledWith(10, { reason: 'no_budget', note: 'Closed' }, owner, { tx: true });
  });

  it('allows lead steps only on a follow-up that belongs to a lead', async () => {
    const { uc } = setup(record({ type: 'Call', lead: null }));
    const err = await uc.complete(100, { ...done, next_step: { action: 'qualify' } }, owner, NOW).catch((e) => e);
    expect(err.errors.map((e: { field: string }) => e.field)).toContain('next_step.action');
  });

  it('falls back to the primary contact, and asks to add one when there is none', async () => {
    const a = setup(record({ type: 'Call', contact: null }));
    await a.uc.complete(100, done, owner, NOW);
    expect(a.activity.logForFollowUp.mock.calls[0][0].contact_id).toBe(4);

    const b = setup(record({ type: 'Call', contact: null }));
    b.work.getPrimaryContactPersonId.mockResolvedValue(null);
    const err = await b.uc.complete(100, done, owner, NOW).catch((e) => e);
    expect(err.errors.map((e: { field: string }) => e.field)).toContain('contact_id');
  });

  it('is refused for a stranger and for one already completed', async () => {
    await expect(setup(call()).uc.complete(100, done, stranger, NOW)).rejects.toBeInstanceOf(ForbiddenSalesError);
    await expect(setup(record({ type: 'Call', status: 'Completed' })).uc.complete(100, done, owner, NOW)).rejects.toBeInstanceOf(ConflictSalesError);
  });

  it('removes the Calendar event once it is completed', async () => {
    const { uc, calendar } = setup(record({ type: 'Call', calendar_event_id: 77 }));
    await uc.complete(100, done, owner, NOW);
    expect(calendar.remove).toHaveBeenCalledWith(77, 7);
  });
});

describe('FollowUpUseCases.get and forLead', () => {
  it('returns one follow-up with the outcomes that suggest marking the lead lost', async () => {
    const out = await setup().uc.get(100, owner, NOW);
    expect(out.suggest_lost_on_outcomes).toContain('Not interested');
  });

  it('lists the follow-ups of a lead, or says the lead is not found', async () => {
    const { uc, work } = setup();
    expect(await uc.forLead(10, owner, NOW)).toHaveLength(1);
    work.getLeadForWork.mockResolvedValue(null);
    await expect(uc.forLead(10, owner, NOW)).rejects.toBeInstanceOf(NotFoundSalesError);
  });
});
