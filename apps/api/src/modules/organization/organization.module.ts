import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/public-api';
import { DepartmentController } from './presentation/controllers/department.controller';
import { RoleController } from './presentation/controllers/role.controller';
import { EmployeeController } from './presentation/controllers/employee.controller';
import { OrganizationAdminGuard } from './presentation/guards/organization-admin.guard';
import {
  ORGANIZATION_PUBLIC_API_TOKEN,
  OrganizationPublicApiService,
} from './public-api';

// Ports tokens
import {
  DEPARTMENT_REPOSITORY_TOKEN,
  DepartmentRepositoryPort,
} from './application/ports/department.repository.port';
import {
  ROLE_REPOSITORY_TOKEN,
  RoleRepositoryPort,
} from './application/ports/role.repository.port';
import {
  EMPLOYEE_REPOSITORY_TOKEN,
  EmployeeRepositoryPort,
} from './application/ports/employee.repository.port';
import {
  UNIT_OF_WORK_TOKEN,
  UnitOfWorkPort,
} from './application/ports/unit-of-work.port';
import {
  CREDENTIAL_PROVISIONER_PORT_TOKEN,
  CredentialProvisionerPort,
} from './application/ports/credential-provisioner.port';
import {
  ACCESS_POLICY_PORT_TOKEN,
  AccessPolicyPort,
} from './application/ports/access-policy.port';
import {
  EMPLOYEE_PHOTO_STORAGE_TOKEN,
  EmployeePhotoStoragePort,
} from './application/ports/employee-photo-storage.port';

// Repositories & Adapters
import { PrismaDepartmentRepository } from './infrastructure/persistence/prisma-department.repository';
import { PrismaRoleRepository } from './infrastructure/persistence/prisma-role.repository';
import { PrismaEmployeeRepository } from './infrastructure/persistence/prisma-employee.repository';
import { PrismaUnitOfWork } from './infrastructure/persistence/prisma-unit-of-work';
import { AuthCredentialProvisionerAdapter } from './infrastructure/adapters/auth-credential-provisioner.adapter';
import { AuthAccessPolicyAdapter } from './infrastructure/adapters/auth-access-policy.adapter';
import { EmployeePhotoStorageAdapter } from './infrastructure/adapters/employee-photo-storage.adapter';

// Use Cases
import { ListDepartmentsUseCase } from './application/use-cases/list-departments.use-case';
import { GetDepartmentOptionsUseCase } from './application/use-cases/get-department-options.use-case';
import { GetDepartmentByIdUseCase } from './application/use-cases/get-department-by-id.use-case';
import { CreateDepartmentUseCase } from './application/use-cases/create-department.use-case';
import { UpdateDepartmentUseCase } from './application/use-cases/update-department.use-case';
import { DeleteDepartmentUseCase } from './application/use-cases/delete-department.use-case';

import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { GetRoleOptionsUseCase } from './application/use-cases/get-role-options.use-case';
import { GetRoleByIdUseCase } from './application/use-cases/get-role-by-id.use-case';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { UpdateRoleUseCase } from './application/use-cases/update-role.use-case';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case';

