import { ConvertCompanyToLeadUseCase } from './convert-company-to-lead.use-case';
import { GetLeadFormUseCase } from './get-lead-form.use-case';
import { GetLeadBoardUseCase, ListLeadsUseCase, resolveLeadBy } from './list-leads.use-case';
import {
  ConvertContext,
  LeadDetail,
  LeadMasters,
  SalesLeadRepositoryPort,
} from '../ports/sales-lead.repository.port';
import { SalesNotifierPort } from '../ports/sales-notifier.port';
import { SalesActor } from '../ports/sales-access-policy.port';
import { FieldValidationError, OpenLeadExistsError } from '../../domain/errors/sales.errors';

const sales: SalesActor = { emp_id: 5, is_admin: false, is_sales: true };
const admin: SalesActor = { emp_id: 1, is_admin: true, is_sales: false };

const masters: LeadMasters = {
  statuses: ['New', 'Contacted', 'Qualified', 'On Hold', 'Converted', 'Lost'],
  lead_sources: ['Cold Call', 'Referral', 'Existing Client'],
  default_lead_source: 'Cold Call',
  existing_client_lead_source: 'Existing Client',
  service_fits: ['Website Development', 'CRM / ERP Software'],
  lost_reasons: [],
  lead_by_users: [
    { emp_id: 5, name: 'Kishan', is_admin: false },
    { emp_id: 6, name: 'Dhruv', is_admin: false },
  ],
};

const ctx = (over: Partial<ConvertContext> = {}): ConvertContext => ({
  company: { company_id: 10, company_code: 'COM-0010', name: 'Acme', is_client: false },
  primary_contact: { person_id: 3, name: 'Rakesh', designation: 'MD', mobile: '9825041236' },
  communication_count: 3,
  open_lead: null,
  ...over,
});

const detail = { lead_id: 77, lead_code: 'LEAD-0077', status: 'New' } as unknown as LeadDetail;

function fakeRepo(over: Partial<SalesLeadRepositoryPort> = {}): jest.Mocked<SalesLeadRepositoryPort> {
  return {
    getConvertContext: jest.fn().mockResolvedValue(ctx()),
    getMasters: jest.fn().mockResolvedValue(masters),
    resolveLeadSource: jest.fn().mockImplementation(async (l: string) => masters.lead_sources.find((s) => s.toLowerCase() === l.toLowerCase()) ?? null),
    resolveServiceFit: jest.fn().mockImplementation(async (vs: string[]) => ({
      labels: vs.filter((v) => masters.service_fits.includes(v)),
      unknown: vs.filter((v) => !masters.service_fits.includes(v)),
    })),
    isEligibleLeadBy: jest.fn().mockResolvedValue(true),
    getNextLeadCode: jest.fn().mockResolvedValue('LEAD-0077'),
    createLead: jest.fn().mockResolvedValue({ lead_id: 77, lead_code: 'LEAD-0077' }),
    list: jest.fn().mockResolvedValue({ items: [] }),
    board: jest.fn().mockResolvedValue({ columns: [] }),
    getDetail: jest.fn().mockResolvedValue(detail),
    ...over,
  } as jest.Mocked<SalesLeadRepositoryPort>;
}

const notifier = (): jest.Mocked<SalesNotifierPort> => ({
  leadAssigned: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined),
  sentSince: jest.fn().mockResolvedValue(false),
});

