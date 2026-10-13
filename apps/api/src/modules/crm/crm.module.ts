import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MasterDataModule } from '../master-data/master-data.module';
import { OrganizationModule } from '../organization/organization.module';
import { StorageModule, STORAGE_TOKENS, FileStoragePort } from '../storage/public-api';
import {
  DataTransferModule,
  DATA_TRANSFER_TOKENS,
  DataTransferRegistry,
  FileInspectionService,
  TransferJobRepository,
  JobQueuePort,
  GetTransferJobUseCase,
  GetTransferJobIssuesUseCase,
  ListTransferJobsUseCase,
  CancelTransferJobUseCase,
  DownloadTransferReportUseCase,
} from '../data-transfer/public-api';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PrismaService } from '../../core/prisma/prisma.service';

// Controllers
import { CompanyDataTransferController } from './presentation/controllers/company-data-transfer.controller';
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

// Data Transfer Infrastructure & Services
import { CompanyExportSource } from './infrastructure/export/company-export.source';
import { CompanyImportHandler } from './infrastructure/import/company-import.handler';

// Use Cases
import { ListCompaniesUseCase } from './application/use-cases/list-companies.use-case';
import { GetCompanyOptionsUseCase } from './application/use-cases/get-company-options.use-case';
import { CheckCompanyDuplicatesUseCase } from './application/use-cases/check-company-duplicates.use-case';
import { GetCompanyDetailUseCase } from './application/use-cases/get-company-detail.use-case';
import { CreateCompanyUseCase } from './application/use-cases/create-company.use-case';
import { UpdateCompanyUseCase } from './application/use-cases/update-company.use-case';
import { DeleteCompanyUseCase } from './application/use-cases/delete-company.use-case';
import { LookupPersonsUseCase } from './application/use-cases/lookup-persons.use-case';
import { DownloadCompanyTemplateUseCase } from './application/use-cases/download-company-template.use-case';
import { PreviewCompanyImportUseCase } from './application/use-cases/preview-company-import.use-case';
import { ConfirmCompanyImportUseCase } from './application/use-cases/confirm-company-import.use-case';
import { ExportCompaniesUseCase } from './application/use-cases/export-companies.use-case';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MasterDataModule,
    OrganizationModule,
    StorageModule,
    DataTransferModule,
  ],
  controllers: [
    CompanyDataTransferController,
    CompanyController,
    PersonController,
  ],
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

    // Data Transfer Infrastructure
    CompanyExportSource,
    CompanyImportHandler,

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

    // Data Transfer Use Cases
    {
      provide: DownloadCompanyTemplateUseCase,
      inject: [DATA_TRANSFER_TOKENS.SPREADSHEET_WRITER, PrismaService],
      useFactory: (writer: any, prisma: PrismaService) =>
        new DownloadCompanyTemplateUseCase(writer, async () => {
          const [cts, inds] = await Promise.all([
            prisma.customer_types.findMany({
              where: { deleted_at: null, is_active: true },
              select: { name: true },
              orderBy: { name: 'asc' },
            }),
            prisma.industries.findMany({
              where: { deleted_at: null, is_active: true },
              select: { name: true },
              orderBy: { name: 'asc' },
            }),
          ]);
          return {
            customerTypes: cts.map((c) => c.name),
            industries: inds.map((i) => i.name),
            statuses: ['Active', 'Inactive'],
          };
        }),
    },
    {
      provide: PreviewCompanyImportUseCase,
      inject: [
        FileInspectionService,
        STORAGE_TOKENS.FileStoragePort,
        DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY,
        CompanyImportHandler,
      ],
      useFactory: (
        fileInspection: FileInspectionService,
        fileStorage: FileStoragePort,
        jobRepo: TransferJobRepository,
        importHandler: CompanyImportHandler,
      ) => new PreviewCompanyImportUseCase(fileInspection, fileStorage, jobRepo, importHandler),
    },
    {
      provide: ConfirmCompanyImportUseCase,
      inject: [
        DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY,
        DATA_TRANSFER_TOKENS.JOB_QUEUE,
      ],
      useFactory: (
        jobRepo: TransferJobRepository,
        jobQueue: JobQueuePort,
      ) => new ConfirmCompanyImportUseCase(jobRepo, jobQueue),
    },
    {
      provide: ExportCompaniesUseCase,
      inject: [
        DATA_TRANSFER_TOKENS.TRANSFER_JOB_REPOSITORY,
        CompanyExportSource,
      ],
      useFactory: (
        jobRepo: TransferJobRepository,
        exportSource: CompanyExportSource,
      ) => new ExportCompaniesUseCase(jobRepo, exportSource),
    },
  ],
  exports: [
    COMPANY_REPOSITORY_PORT_TOKEN,
    PERSON_REPOSITORY_PORT_TOKEN,
    CompanyExportSource,
    CompanyImportHandler,
  ],
})
export class CrmModule implements OnModuleInit {
  constructor(
    @Inject(DataTransferRegistry)
    private readonly registry: DataTransferRegistry,
    @Inject(CompanyImportHandler)
    private readonly importHandler: CompanyImportHandler,
    @Inject(CompanyExportSource)
    private readonly exportSource: CompanyExportSource,
  ) {}

  onModuleInit() {
    this.registry.registerImportHandler(this.importHandler);
    this.registry.registerExportSource(this.exportSource);
  }
}