import { ListEmployeesUseCase } from './application/use-cases/list-employees.use-case';
import { GetEmployeeOptionsUseCase } from './application/use-cases/get-employee-options.use-case';
import { GetEmployeeByIdUseCase } from './application/use-cases/get-employee-by-id.use-case';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.use-case';
import { UpdateEmployeeUseCase } from './application/use-cases/update-employee.use-case';
import { DeleteEmployeeUseCase } from './application/use-cases/delete-employee.use-case';
import { UploadEmployeePhotoUseCase } from './application/use-cases/upload-employee-photo.use-case';
import { RemoveEmployeePhotoUseCase } from './application/use-cases/remove-employee-photo.use-case';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [DepartmentController, RoleController, EmployeeController],
  providers: [
    // Ports Implementations
    {
      provide: DEPARTMENT_REPOSITORY_TOKEN,
      useClass: PrismaDepartmentRepository,
    },
    {
      provide: ROLE_REPOSITORY_TOKEN,
      useClass: PrismaRoleRepository,
    },
    {
      provide: EMPLOYEE_REPOSITORY_TOKEN,
      useClass: PrismaEmployeeRepository,
    },
    {
      provide: UNIT_OF_WORK_TOKEN,
      useClass: PrismaUnitOfWork,
    },
    {
      provide: CREDENTIAL_PROVISIONER_PORT_TOKEN,
      useClass: AuthCredentialProvisionerAdapter,
    },
    {
      provide: ACCESS_POLICY_PORT_TOKEN,
      useClass: AuthAccessPolicyAdapter,
    },
    {
      provide: EMPLOYEE_PHOTO_STORAGE_TOKEN,
      useClass: EmployeePhotoStorageAdapter,
    },

    // Guards
    OrganizationAdminGuard,

    // Department Use Cases
    {
      provide: ListDepartmentsUseCase,
      inject: [DEPARTMENT_REPOSITORY_TOKEN],
      useFactory: (repo: DepartmentRepositoryPort) => new ListDepartmentsUseCase(repo),
    },
    {
      provide: GetDepartmentOptionsUseCase,
      inject: [DEPARTMENT_REPOSITORY_TOKEN],
      useFactory: (repo: DepartmentRepositoryPort) => new GetDepartmentOptionsUseCase(repo),
    },
    {
      provide: GetDepartmentByIdUseCase,
      inject: [DEPARTMENT_REPOSITORY_TOKEN],
      useFactory: (repo: DepartmentRepositoryPort) => new GetDepartmentByIdUseCase(repo),
    },
    {
      provide: CreateDepartmentUseCase,
      inject: [DEPARTMENT_REPOSITORY_TOKEN],
      useFactory: (repo: DepartmentRepositoryPort) => new CreateDepartmentUseCase(repo),
    },
    {
      provide: UpdateDepartmentUseCase,
      inject: [DEPARTMENT_REPOSITORY_TOKEN],
      useFactory: (repo: DepartmentRepositoryPort) => new UpdateDepartmentUseCase(repo),
    },
    {
      provide: DeleteDepartmentUseCase,
      inject: [DEPARTMENT_REPOSITORY_TOKEN],
      useFactory: (repo: DepartmentRepositoryPort) => new DeleteDepartmentUseCase(repo),
    },

    // Role Use Cases
    {
      provide: ListRolesUseCase,
      inject: [ROLE_REPOSITORY_TOKEN],
      useFactory: (repo: RoleRepositoryPort) => new ListRolesUseCase(repo),
    },
    {
      provide: GetRoleOptionsUseCase,
      inject: [ROLE_REPOSITORY_TOKEN],
      useFactory: (repo: RoleRepositoryPort) => new GetRoleOptionsUseCase(repo),
    },
    {
      provide: GetRoleByIdUseCase,
      inject: [ROLE_REPOSITORY_TOKEN],
      useFactory: (repo: RoleRepositoryPort) => new GetRoleByIdUseCase(repo),
    },
    {
      provide: CreateRoleUseCase,
      inject: [ROLE_REPOSITORY_TOKEN, DEPARTMENT_REPOSITORY_TOKEN],
      useFactory: (rRepo: RoleRepositoryPort, dRepo: DepartmentRepositoryPort) =>
        new CreateRoleUseCase(rRepo, dRepo),
    },
    {
      provide: UpdateRoleUseCase,
      inject: [ROLE_REPOSITORY_TOKEN],
      useFactory: (repo: RoleRepositoryPort) => new UpdateRoleUseCase(repo),
    },
    {
      provide: DeleteRoleUseCase,
      inject: [ROLE_REPOSITORY_TOKEN],
      useFactory: (repo: RoleRepositoryPort) => new DeleteRoleUseCase(repo),
    },

    // Employee Use Cases
    {
      provide: ListEmployeesUseCase,
      inject: [EMPLOYEE_REPOSITORY_TOKEN],
      useFactory: (repo: EmployeeRepositoryPort) => new ListEmployeesUseCase(repo),
    },
    {
      provide: GetEmployeeOptionsUseCase,
      inject: [EMPLOYEE_REPOSITORY_TOKEN],
      useFactory: (repo: EmployeeRepositoryPort) => new GetEmployeeOptionsUseCase(repo),
    },
    {
      provide: GetEmployeeByIdUseCase,
      inject: [EMPLOYEE_REPOSITORY_TOKEN],
      useFactory: (repo: EmployeeRepositoryPort) => new GetEmployeeByIdUseCase(repo),
    },
    {
      provide: CreateEmployeeUseCase,
      inject: [
        EMPLOYEE_REPOSITORY_TOKEN,
        DEPARTMENT_REPOSITORY_TOKEN,
        ROLE_REPOSITORY_TOKEN,
        CREDENTIAL_PROVISIONER_PORT_TOKEN,
        UNIT_OF_WORK_TOKEN,
      ],
      useFactory: (
        eRepo: EmployeeRepositoryPort,
        dRepo: DepartmentRepositoryPort,
        rRepo: RoleRepositoryPort,
        cp: CredentialProvisionerPort,
        uow: UnitOfWorkPort,
      ) => new CreateEmployeeUseCase(eRepo, dRepo, rRepo, cp, uow),
    },
    {
      provide: UpdateEmployeeUseCase,
      inject: [
        EMPLOYEE_REPOSITORY_TOKEN,
        DEPARTMENT_REPOSITORY_TOKEN,
        ROLE_REPOSITORY_TOKEN,
      ],
      useFactory: (
        eRepo: EmployeeRepositoryPort,
        dRepo: DepartmentRepositoryPort,
        rRepo: RoleRepositoryPort,
      ) => new UpdateEmployeeUseCase(eRepo, dRepo, rRepo),
    },
    {
      provide: DeleteEmployeeUseCase,
      inject: [EMPLOYEE_REPOSITORY_TOKEN, ROLE_REPOSITORY_TOKEN],
      useFactory: (eRepo: EmployeeRepositoryPort, rRepo: RoleRepositoryPort) =>
        new DeleteEmployeeUseCase(eRepo, rRepo),
    },
    {
      provide: UploadEmployeePhotoUseCase,
      inject: [
        EMPLOYEE_REPOSITORY_TOKEN,
        EMPLOYEE_PHOTO_STORAGE_TOKEN,
        UNIT_OF_WORK_TOKEN,
      ],
      useFactory: (
        eRepo: EmployeeRepositoryPort,
        ps: EmployeePhotoStoragePort,
        uow: UnitOfWorkPort,
      ) => new UploadEmployeePhotoUseCase(eRepo, ps, uow),
    },
    {
      provide: RemoveEmployeePhotoUseCase,
      inject: [
        EMPLOYEE_REPOSITORY_TOKEN,
        EMPLOYEE_PHOTO_STORAGE_TOKEN,
        UNIT_OF_WORK_TOKEN,
      ],
      useFactory: (
        eRepo: EmployeeRepositoryPort,
        ps: EmployeePhotoStoragePort,
        uow: UnitOfWorkPort,
      ) => new RemoveEmployeePhotoUseCase(eRepo, ps, uow),
    },
    {
      provide: ORGANIZATION_PUBLIC_API_TOKEN,
      useClass: OrganizationPublicApiService,
    },
  ],
  exports: [
    DEPARTMENT_REPOSITORY_TOKEN,
    ROLE_REPOSITORY_TOKEN,
    EMPLOYEE_REPOSITORY_TOKEN,
    ORGANIZATION_PUBLIC_API_TOKEN,
  ],
})
export class OrganizationModule {}
