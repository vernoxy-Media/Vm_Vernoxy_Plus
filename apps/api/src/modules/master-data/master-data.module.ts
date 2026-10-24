import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IndustryController } from './presentation/controllers/industry.controller';
import { CustomerTypeController } from './presentation/controllers/customer-type.controller';
import { LookupController } from './presentation/controllers/lookup.controller';
import { OrganizationAdminGuard } from './presentation/guards/organization-admin.guard';
import { CompanyAdminGuard } from './presentation/guards/company-admin.guard';

// Ports
import {
  INDUSTRY_REPOSITORY_PORT,
  IndustryRepositoryPort,
} from './application/ports/industry.repository.port';
import {
  CUSTOMER_TYPE_REPOSITORY_PORT,
  CustomerTypeRepositoryPort,
} from './application/ports/customer-type.repository.port';
import {
  MASTER_LOOKUP_REPOSITORY_PORT,
  MasterLookupRepositoryPort,
} from './application/ports/master-lookup.repository.port';
import {
  MASTER_DATA_ACCESS_POLICY_PORT_TOKEN,
} from './application/ports/access-policy.port';

// Adapters & Repositories
import { PrismaIndustryRepository } from './infrastructure/persistence/prisma-industry.repository';
import { PrismaCustomerTypeRepository } from './infrastructure/persistence/prisma-customer-type.repository';
import { PrismaMasterLookupRepository } from './infrastructure/persistence/prisma-master-lookup.repository';
import { MasterDataAuthAccessPolicyAdapter } from './infrastructure/adapters/auth-access-policy.adapter';

// Use Cases
import { ListIndustriesUseCase } from './application/use-cases/list-industries.use-case';
import { GetIndustryOptionsUseCase } from './application/use-cases/get-industry-options.use-case';
import { GetIndustryByIdUseCase } from './application/use-cases/get-industry-by-id.use-case';
import { CreateIndustryUseCase } from './application/use-cases/create-industry.use-case';
import { UpdateIndustryUseCase } from './application/use-cases/update-industry.use-case';
import { DeleteIndustryUseCase } from './application/use-cases/delete-industry.use-case';

import { ListCustomerTypesUseCase } from './application/use-cases/list-customer-types.use-case';
import { GetCustomerTypeOptionsUseCase } from './application/use-cases/get-customer-type-options.use-case';
import { GetCustomerTypeByIdUseCase } from './application/use-cases/get-customer-type-by-id.use-case';
import { CreateCustomerTypeUseCase } from './application/use-cases/create-customer-type.use-case';
import { UpdateCustomerTypeUseCase } from './application/use-cases/update-customer-type.use-case';
import { DeleteCustomerTypeUseCase } from './application/use-cases/delete-customer-type.use-case';

import { GetLookupOptionsUseCase } from './application/use-cases/get-lookup-options.use-case';
import { ListLookupsUseCase } from './application/use-cases/list-lookups.use-case';
import { CreateLookupUseCase } from './application/use-cases/create-lookup.use-case';
import { UpdateLookupUseCase } from './application/use-cases/update-lookup.use-case';
import { DeleteLookupUseCase } from './application/use-cases/delete-lookup.use-case';

// Public API
import {
  MASTER_DATA_PUBLIC_API_TOKEN,
  MasterDataPublicApiService,
} from './public-api';

