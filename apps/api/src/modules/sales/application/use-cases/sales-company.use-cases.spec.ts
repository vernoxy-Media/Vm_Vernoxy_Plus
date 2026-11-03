import { CreateSalesCompanyUseCase } from './create-sales-company.use-case';
import { UpdateSalesCompanyUseCase } from './update-sales-company.use-case';
import { DeleteSalesCompanyUseCase } from './delete-sales-company.use-case';
import { SalesCompanyDetail, SalesCompanyRepositoryPort } from '../ports/sales-company.repository.port';
import { DuplicateMatch, DuplicateCompanyError, FieldValidationError } from '../../domain/errors/sales.errors';
import { mergeCompanyFields } from '../../domain/services/company-input.service';

const dup: DuplicateMatch = { company_id: 7, company_code: 'COM-0007', name: 'Acme', city: 'Surat', reason: 'SAME_NAME_CITY' };

function detail(over: Partial<SalesCompanyDetail> = {}): SalesCompanyDetail {
  return {
    company_id: 1,
    company_code: 'COM-0001',
    fields: mergeCompanyFields(null, { name: 'Acme', city: 'Surat', website_quality: 'No Website', country: 'India' }),
    brochure_url: null,
    industry: null,
    contacts: [
      { company_person_id: 1, person_id: 1, name: 'Rakesh', designation: null, mobile: '9825041236', email: null, is_primary: true, is_active: true },
    ],
    lead: { kind: 'none', lead_id: null, lead_code: null, stage: null, client_code: null, client_id: null },
    can_convert_to_lead: true,
    created_at: new Date(),
    created_by: null,
    updated_at: null,
    ...over,
  };
}

function fakeRepo(over: Partial<SalesCompanyRepositoryPort> = {}): jest.Mocked<SalesCompanyRepositoryPort> {
  return {
    list: jest.fn(),
    getDetail: jest.fn().mockResolvedValue(detail()),
    findDuplicates: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ company_id: 1, company_code: 'COM-0001' }),
    update: jest.fn().mockResolvedValue(undefined),
    getDeleteBlockers: jest.fn(),
    softDelete: jest.fn().mockResolvedValue(undefined),
    getMasters: jest.fn(),
    ...over,
  } as jest.Mocked<SalesCompanyRepositoryPort>;
}

describe('CreateSalesCompanyUseCase', () => {
  it('saves a company that has only a name', async () => {
    const repo = fakeRepo();
    await new CreateSalesCompanyUseCase(repo).execute({ company: { name: ' Acme ' }, actor_emp_id: 5 });
    const arg = repo.create.mock.calls[0][0];
    expect(arg.fields.name).toBe('Acme');
    expect(arg.fields.website_quality).toBe('No Website');
    expect(arg.fields.country).toBe('India');
    expect(arg.actor_emp_id).toBe(5);
  });

  it('saves nothing and lists every error when the form is invalid', async () => {
    const repo = fakeRepo();
    const err = await new CreateSalesCompanyUseCase(repo)
      .execute({ company: { name: '', pin: '12' }, contact: { name: 'R', mobile: '1' }, actor_emp_id: 5 })
      .catch((e) => e);
    expect(err).toBeInstanceOf(FieldValidationError);
    expect(err.errors.map((e: { field: string }) => e.field)).toEqual(['name', 'pin', 'contact.mobile']);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.findDuplicates).not.toHaveBeenCalled();
  });

  it('warns about a duplicate and saves nothing until the user confirms', async () => {
    const repo = fakeRepo({ findDuplicates: jest.fn().mockResolvedValue([dup]) });
    const uc = new CreateSalesCompanyUseCase(repo);
    await expect(uc.execute({ company: { name: 'Acme', city: 'Surat' }, actor_emp_id: 5 })).rejects.toBeInstanceOf(
      DuplicateCompanyError,
    );
    expect(repo.create).not.toHaveBeenCalled();

    const ok = await uc.execute({ company: { name: 'Acme', city: 'Surat' }, confirm_duplicate: true, actor_emp_id: 5 });
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(repo.create.mock.calls[0][0].confirmed_duplicates).toEqual([dup]);
    expect(ok.duplicate_confirmed).toBe(true);
  });

  it('matches duplicates on the normalized mobile and email', async () => {
    const repo = fakeRepo();
    await new CreateSalesCompanyUseCase(repo).execute({
      company: { name: 'Acme' },
      contact: { name: 'R', mobile: '+91 98250 41236', email: 'R@X.IN' },
      actor_emp_id: 5,
    });
    expect(repo.findDuplicates).toHaveBeenCalledWith(expect.objectContaining({ mobile: '9825041236', email: 'r@x.in' }));
  });
});

describe('UpdateSalesCompanyUseCase', () => {
  it('only changes what was sent and does not re-check duplicates when identity is unchanged', async () => {
    const repo = fakeRepo();
    await new UpdateSalesCompanyUseCase(repo).execute({ company_id: 1, company: { pin: '395007' }, actor_emp_id: 5 });
    expect(repo.findDuplicates).not.toHaveBeenCalled();
    const arg = repo.update.mock.calls[0][0];
    expect(arg.fields.pin).toBe('395007');
    expect(arg.fields.name).toBe('Acme');
    expect(arg.contact.name).toBe('Rakesh');
  });

  it('re-checks duplicates (excluding itself) when the name changes', async () => {
    const repo = fakeRepo({ findDuplicates: jest.fn().mockResolvedValue([dup]) });
    const uc = new UpdateSalesCompanyUseCase(repo);
    await expect(uc.execute({ company_id: 1, company: { name: 'Acme 2' }, actor_emp_id: 5 })).rejects.toBeInstanceOf(
      DuplicateCompanyError,
    );
    expect(repo.findDuplicates).toHaveBeenCalledWith(expect.objectContaining({ exclude_company_id: 1 }));
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('404s for an unknown company', async () => {
    const repo = fakeRepo({ getDetail: jest.fn().mockResolvedValue(null) });
    await expect(
      new UpdateSalesCompanyUseCase(repo).execute({ company_id: 99, company: { pin: '1' }, actor_emp_id: 5 }),
    ).rejects.toMatchObject({ code: 'COMPANY_NOT_FOUND' });
  });
});

describe('DeleteSalesCompanyUseCase', () => {
  const admin = { emp_id: 1, is_admin: true, is_sales: false };
  const sales = { emp_id: 2, is_admin: false, is_sales: true };

  it('is Admin only', async () => {
    const repo = fakeRepo();
    await expect(new DeleteSalesCompanyUseCase(repo).execute(1, sales)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('is blocked by a lead, a client or communication', async () => {
    const repo = fakeRepo({
      getDeleteBlockers: jest.fn().mockResolvedValue({ has_lead: true, is_client: false, has_communication: true }),
    });
    await expect(new DeleteSalesCompanyUseCase(repo).execute(1, admin)).rejects.toMatchObject({
      code: 'COMPANY_HAS_DEPENDENCIES',
      message: expect.stringContaining('a lead, communication history'),
    });
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('soft deletes a clean company', async () => {
    const repo = fakeRepo({
      getDeleteBlockers: jest.fn().mockResolvedValue({ has_lead: false, is_client: false, has_communication: false }),
    });
    await new DeleteSalesCompanyUseCase(repo).execute(1, admin);
    expect(repo.softDelete).toHaveBeenCalledWith(1, 1);
  });
});
