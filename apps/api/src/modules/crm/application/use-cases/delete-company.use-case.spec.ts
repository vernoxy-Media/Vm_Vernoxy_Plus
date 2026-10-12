import { DeleteCompanyUseCase } from './delete-company.use-case';
import { CompanyRepositoryPort } from '../ports/company.repository.port';
import { CrmUnitOfWorkPort } from '../ports/unit-of-work.port';
import { Company } from '../../domain/entities/company.entity';
import { ConflictDomainError, NotFoundDomainError } from '../../domain/errors/crm.errors';

describe('DeleteCompanyUseCase', () => {
  let useCase: DeleteCompanyUseCase;
  let mockCompanyRepo: jest.Mocked<CompanyRepositoryPort>;
  let mockUow: CrmUnitOfWorkPort;

  let fakeCompany: any;
  let fakeChannels: any[] = [];
  let fakeCompanyPersons: any[] = [];
  let fakePersons: any[] = [];

  beforeEach(() => {
    fakeCompany = {
      company_id: 1,
      name: 'Acme',
      deleted_at: null,
      deleted_by: null,
    };
    fakeChannels = [
      { channel_id: 1, company_id: 1, deleted_at: null, deleted_by: null },
      { channel_id: 2, company_id: 1, deleted_at: null, deleted_by: null },
    ];
    fakeCompanyPersons = [
      { company_person_id: 1, company_id: 1, person_id: 10, deleted_at: null, deleted_by: null },
    ];
    fakePersons = [
      { person_id: 10, name: 'Alice', deleted_at: null, deleted_by: null },
    ];

    mockCompanyRepo = {
      findById: jest.fn().mockImplementation(async (id: number) => {
        if (fakeCompany && fakeCompany.company_id === id && fakeCompany.deleted_at === null) {
          return new Company(
            fakeCompany.company_id,
            fakeCompany.name,
            1,
            1,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            true,
            new Date(),
            1,
            null,
            null,
            fakeCompany.deleted_at,
            fakeCompany.deleted_by,
          );
        }
        return null;
      }),
      hasActiveChildren: jest.fn().mockResolvedValue(false),
      hasActiveLeads: jest.fn().mockResolvedValue(false),
      list: jest.fn(),
      getOptions: jest.fn(),
      checkDuplicates: jest.fn(),
      getDetail: jest.fn(),
    };

    mockUow = {
      runInTransaction: jest.fn().mockImplementation(async (work) => {
        const fakeTx = {
          companies: {
            update: jest.fn().mockImplementation(async ({ where, data }) => {
              if (fakeCompany.company_id === where.company_id) {
                Object.assign(fakeCompany, data);
              }
            }),
          },
          company_channels: {
            updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
              for (const ch of fakeChannels) {
                if (ch.company_id === where.company_id && ch.deleted_at === null) {
                  Object.assign(ch, data);
                }
              }
            }),
          },
          company_persons: {
            updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
              for (const cp of fakeCompanyPersons) {
                if (cp.company_id === where.company_id && cp.deleted_at === null) {
                  Object.assign(cp, data);
                }
              }
            }),
          },
        };
        return work(fakeTx);
      }),
    };

    useCase = new DeleteCompanyUseCase(mockCompanyRepo, mockUow);
  });

  it('soft deletes company, channels and company_persons, but leaves persons intact', async () => {
    await useCase.execute({ id: 1, acting_admin_id: 99 });

    expect(fakeCompany.deleted_at).not.toBeNull();
    expect(fakeCompany.deleted_by).toBe(99);

    expect(fakeChannels.every((ch) => ch.deleted_at !== null && ch.deleted_by === 99)).toBe(true);
    expect(fakeCompanyPersons.every((cp) => cp.deleted_at !== null && cp.deleted_by === 99)).toBe(true);

    // Persons row must NOT be deleted
    expect(fakePersons[0].deleted_at).toBeNull();
  });

  it('rejects deletion when company has active children', async () => {
    mockCompanyRepo.hasActiveChildren.mockResolvedValueOnce(true);

    await expect(useCase.execute({ id: 1, acting_admin_id: 99 })).rejects.toThrow(ConflictDomainError);
  });

  it('rejects deletion when company has active leads', async () => {
    mockCompanyRepo.hasActiveLeads.mockResolvedValueOnce(true);

    await expect(useCase.execute({ id: 1, acting_admin_id: 99 })).rejects.toThrow(ConflictDomainError);
  });

  it('throws 404 if company not found', async () => {
    await expect(useCase.execute({ id: 999, acting_admin_id: 99 })).rejects.toThrow(NotFoundDomainError);
  });
});
