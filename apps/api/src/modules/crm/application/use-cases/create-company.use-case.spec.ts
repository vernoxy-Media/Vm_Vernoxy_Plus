import { CreateCompanyUseCase } from './create-company.use-case';
import { CompanyRepositoryPort, CompanyDetail } from '../ports/company.repository.port';
import { PersonRepositoryPort, PersonLookupMatch } from '../ports/person.repository.port';
import { IndustryCatalogPort } from '../ports/industry-catalog.port';
import { CustomerTypeCatalogPort } from '../ports/customer-type-catalog.port';
import { EmployeeDirectoryPort } from '../ports/employee-directory.port';
import { CrmUnitOfWorkPort } from '../ports/unit-of-work.port';
import { Person } from '../../domain/entities/person.entity';
import { Company } from '../../domain/entities/company.entity';
import {
  ConflictDomainError,
  UnprocessableDomainError,
  ValidationDomainError,
} from '../../domain/errors/crm.errors';

describe('CreateCompanyUseCase', () => {
  let useCase: CreateCompanyUseCase;
  let mockCompanyRepo: jest.Mocked<CompanyRepositoryPort>;
  let mockPersonRepo: jest.Mocked<PersonRepositoryPort>;
  let mockIndustryCatalog: jest.Mocked<IndustryCatalogPort>;
  let mockCustomerTypeCatalog: jest.Mocked<CustomerTypeCatalogPort>;
  let mockEmployeeDirectory: jest.Mocked<EmployeeDirectoryPort>;
  let mockUow: CrmUnitOfWorkPort;

  // in-memory fake database
  let fakeCompanies: any[] = [];
  let fakeChannels: any[] = [];
  let fakePersons: any[] = [];
  let fakeCompanyPersons: any[] = [];

  beforeEach(() => {
    fakeCompanies = [];
    fakeChannels = [];
    fakePersons = [];
    fakeCompanyPersons = [];

    mockCompanyRepo = {
      list: jest.fn(),
      getOptions: jest.fn(),
      checkDuplicates: jest.fn(),
      findById: jest.fn().mockImplementation(async (id: number) => {
        const c = fakeCompanies.find((x) => x.company_id === id);
        if (!c) return null;
        return new Company(
          c.company_id,
          c.name,
          c.customer_type_id,
          c.industry_id,
          c.sub_industry_id,
          c.parent_company_id,
          c.address,
          c.city,
          c.state,
          c.country,
          c.owner_id,
          c.is_active,
          c.created_at,
          c.created_by,
          null,
          null,
          null,
          null,
        );
      }),
      hasActiveChildren: jest.fn().mockResolvedValue(false),
      hasActiveLeads: jest.fn().mockResolvedValue(false),
      getDetail: jest.fn().mockImplementation(async (id: number): Promise<CompanyDetail | null> => {
        const c = fakeCompanies.find((x) => x.company_id === id);
        if (!c) return null;
        return {
          company_id: c.company_id,
          name: c.name,
          customer_type: { id: c.customer_type_id, name: 'Client' },
          industry: { id: c.industry_id, name: 'Tech' },
          sub_industry: c.sub_industry_id ? { id: c.sub_industry_id, name: 'SaaS' } : null,
          parent: null,
          children: [],
          address: c.address,
          city: c.city,
          state: c.state,
          country: c.country,
          owner: c.owner_id ? { emp_id: c.owner_id, name: 'Admin User' } : null,
          is_active: c.is_active,
          created_at: c.created_at,
          updated_at: null,
          channels: fakeChannels
            .filter((ch) => ch.company_id === id)
            .map((ch) => ({
              channel_id: ch.channel_id,
              channel_type: ch.channel_type,
              value: ch.value,
              label: ch.label,
              is_primary: ch.is_primary,
            })),
          contacts: fakeCompanyPersons
            .filter((cp) => cp.company_id === id)
            .map((cp) => {
              const p = fakePersons.find((x) => x.person_id === cp.person_id);
              return {
                company_person_id: cp.company_person_id,
                person_id: cp.person_id,
                name: p?.name || '',
                email: p?.email || null,
                mobile: p?.mobile || null,
                linkedin_url: p?.linkedin_url || null,
                designation: cp.designation,
                department: null,
                is_primary: cp.is_primary,
                reports_to_company_person_id: cp.reports_to_id ?? cp.reports_to_company_person_id ?? null,
                linked_company_count: 1,
              };
            }),
        };
      }),
    };

    mockPersonRepo = {
      findById: jest.fn().mockImplementation(async (id: number) => {
        const p = fakePersons.find((x) => x.person_id === id);
        if (!p) return null;
        return new Person(p.person_id, p.name, p.email, p.mobile, p.linkedin_url, p.created_at, p.created_by, null, null, null, null);
      }),
      findByEmail: jest.fn(),
      findByMobile: jest.fn(),
      lookupByEmailOrMobile: jest.fn(),
      create: jest.fn(),
    };

    mockIndustryCatalog = {
      findIndustryById: jest.fn().mockImplementation(async (id: number) => {
        if (id === 1) return { industry_id: 1, name: 'Tech', parent_id: null, is_active: true };
        if (id === 2) return { industry_id: 2, name: 'SaaS', parent_id: 1, is_active: true };
        if (id === 3) return { industry_id: 3, name: 'Inactive Tech', parent_id: null, is_active: false };
        if (id === 4) return { industry_id: 4, name: 'Mismatch Sub', parent_id: 99, is_active: true };
        return null;
      }),
    };

    mockCustomerTypeCatalog = {
      findCustomerTypeById: jest.fn().mockImplementation(async (id: number) => {
        if (id === 1) return { customer_type_id: 1, name: 'Client', is_active: true };
        if (id === 2) return { customer_type_id: 2, name: 'Inactive Type', is_active: false };
        return null;
      }),
    };

    mockEmployeeDirectory = {
      findEmployeeById: jest.fn().mockImplementation(async (id: number) => {
        if (id === 10) return { emp_id: 10, full_name: 'Admin User', status: 'Active', is_admin: true };
        if (id === 20) return { emp_id: 20, full_name: 'Inactive User', status: 'Inactive', is_admin: false };
        return null;
      }),
    };

    mockUow = {
      runInTransaction: jest.fn().mockImplementation(async (work) => {
        const fakeTx = {
          companies: {
            create: jest.fn().mockImplementation(async ({ data }) => {
              const row = { company_id: fakeCompanies.length + 1, ...data, created_at: new Date() };
              fakeCompanies.push(row);
              return row;
            }),
          },
          company_channels: {
            create: jest.fn().mockImplementation(async ({ data }) => {
              const row = { channel_id: fakeChannels.length + 1, ...data };
              fakeChannels.push(row);
              return row;
            }),
          },
          persons: {
            create: jest.fn().mockImplementation(async ({ data }) => {
              const row = { person_id: fakePersons.length + 1, ...data, created_at: new Date() };
              fakePersons.push(row);
              return row;
            }),
          },
          company_persons: {
            create: jest.fn().mockImplementation(async ({ data }) => {
              const row = { company_person_id: fakeCompanyPersons.length + 1, ...data };
              fakeCompanyPersons.push(row);
              return row;
            }),
            update: jest.fn().mockImplementation(async ({ where, data }) => {
              const target = fakeCompanyPersons.find((x) => x.company_person_id === where.company_person_id);
              if (target) Object.assign(target, data);
              return target;
            }),
          },
        };
        return work(fakeTx);
      }),
    };

    useCase = new CreateCompanyUseCase(
      mockCompanyRepo,
      mockPersonRepo,
      mockIndustryCatalog,
      mockCustomerTypeCatalog,
      mockEmployeeDirectory,
      mockUow,
    );
  });

  it('creates a company with channels and contacts successfully', async () => {
    // pre-populate an existing person
    fakePersons.push({
      person_id: 101,
      name: 'Existing Person',
      email: 'existing@corp.com',
      mobile: '+1122334455',
      linkedin_url: null,
      created_at: new Date(),
      created_by: 1,
    });

    const result = await useCase.execute({
      name: '   Acme   Enterprises   ',
      customer_type_id: 1,
      industry_id: 1,
      sub_industry_id: 2,
      owner_id: 10,
      channels: [
        { channel_type: 'website', value: 'acme.com', is_primary: true },
        { channel_type: 'email', value: 'Info@Acme.com', is_primary: true },
      ],
      contacts: [
        {
          person: { name: 'Alice Smith', email: 'alice@acme.com', mobile: '555-123-4567' },
          designation: 'CEO',
          is_primary: true,
        },
        {
          person_id: 101,
          designation: 'Advisor',
          reports_to_index: 0,
        },
      ],
      acting_admin_id: 1,
    });

    expect(result.name).toBe('Acme Enterprises');
    expect(result.channels).toHaveLength(2);
    expect(result.channels[0].value).toBe('https://acme.com/');
    expect(result.channels[1].value).toBe('info@acme.com');
    expect(result.contacts).toHaveLength(2);
    expect(result.contacts[0].is_primary).toBe(true);
    expect(result.contacts[1].reports_to_company_person_id).toBe(result.contacts[0].company_person_id);
  });

  it('rejects multiple primary channels of the same type', async () => {
    await expect(
      useCase.execute({
        name: 'Alpha Corp',
        customer_type_id: 1,
        industry_id: 1,
        channels: [
          { channel_type: 'email', value: 'a@alpha.com', is_primary: true },
          { channel_type: 'email', value: 'b@alpha.com', is_primary: true },
        ],
        acting_admin_id: 1,
      }),
    ).rejects.toThrow(ConflictDomainError);
  });

  it('rejects multiple primary contacts', async () => {
    await expect(
      useCase.execute({
        name: 'Beta Corp',
        customer_type_id: 1,
        industry_id: 1,
        contacts: [
          { person: { name: 'Alice', email: 'a@beta.com' }, is_primary: true },
          { person: { name: 'Bob', email: 'b@beta.com' }, is_primary: true },
        ],
        acting_admin_id: 1,
      }),
    ).rejects.toThrow(ConflictDomainError);
  });

  it('rejects contact without both email and mobile', async () => {
    await expect(
      useCase.execute({
        name: 'Gamma Corp',
        customer_type_id: 1,
        industry_id: 1,
        contacts: [
          { person: { name: 'No Contact Info' } },
        ],
        acting_admin_id: 1,
      }),
    ).rejects.toThrow(UnprocessableDomainError);
  });

  it('rejects inactive industry or sub-industry mismatch', async () => {
    await expect(
      useCase.execute({
        name: 'Delta Corp',
        customer_type_id: 1,
        industry_id: 3, // Inactive
        acting_admin_id: 1,
      }),
    ).rejects.toThrow(UnprocessableDomainError);

    await expect(
      useCase.execute({
        name: 'Delta Corp',
        customer_type_id: 1,
        industry_id: 1,
        sub_industry_id: 4, // parent mismatch
        acting_admin_id: 1,
      }),
    ).rejects.toThrow(UnprocessableDomainError);
  });
});
