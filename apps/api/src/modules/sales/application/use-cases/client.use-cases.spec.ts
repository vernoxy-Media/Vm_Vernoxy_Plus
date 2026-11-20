import { ClientUseCases } from './client.use-cases';
import {
  ConflictSalesError,
  FieldValidationError,
  ForbiddenSalesError,
  InvalidTransitionError,
  NotFoundSalesError,
} from '../../domain/errors/sales.errors';

const NOW = new Date('2026-11-16T06:00:00.000Z');
const admin = { emp_id: 1, is_admin: true, is_sales: false };
const owner = { emp_id: 7, is_admin: false, is_sales: true };
const stranger = { emp_id: 8, is_admin: false, is_sales: true };

/** What the repository returns for a lead that is being converted. */
function ctx(over: { stage?: string; created_at?: Date; client_code?: string | null; existing?: boolean } = {}) {
  return {
    lead: {
      lead_id: 10,
      lead_code: 'LEAD-0010',
      stage: over.stage ?? 'Qualified',
      service_fit: 'Mobile App, CRM',
      lead_by: { emp_id: 7, name: 'Meera' },
      created_at: over.created_at ?? new Date('2026-11-01T06:00:00.000Z'),
      converted_client: over.client_code ? { client_code: over.client_code } : null,
    },
    company: { company_id: 3, name: 'Acme' },
    existing_client: over.existing ? { client_code: 'CLI-0002' } : null,
    counts: { contacts: 2, communications: 1, notes: 3, primary_contact: { name: 'Rakesh' } },
  };
}

function setup(over: { stage?: string; leadById?: number; context?: ReturnType<typeof ctx> | null } = {}) {
  const repo = {
    getConversionContext: jest.fn().mockResolvedValue(over.context === undefined ? ctx() : over.context),
    getNextClientCode: jest.fn().mockResolvedValue('CLI-0009'),
    convert: jest.fn().mockResolvedValue({ client_id: 55, client_code: 'CLI-0009', reused_existing_client: false }),
    getClient: jest.fn().mockResolvedValue({ client_id: 55, client_code: 'CLI-0009' }),
    listClients: jest.fn().mockResolvedValue({ items: [] }),
    listCompanyProjects: jest.fn().mockResolvedValue([]),
    getClientOfLead: jest.fn().mockResolvedValue({ client_id: 55, client_code: 'CLI-0009' }),
    clientHasProject: jest.fn().mockResolvedValue(false),
    reverse: jest.fn().mockResolvedValue({ reversed: true }),
    listAdminIds: jest.fn().mockResolvedValue([1, 2]),
  };
  const work = {
    getLeadForWork: jest.fn().mockResolvedValue({ lead_id: 10, lead_code: 'LEAD-0010', company_name: 'Acme', stage: over.stage ?? 'Qualified', lead_by_id: over.leadById ?? 7 }),
  };
  const leads = { getDetail: jest.fn().mockResolvedValue({ lead_id: 10 }) };
  const followUps = {
    listForLead: jest.fn().mockResolvedValue([
      { follow_up_id: 1, status: 'Cancelled', calendar_event_id: 90 },
      { follow_up_id: 2, status: 'Pending', calendar_event_id: 91 },
    ]),
    setCalendarEvent: jest.fn().mockResolvedValue(undefined),
  };
  const calendar = { remove: jest.fn().mockResolvedValue(undefined) };
  const notifier = { send: jest.fn().mockResolvedValue(undefined) };
  const uc = new ClientUseCases(repo as never, work as never, leads as never, followUps as never, calendar as never, notifier as never);
  return { uc, repo, work, leads, followUps, calendar, notifier };
}

describe('ClientUseCases.form', () => {
  it('opens for the Lead By user on a Qualified lead, with today as the default Won on date', async () => {
    const { uc } = setup();
    const form = await uc.form(10, owner, NOW);
    expect(form.can_convert).toBe(true);
    expect(form.blocked_reason).toBeNull();
    expect(form.won_on).toEqual({ default: '2026-11-16', min: '2026-11-01', max: '2026-11-16' });
    expect(form.client_id_preview).toBe('CLI-0009');
    expect(form.lead.service_fit).toEqual(['Mobile App', 'CRM']);
  });

  it('counts what will be carried forward', async () => {
    const form = await setup().uc.form(10, owner, NOW);
    expect(form.carried_forward[1].summary).toContain('2 contacts');
    expect(form.carried_forward[1].summary).toContain('Rakesh is the primary contact');
    expect(form.carried_forward[3].summary).toContain('3 notes');
  });

  it('keeps the Client ID a company already has', async () => {
    const { uc, repo } = setup({ context: ctx({ existing: true }) });
    const form = await uc.form(10, owner, NOW);
    expect(form.client_id_preview).toBe('CLI-0002');
    expect(form.client_exists).toBe(true);
    expect(repo.getNextClientCode).not.toHaveBeenCalled();
  });

  it('is blocked for someone who is not the Lead By user', async () => {
    const form = await setup().uc.form(10, stranger, NOW);
    expect(form.can_convert).toBe(false);
    expect(form.blocked_reason).toContain('Lead By user or the Admin');
  });

  it('is blocked for a Lost lead and for one already converted', async () => {
    expect((await setup({ context: ctx({ stage: 'Lost' }) }).uc.form(10, admin, NOW)).blocked_reason).toContain('Lost');
    const done = await setup({ context: ctx({ stage: 'Converted', client_code: 'CLI-0004' }) }).uc.form(10, admin, NOW);
    expect(done.can_convert).toBe(false);
    expect(done.blocked_reason).toContain('CLI-0004');
  });

  it('says so when the lead does not exist', async () => {
    await expect(setup({ context: null }).uc.form(10, admin, NOW)).rejects.toBeInstanceOf(NotFoundSalesError);
  });
});