@Module({
  imports: [AuthModule],
  controllers: [IndustryController, CustomerTypeController, LookupController],
  providers: [
    // Repositories
    {
      provide: INDUSTRY_REPOSITORY_PORT,
      useClass: PrismaIndustryRepository,
    },
    {
      provide: CUSTOMER_TYPE_REPOSITORY_PORT,
      useClass: PrismaCustomerTypeRepository,
    },
    {
      provide: MASTER_LOOKUP_REPOSITORY_PORT,
      useClass: PrismaMasterLookupRepository,
    },
    // Access Policy
    {
      provide: MASTER_DATA_ACCESS_POLICY_PORT_TOKEN,
      useClass: MasterDataAuthAccessPolicyAdapter,
    },
    // Guards
    OrganizationAdminGuard,
    CompanyAdminGuard,

    // Industry Use Cases
    {
      provide: ListIndustriesUseCase,
      inject: [INDUSTRY_REPOSITORY_PORT],
      useFactory: (repo: IndustryRepositoryPort) => new ListIndustriesUseCase(repo),
    },
    {
      provide: GetIndustryOptionsUseCase,
      inject: [INDUSTRY_REPOSITORY_PORT],
      useFactory: (repo: IndustryRepositoryPort) => new GetIndustryOptionsUseCase(repo),
    },
    {
      provide: GetIndustryByIdUseCase,
      inject: [INDUSTRY_REPOSITORY_PORT],
      useFactory: (repo: IndustryRepositoryPort) => new GetIndustryByIdUseCase(repo),
    },
    {
      provide: CreateIndustryUseCase,
      inject: [INDUSTRY_REPOSITORY_PORT],
      useFactory: (repo: IndustryRepositoryPort) => new CreateIndustryUseCase(repo),
    },
    {
      provide: UpdateIndustryUseCase,
      inject: [INDUSTRY_REPOSITORY_PORT],
      useFactory: (repo: IndustryRepositoryPort) => new UpdateIndustryUseCase(repo),
    },
    {
      provide: DeleteIndustryUseCase,
      inject: [INDUSTRY_REPOSITORY_PORT],
      useFactory: (repo: IndustryRepositoryPort) => new DeleteIndustryUseCase(repo),
    },

    // Customer Type Use Cases
    {
      provide: ListCustomerTypesUseCase,
      inject: [CUSTOMER_TYPE_REPOSITORY_PORT],
      useFactory: (repo: CustomerTypeRepositoryPort) => new ListCustomerTypesUseCase(repo),
    },
    {
      provide: GetCustomerTypeOptionsUseCase,
      inject: [CUSTOMER_TYPE_REPOSITORY_PORT],
      useFactory: (repo: CustomerTypeRepositoryPort) => new GetCustomerTypeOptionsUseCase(repo),
    },
    {
      provide: GetCustomerTypeByIdUseCase,
      inject: [CUSTOMER_TYPE_REPOSITORY_PORT],
      useFactory: (repo: CustomerTypeRepositoryPort) => new GetCustomerTypeByIdUseCase(repo),
    },
    {
      provide: CreateCustomerTypeUseCase,
      inject: [CUSTOMER_TYPE_REPOSITORY_PORT],
      useFactory: (repo: CustomerTypeRepositoryPort) => new CreateCustomerTypeUseCase(repo),
    },
    {
      provide: UpdateCustomerTypeUseCase,
      inject: [CUSTOMER_TYPE_REPOSITORY_PORT],
      useFactory: (repo: CustomerTypeRepositoryPort) => new UpdateCustomerTypeUseCase(repo),
    },
    {
      provide: DeleteCustomerTypeUseCase,
      inject: [CUSTOMER_TYPE_REPOSITORY_PORT],
      useFactory: (repo: CustomerTypeRepositoryPort) => new DeleteCustomerTypeUseCase(repo),
    },

    // Lookup Use Cases
    {
      provide: GetLookupOptionsUseCase,
      inject: [MASTER_LOOKUP_REPOSITORY_PORT],
      useFactory: (repo: MasterLookupRepositoryPort) => new GetLookupOptionsUseCase(repo),
    },
    {
      provide: ListLookupsUseCase,
      inject: [MASTER_LOOKUP_REPOSITORY_PORT],
      useFactory: (repo: MasterLookupRepositoryPort) => new ListLookupsUseCase(repo),
    },
    {
      provide: CreateLookupUseCase,
      inject: [MASTER_LOOKUP_REPOSITORY_PORT],
      useFactory: (repo: MasterLookupRepositoryPort) => new CreateLookupUseCase(repo),
    },
    {
      provide: UpdateLookupUseCase,
      inject: [MASTER_LOOKUP_REPOSITORY_PORT],
      useFactory: (repo: MasterLookupRepositoryPort) => new UpdateLookupUseCase(repo),
    },
    {
      provide: DeleteLookupUseCase,
      inject: [MASTER_LOOKUP_REPOSITORY_PORT],
      useFactory: (repo: MasterLookupRepositoryPort) => new DeleteLookupUseCase(repo),
    },

    // Public API
    {
      provide: MASTER_DATA_PUBLIC_API_TOKEN,
      useClass: MasterDataPublicApiService,
    },
  ],
  exports: [
    INDUSTRY_REPOSITORY_PORT,
    CUSTOMER_TYPE_REPOSITORY_PORT,
    MASTER_LOOKUP_REPOSITORY_PORT,
    MASTER_DATA_PUBLIC_API_TOKEN,
  ],
})
export class MasterDataModule {}
