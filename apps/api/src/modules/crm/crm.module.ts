import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { OrganizationModule } from '../organization/organization.module';

// Controllers
import { CompanyController } from './presentation/controllers/company.controller';
import { PersonController } from './presentation/controllers/person.controller';
import { CompanyAdminGuard } from './presentation/guards/company-admin.guard';

// Ports
import {
  COMPANY_REPOSITORY_PORT_TOKEN,
  CompanyRepositoryPort,
} from './application/ports/company.repository.port';
import {
  PERSON_REPOSITORY_PORT_TOKEN,
  PersonRepositoryPort,
} from './application/ports/person.repository.port';
import {
  CRM_UNIT_OF_WORK_PORT_TOKEN,
  CrmUnitOfWorkPort,
} from './application/ports/unit-of-work.port';
import {
  COMPANY_ACCESS_POLICY_PORT_TOKEN,
} from './application/ports/access-policy.port';
import {
  INDUSTRY_CATALOG_PORT_TOKEN,
  IndustryCatalogPort,
} from './application/ports/industry-catalog.port';
import {
  CUSTOMER_TYPE_CATALOG_PORT_TOKEN,
  CustomerTypeCatalogPort,
} from './application/ports/customer-type-catalog.port';
import {
  EMPLOYEE_DIRECTORY_PORT_TOKEN,
  EmployeeDirectoryPort,
} from './application/ports/employee-directory.port';

// Repositories & Adapters
import { PrismaCompanyRepository } from './infrastructure/persistence/prisma-company.repository';
import { PrismaPersonRepository } from './infrastructure/persistence/prisma-person.repository';
import { PrismaCrmUnitOfWork } from './infrastructure/persistence/prisma-crm-unit-of-work';
import { AuthCompanyAccessPolicyAdapter } from './infrastructure/adapters/auth-access-policy.adapter';
import { MasterDataCatalogAdapter } from './infrastructure/adapters/master-data-catalog.adapter';
import { OrganizationEmployeeDirectoryAdapter } from './infrastructure/adapters/organization-employee-directory.adapter';

// Use Cases
import { ListCompaniesUseCase } from './application/use-cases/list-companies.use-case';
import { GetCompanyOptionsUseCase } from './application/use-cases/get-company-options.use-case';
import { CheckCompanyDuplicatesUseCase } from './application/use-cases/check-company-duplicates.use-case';
import { GetCompanyDetailUseCase } from './application/use-cases/get-company-detail.use-case';
import { CreateCompanyUseCase } from './application/use-cases/create-company.use-case';
import { UpdateCompanyUseCase } from './application/use-cases/update-company.use-case';
import { DeleteCompanyUseCase } from './application/use-cases/delete-company.use-case';
import { LookupPersonsUseCase } from './application/use-cases/lookup-persons.use-case';

@Module({
  imports: [AuthModule, MasterDataModule, OrganizationModule],
  controllers: [CompanyController, PersonController],
  providers: [
    // Repositories & UoW
    {
      provide: COMPANY_REPOSITORY_PORT_TOKEN,
      useClass: PrismaCompanyRepository,
    },
    {
      provide: PERSON_REPOSITORY_PORT_TOKEN,
      useClass: PrismaPersonRepository,
    },
    {
      provide: CRM_UNIT_OF_WORK_PORT_TOKEN,
      useClass: PrismaCrmUnitOfWork,
    },

    // Adapters
    {
      provide: COMPANY_ACCESS_POLICY_PORT_TOKEN,
      useClass: AuthCompanyAccessPolicyAdapter,
    },
    {
      provide: INDUSTRY_CATALOG_PORT_TOKEN,
      useClass: MasterDataCatalogAdapter,
    },
    {
      provide: CUSTOMER_TYPE_CATALOG_PORT_TOKEN,
      useClass: MasterDataCatalogAdapter,
    },
    {
      provide: EMPLOYEE_DIRECTORY_PORT_TOKEN,
      useClass: OrganizationEmployeeDirectoryAdapter,
    },

    // Guard
    CompanyAdminGuard,

    // Use cases
    {
      provide: ListCompaniesUseCase,
      inject: [COMPANY_REPOSITORY_PORT_TOKEN],
      useFactory: (repo: CompanyRepositoryPort) => new ListCompaniesUseCase(repo),
    },
    {
      provide: GetCompanyOptionsUseCase,
      inject: [COMPANY_REPOSITORY_PORT_TOKEN],
      useFactory: (repo: CompanyRepositoryPort) => new GetCompanyOptionsUseCase(repo),
    },
    {
      provide: CheckCompanyDuplicatesUseCase,
      inject: [COMPANY_REPOSITORY_PORT_TOKEN],
      useFactory: (repo: CompanyRepositoryPort) => new CheckCompanyDuplicatesUseCase(repo),
    },
    {
      provide: GetCompanyDetailUseCase,
      inject: [COMPANY_REPOSITORY_PORT_TOKEN],
      useFactory: (repo: CompanyRepositoryPort) => new GetCompanyDetailUseCase(repo),
    },
    {
      provide: CreateCompanyUseCase,
      inject: [
        COMPANY_REPOSITORY_PORT_TOKEN,
        PERSON_REPOSITORY_PORT_TOKEN,
        INDUSTRY_CATALOG_PORT_TOKEN,
        CUSTOMER_TYPE_CATALOG_PORT_TOKEN,
        EMPLOYEE_DIRECTORY_PORT_TOKEN,
        CRM_UNIT_OF_WORK_PORT_TOKEN,
      ],
      useFactory: (
        cRepo: CompanyRepositoryPort,
        pRepo: PersonRepositoryPort,
        indCat: IndustryCatalogPort,
        ctCat: CustomerTypeCatalogPort,
        empDir: EmployeeDirectoryPort,
        uow: CrmUnitOfWorkPort,
      ) => new CreateCompanyUseCase(cRepo, pRepo, indCat, ctCat, empDir, uow),
    },
    {
      provide: UpdateCompanyUseCase,
      inject: [
        COMPANY_REPOSITORY_PORT_TOKEN,
        PERSON_REPOSITORY_PORT_TOKEN,
        INDUSTRY_CATALOG_PORT_TOKEN,
        CUSTOMER_TYPE_CATALOG_PORT_TOKEN,
        EMPLOYEE_DIRECTORY_PORT_TOKEN,
        CRM_UNIT_OF_WORK_PORT_TOKEN,
      ],
      useFactory: (
        cRepo: CompanyRepositoryPort,
        pRepo: PersonRepositoryPort,
        indCat: IndustryCatalogPort,
        ctCat: CustomerTypeCatalogPort,
        empDir: EmployeeDirectoryPort,
        uow: CrmUnitOfWorkPort,
      ) => new UpdateCompanyUseCase(cRepo, pRepo, indCat, ctCat, empDir, uow),
    },
    {
      provide: DeleteCompanyUseCase,
      inject: [COMPANY_REPOSITORY_PORT_TOKEN, CRM_UNIT_OF_WORK_PORT_TOKEN],
      useFactory: (cRepo: CompanyRepositoryPort, uow: CrmUnitOfWorkPort) =>
        new DeleteCompanyUseCase(cRepo, uow),
    },
    {
      provide: LookupPersonsUseCase,
      inject: [PERSON_REPOSITORY_PORT_TOKEN],
      useFactory: (pRepo: PersonRepositoryPort) => new LookupPersonsUseCase(pRepo),
    },
  ],
  exports: [
    COMPANY_REPOSITORY_PORT_TOKEN,
    PERSON_REPOSITORY_PORT_TOKEN,
  ],
})
export class CrmModule {}
