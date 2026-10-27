import { CreateEmployeeUseCase } from './create-employee.use-case';
import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { DepartmentRepositoryPort } from '../ports/department.repository.port';
import { RoleRepositoryPort } from '../ports/role.repository.port';
import { CredentialProvisionerPort } from '../ports/credential-provisioner.port';
import { UnitOfWorkPort } from '../ports/unit-of-work.port';
import {
  ConflictDomainError,
  UnprocessableDomainError,
  NotFoundDomainError,
} from '../../domain/errors/organization.errors';

describe('CreateEmployeeUseCase', () => {
  let useCase: CreateEmployeeUseCase;
  let employeeRepo: jest.Mocked<EmployeeRepositoryPort>;
  let departmentRepo: jest.Mocked<DepartmentRepositoryPort>;
  let roleRepo: jest.Mocked<RoleRepositoryPort>;
  let credentialProvisioner: jest.Mocked<CredentialProvisionerPort>;
  let unitOfWork: jest.Mocked<UnitOfWorkPort>;

  beforeEach(() => {
    employeeRepo = {
      findMany: jest.fn(),
      findActiveOptions: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByMobile: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      getDirectReports: jest.fn(),
      getHistory: jest.fn(),
      addHistory: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn(),
      countActiveAdmins: jest.fn(),
      checkReportingCycle: jest.fn(),
    };


    departmentRepo = {
      findMany: jest.fn(),
      findActiveOptions: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveRolesOrEmployees: jest.fn(),
    };

    roleRepo = {
      findMany: jest.fn(),
      findActiveOptionsByDepartment: jest.fn(),
      findActiveOptionsByDepartments: jest.fn(),
      findById: jest.fn(),
      findByDepAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      hasActiveEmployees: jest.fn(),
    };

    credentialProvisioner = {
      provision: jest.fn(),
    };

    unitOfWork = {
      run: jest.fn().mockImplementation((fn) => fn({})),
    };

    useCase = new CreateEmployeeUseCase(
      employeeRepo,
      departmentRepo,
      roleRepo,
      credentialProvisioner,
      unitOfWork,
    );
  });

  const validCommand = {
    name: 'Alice Johnson',
    email: 'alice@vernoxy.com',
    mob: '+919876543210',
    password: 'SecureP@ssw0rd2026!',
    dep_id: 1,
    role_id: 2,
    joining_date: '2026-10-01',
    acting_admin_id: 1,
  };

  it('successfully creates employee and provisions credentials atomically', async () => {
    departmentRepo.findById.mockResolvedValue({
      dep_id: 1,
      name: 'Engineering',
      is_active: true,
      created_at: new Date(),
      created_by: null,
      updated_at: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    });

    roleRepo.findById.mockResolvedValue({
      role_id: 2,
      role_name: 'Developer',
      dep_id: 1,
      description: null,
      is_active: true,
      is_admin: false,
      created_at: new Date(),
      created_by: null,
      updated_at: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    });

    employeeRepo.findByEmail.mockResolvedValue(null);
    employeeRepo.findByMobile.mockResolvedValue(null);

    const createdEmp = {
      emp_id: 10,
      ...validCommand,
      mob: '+919876543210',
      status: 'Active' as const,
      joining_date: new Date('2026-10-01'),
      exit_date: null,
      reporting_manager: null,
      created_at: new Date(),
      created_by: 1,
      updated_at: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    };

    employeeRepo.create.mockResolvedValue(createdEmp);

    const result = await useCase.execute(validCommand);

    expect(result.emp_id).toBe(10);
    expect(employeeRepo.create).toHaveBeenCalled();
    expect(credentialProvisioner.provision).toHaveBeenCalledWith(
      expect.objectContaining({
        emp_id: 10,
        password: 'SecureP@ssw0rd2026!',
        actor_emp_id: 1,
      }),
      expect.anything(),
    );
  });

  it('rejects if role does not belong to the selected department', async () => {
    departmentRepo.findById.mockResolvedValue({
      dep_id: 1,
      name: 'Engineering',
      is_active: true,
      created_at: new Date(),
      created_by: null,
      updated_at: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    });

    roleRepo.findById.mockResolvedValue({
      role_id: 2,
      role_name: 'Sales Exec',
      dep_id: 2, // Belongs to dep 2, not 1!
      description: null,
      is_active: true,
      is_admin: false,
      created_at: new Date(),
      created_by: null,
      updated_at: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    });

    await expect(useCase.execute(validCommand)).rejects.toThrow(UnprocessableDomainError);
  });

  it('rejects if email already exists', async () => {
    departmentRepo.findById.mockResolvedValue({
      dep_id: 1,
      name: 'Engineering',
      is_active: true,
      created_at: new Date(),
      created_by: null,
      updated_at: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    });

    roleRepo.findById.mockResolvedValue({
      role_id: 2,
      role_name: 'Developer',
      dep_id: 1,
      description: null,
      is_active: true,
      is_admin: false,
      created_at: new Date(),
      created_by: null,
      updated_at: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    });

    employeeRepo.findByEmail.mockResolvedValue({
      emp_id: 99,
      name: 'Existing',
      email: 'alice@vernoxy.com',
      mob: '+910000000000',
      dep_id: 1,
      role_id: 2,
      reporting_manager: null,
      status: 'Active',
      joining_date: new Date(),
      exit_date: null,
      created_at: new Date(),
      created_by: null,
      updated_at: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    });

    await expect(useCase.execute(validCommand)).rejects.toThrow(ConflictDomainError);
  });
});
