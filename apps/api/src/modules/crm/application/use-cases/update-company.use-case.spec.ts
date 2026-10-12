import { UpdateCompanyUseCase } from './update-company.use-case';
import { CompanyRepositoryPort, CompanyDetail } from '../ports/company.repository.port';
import { PersonRepositoryPort } from '../ports/person.repository.port';
import { IndustryCatalogPort } from '../ports/industry-catalog.port';
import { CustomerTypeCatalogPort } from '../ports/customer-type-catalog.port';
import { EmployeeDirectoryPort } from '../ports/employee-directory.port';
import { CrmUnitOfWorkPort } from '../ports/unit-of-work.port';
import { Company } from '../../domain/entities/company.entity';
import { Person } from '../../domain/entities/person.entity';
import { ConflictDomainError } from '../../domain/errors/crm.errors';

describe('UpdateCompanyUseCase', () => {
  let useCase: UpdateCompanyUseCase;
  let mockCompanyRepo: jest.Mocked<CompanyRepositoryPort>;
  let mockPersonRepo: jest.Mocked<PersonRepositoryPort>;
  let mockIndustryCatalog: jest.Mocked<IndustryCatalogPort>;
  let mockCustomerTypeCatalog: jest.Mocked<CustomerTypeCatalogPort>;
  let mockEmployeeDirectory: jest.Mocked<EmployeeDirectoryPort>;
  let mockUow: CrmUnitOfWorkPort;

  let fakeCompanies: any[] = [];
  let fakeChannels: any[] = [];
  let fakePersons: any[] = [];
  let fakeCompanyPersons: any[] = [];

  beforeEach(() => {
    fakeCompanies = [
      {
        company_id: 1,
        name: 'Original Co',
        customer_type_id: 1,
        industry_id: 1,
        sub_industry_id: null,
        parent_company_id: null,
        address: null,
        city: null,
        state: null,
        country: null,
        owner_id: null,
        is_active: true,
        created_at: new Date(),
        created_by: 1,
      },
    ];

    fakeChannels = [
      {
        channel_id: 10,
        company_id: 1,
        channel_type: 'email',
        value: 'old@orig.com',
        label: 'Old',
        is_primary: true,
        deleted_at: null,
      },
      {
        channel_id: 11,
        company_id: 1,
        channel_type: 'phone',
        value: '+1234567890',
        label: 'Old Phone',
        is_primary: true,
        deleted_at: null,
      },
    ];

    fakePersons = [
      {
        person_id: 100,
        name: 'John Doe',
        email: 'john@orig.com',
        mobile: '+1234567890',
        linkedin_url: null,
        created_at: new Date(),
        created_by: 1,
      },
    ];

    fakeCompanyPersons = [
      {
        company_person_id: 200,
        company_id: 1,
        person_id: 100,
        designation: 'Staff Engineer',
        department_id: null,
        is_primary: true,
        reports_to_company_person_id: null,
        deleted_at: null,
      },
    ];

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
          sub_industry: null,
          parent: null,
          children: [],
          address: c.address,
          city: c.city,
          state: c.state,
          country: c.country,
          owner: null,
          is_active: c.is_active,
          created_at: c.created_at,
          updated_at: new Date(),
          channels: fakeChannels
            .filter((ch) => ch.company_id === id && ch.deleted_at === null)
            .map((ch) => ({
              channel_id: ch.channel_id,
              channel_type: ch.channel_type,
              value: ch.value,
              label: ch.label,
              is_primary: ch.is_primary,
            })),
          contacts: fakeCompanyPersons
            .filter((cp) => cp.company_id === id && cp.deleted_at === null)
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
                reports_to_company_person_id: cp.reports_to_company_person_id,
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
      findIndustryById: jest.fn().mockResolvedValue({ industry_id: 1, name: 'Tech', parent_id: null, is_active: true }),
    };

    mockCustomerTypeCatalog = {
      findCustomerTypeById: jest.fn().mockResolvedValue({ customer_type_id: 1, name: 'Client', is_active: true }),
    };

    mockEmployeeDirectory = {
      findEmployeeById: jest.fn().mockResolvedValue(null),
    };

    mockUow = {
      runInTransaction: jest.fn().mockImplementation(async (work) => {
        const fakeTx = {
          companies: {
            update: jest.fn().mockImplementation(async ({ where, data }) => {
              const target = fakeCompanies.find((x) => x.company_id === where.company_id);
              if (target) Object.assign(target, data);
              return target;
            }),
          },
          company_channels: {
            create: jest.fn().mockImplementation(async ({ data }) => {
              const row = { channel_id: fakeChannels.length + 1, ...data, deleted_at: null };
              fakeChannels.push(row);
              return row;
            }),
            update: jest.fn().mockImplementation(async ({ where, data }) => {
              const target = fakeChannels.find((x) => x.channel_id === where.channel_id);
              if (target) Object.assign(target, data);
              return target;
            }),
            updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
              for (const ch of fakeChannels) {
                if (ch.company_id === where.company_id && where.channel_id?.notIn?.indexOf(ch.channel_id) === -1) {
                  Object.assign(ch, data);
                }
              }
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
              const row = { company_person_id: fakeCompanyPersons.length + 1, ...data, deleted_at: null };
              fakeCompanyPersons.push(row);
              return row;
            }),
            update: jest.fn().mockImplementation(async ({ where, data }) => {
              const target = fakeCompanyPersons.find((x) => x.company_person_id === where.company_person_id);
              if (target) Object.assign(target, data);
              return target;
            }),
            updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
              for (const cp of fakeCompanyPersons) {
                if (cp.company_id === where.company_id && where.company_person_id?.notIn?.indexOf(cp.company_person_id) === -1) {
                  Object.assign(cp, data);
                }
              }
            }),
          },
        };
        return work(fakeTx);
      }),
    };

    useCase = new UpdateCompanyUseCase(
      mockCompanyRepo,
      mockPersonRepo,
      mockIndustryCatalog,
      mockCustomerTypeCatalog,
      mockEmployeeDirectory,
      mockUow,
    );
  });

  it('updates company details and applies channel & contact diff semantics', async () => {
    // Retain channel 10 with new label, omit channel 11 (should be soft deleted), add new website channel
    // Update contact 200 designation to VP Engineering, add new contact
    const result = await useCase.execute({
      id: 1,
      name: 'Updated Co Name',
      channels: [
        { channel_id: 10, channel_type: 'email', value: 'old@orig.com', label: 'Updated Label', is_primary: true },
        { channel_type: 'website', value: 'https://updated.com', is_primary: true },
      ],
      contacts: [
        { company_person_id: 200, designation: 'VP Engineering', is_primary: true },
        { person: { name: 'Bob New', email: 'bob@updated.com' }, designation: 'Director' },
      ],
      acting_admin_id: 2,
    });

    expect(result.name).toBe('Updated Co Name');
    expect(result.channels).toHaveLength(2);
    expect(result.channels.find((ch) => ch.channel_id === 10)?.label).toBe('Updated Label');
    expect(result.channels.find((ch) => ch.channel_type === 'website')?.value).toBe('https://updated.com/');

    // Contact 200 designation updated
    expect(result.contacts.find((c) => c.company_person_id === 200)?.designation).toBe('VP Engineering');
    // Person 100 name should NOT be modified
    expect(fakePersons.find((p) => p.person_id === 100)?.name).toBe('John Doe');
  });

  it('rejects self-parenting', async () => {
    await expect(
      useCase.execute({
        id: 1,
        parent_company_id: 1,
        acting_admin_id: 2,
      }),
    ).rejects.toThrow(ConflictDomainError);
  });
});