describe('ConvertCompanyToLeadUseCase', () => {
  it('creates a lead with the popup defaults: Cold calling source, Lead By = me, copying the primary contact', async () => {
    const repo = fakeRepo();
    const n = notifier();
    const out = await new ConvertCompanyToLeadUseCase(repo, n).execute({
      company_id: 10,
      service_fit: ['Website Development'],
      first_note: ' Needs a new website ',
      actor: sales,
    });
    expect(out).toBe(detail);
    expect(repo.createLead).toHaveBeenCalledWith({
      company_id: 10,
      person_id: 3,
      company_name: 'Acme',
      lead_source: 'Cold Call',
      lead_by_id: 5,
      service_fit: ['Website Development'],
      first_note: 'Needs a new website',
      actor_emp_id: 5,
    });
    expect(n.leadAssigned).not.toHaveBeenCalled();
  });

  it('opens the existing lead instead of creating a second one', async () => {
    const open = { lead_id: 57, lead_code: 'LEAD-0057', stage: 'Contacted' };
    const repo = fakeRepo({ getConvertContext: jest.fn().mockResolvedValue(ctx({ open_lead: open })) });
    const err = await new ConvertCompanyToLeadUseCase(repo, notifier())
      .execute({ company_id: 10, service_fit: ['Website Development'], actor: sales })
      .catch((e) => e);
    expect(err).toBeInstanceOf(OpenLeadExistsError);
    expect(err.message).toBe('This company is already LEAD-0057 (Contacted).');
    expect(repo.createLead).not.toHaveBeenCalled();
  });

  it('reports every missing field with the BFD message', async () => {
    const repo = fakeRepo();
    const err = await new ConvertCompanyToLeadUseCase(repo, notifier())
      .execute({ company_id: 10, lead_source: 'Smoke signals', lead_by_id: 99, service_fit: [], actor: sales })
      .catch((e) => e);
    expect(err).toBeInstanceOf(FieldValidationError);
    expect(err.errors).toEqual(
      expect.arrayContaining([{ field: 'service_fit', message: 'Please fill this field.' }]),
    );
    expect(repo.createLead).not.toHaveBeenCalled();
  });

  it('rejects values that are not in the masters', async () => {
    const repo = fakeRepo({ isEligibleLeadBy: jest.fn().mockResolvedValue(false) });
    const err = await new ConvertCompanyToLeadUseCase(repo, notifier())
      .execute({ company_id: 10, lead_source: 'Smoke signals', lead_by_id: 99, service_fit: ['Magic'], actor: sales })
      .catch((e) => e);
    expect(err.errors.map((e: { field: string }) => e.field).sort()).toEqual(['lead_by_id', 'lead_source', 'service_fit']);
  });

  it('forces "Existing client" as the source for a client and skips the source check', async () => {
    const repo = fakeRepo({ getConvertContext: jest.fn().mockResolvedValue(ctx({ company: { company_id: 10, company_code: 'COM-0010', name: 'Acme', is_client: true } })) });
    await new ConvertCompanyToLeadUseCase(repo, notifier()).execute({
      company_id: 10,
      lead_source: 'Cold Call',
      service_fit: ['Website Development'],
      actor: sales,
    });
    expect(repo.createLead.mock.calls[0][0].lead_source).toBe('Existing Client');
  });

  it('tells the Lead By user when the lead is made for someone else, and never fails because of it', async () => {
    const repo = fakeRepo();
    const n = notifier();
    n.leadAssigned.mockRejectedValue(new Error('push is down'));
    await expect(
      new ConvertCompanyToLeadUseCase(repo, n).execute({ company_id: 10, lead_by_id: 6, service_fit: ['Website Development'], actor: sales }),
    ).resolves.toBe(detail);
    expect(n.leadAssigned).toHaveBeenCalledWith({
      recipient_emp_id: 6,
      lead_id: 77,
      lead_code: 'LEAD-0077',
      company_name: 'Acme',
      assigned_by_emp_id: 5,
    });
  });

  it('404s for an unknown company', async () => {
    const repo = fakeRepo({ getConvertContext: jest.fn().mockResolvedValue(null) });
    await expect(
      new ConvertCompanyToLeadUseCase(repo, notifier()).execute({ company_id: 1, service_fit: ['x'], actor: sales }),
    ).rejects.toMatchObject({ code: 'COMPANY_NOT_FOUND' });
  });
});

describe('GetLeadFormUseCase', () => {
  it('returns the popup data with a Lead ID preview and the defaults', async () => {
    const form = await new GetLeadFormUseCase(fakeRepo()).execute(10, sales);
    expect(form.next_lead_code).toBe('LEAD-0077');
    expect(form.defaults).toEqual({ lead_source: 'Cold Call', lead_by: masters.lead_by_users[0], status: 'New' });
    expect(form.communication_count).toBe(3);
    expect(form.open_lead).toBeNull();
  });
});

describe('who sees which leads', () => {
  it('a Sales user is always limited to their own leads, whatever they ask for', () => {
    expect(resolveLeadBy('all', sales)).toBe(5);
    expect(resolveLeadBy(6, sales)).toBe(5);
    expect(resolveLeadBy(undefined, sales)).toBe(5);
  });

  it('the Admin sees all, "me", or one chosen user', () => {
    expect(resolveLeadBy(undefined, admin)).toBeUndefined();
    expect(resolveLeadBy('all', admin)).toBeUndefined();
    expect(resolveLeadBy('me', admin)).toBe(1);
    expect(resolveLeadBy(6, admin)).toBe(6);
  });

  it('list defaults to open leads, 10 per page; board defaults to every status', async () => {
    const repo = fakeRepo();
    await new ListLeadsUseCase(repo).execute({}, sales);
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'open', lead_by_id: 5, page: 1, limit: 10 }));
    await new GetLeadBoardUseCase(repo).execute({}, admin);
    expect(repo.board).toHaveBeenCalledWith(expect.objectContaining({ status: 'all', lead_by_id: undefined, per_column: 20 }));
  });

  it('clamps page size', async () => {
    const repo = fakeRepo();
    await new ListLeadsUseCase(repo).execute({ limit: 9999, page: -3 }, admin);
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 100, page: 1 }));
  });
});