describe('ClientUseCases.convert', () => {
  const good = { won_on: '2026-11-10', win_note: 'PO received for the HRMS project' };

  it('converts, tells the Admins and the Lead By user, and clears cancelled follow-ups off the Calendar', async () => {
    const { uc, repo, notifier, calendar, followUps } = setup();
    const out = await uc.convert(10, good, owner, NOW);
    expect(repo.convert).toHaveBeenCalledWith({ lead_id: 10, won_on: new Date('2026-11-10T00:00:00.000Z'), win_note: good.win_note, project_revenue: null, actor_emp_id: 7 });
    expect(out.client).toEqual({ client_id: 55, client_code: 'CLI-0009' });

    const sent = notifier.send.mock.calls[0][0] as Array<{ recipient_emp_id: number }>;
    expect(sent.map((n) => n.recipient_emp_id).sort()).toEqual([1, 2]); // the doer (7) is not told
    expect(calendar.remove).toHaveBeenCalledTimes(1);
    expect(calendar.remove).toHaveBeenCalledWith(90, 7);
    expect(followUps.setCalendarEvent).toHaveBeenCalledWith(1, null);
  });

  it('lets the Admin convert a lead that belongs to someone else', async () => {
    await expect(setup().uc.convert(10, good, admin, NOW)).resolves.toBeDefined();
  });

  it('refuses anyone who is not the Lead By user or the Admin', async () => {
    const { uc, repo } = setup();
    await expect(uc.convert(10, good, stranger, NOW)).rejects.toBeInstanceOf(ForbiddenSalesError);
    expect(repo.convert).not.toHaveBeenCalled();
  });

  it('refuses a lead that is already converted, and names the client', async () => {
    const { uc, repo } = setup({ stage: 'Converted', context: ctx({ stage: 'Converted', client_code: 'CLI-0004' }) });
    const err = await uc.convert(10, good, owner, NOW).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictSalesError);
    expect(err.message).toContain('CLI-0004');
    expect(repo.convert).not.toHaveBeenCalled();
  });

  it('refuses a Lost lead', async () => {
    const { uc } = setup({ stage: 'Lost' });
    await expect(uc.convert(10, good, owner, NOW)).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it('lists every problem with the Won on date and the note, and saves nothing', async () => {
    const { uc, repo } = setup();
    const err = await uc.convert(10, { won_on: '2026-12-31', win_note: '' }, owner, NOW).catch((e) => e);
    expect(err).toBeInstanceOf(FieldValidationError);
    expect(err.errors.map((e: { field: string }) => e.field)).toEqual(['won_on', 'win_note']);
    expect(repo.convert).not.toHaveBeenCalled();
  });

  it('refuses a Won on date before the lead was added', async () => {
    const err = await setup().uc.convert(10, { won_on: '2026-10-01', win_note: 'ok' }, owner, NOW).catch((e) => e);
    expect(err.errors[0].message).toContain('before the lead was added');
  });

  it('still converts when the notification or the Calendar clean-up fails', async () => {
    const { uc, notifier, calendar } = setup();
    notifier.send.mockRejectedValue(new Error('mail down'));
    calendar.remove.mockRejectedValue(new Error('calendar down'));
    await expect(uc.convert(10, good, owner, NOW)).resolves.toBeDefined();
  });
});

describe('ClientUseCases.reverse', () => {
  it('is for the Admin only', async () => {
    const { uc, repo } = setup({ stage: 'Converted' });
    await expect(uc.reverse(10, { reason: 'Wrong company' }, owner)).rejects.toBeInstanceOf(ForbiddenSalesError);
    expect(repo.reverse).not.toHaveBeenCalled();
  });

  it('works only on a Converted lead', async () => {
    await expect(setup({ stage: 'Qualified' }).uc.reverse(10, { reason: 'x' }, admin)).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it('needs a reason, and not an endless one', async () => {
    const { uc } = setup({ stage: 'Converted' });
    await expect(uc.reverse(10, { reason: '  ' }, admin)).rejects.toBeInstanceOf(FieldValidationError);
    await expect(uc.reverse(10, { reason: 'x'.repeat(501) }, admin)).rejects.toBeInstanceOf(FieldValidationError);
  });

  it('is not possible once the client has a project', async () => {
    const { uc, repo } = setup({ stage: 'Converted' });
    repo.clientHasProject.mockResolvedValue(true);
    const err = await uc.reverse(10, { reason: 'Wrong company' }, admin).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictSalesError);
    expect(err.code).toBe('CLIENT_HAS_PROJECT');
    expect(repo.reverse).not.toHaveBeenCalled();
  });

  it('reverses with the reason and returns the lead', async () => {
    const { uc, repo } = setup({ stage: 'Converted' });
    const out = await uc.reverse(10, { reason: ' Wrong company ' }, admin);
    expect(repo.reverse).toHaveBeenCalledWith({ lead_id: 10, reason: 'Wrong company', actor_emp_id: 1 });
    expect(out.lead).toEqual({ lead_id: 10 });
  });
});

describe('ClientUseCases.get', () => {
  it('returns the client, or says it is not found', async () => {
    const { uc, repo } = setup();
    await expect(uc.get(55)).resolves.toEqual({ client_id: 55, client_code: 'CLI-0009' });
    repo.getClient.mockResolvedValue(null);
    await expect(uc.get(99)).rejects.toBeInstanceOf(NotFoundSalesError);
  });
});
