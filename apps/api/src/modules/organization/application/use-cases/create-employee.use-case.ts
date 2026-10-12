import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { DepartmentRepositoryPort } from '../ports/department.repository.port';
import { RoleRepositoryPort } from '../ports/role.repository.port';
import { CredentialProvisionerPort } from '../ports/credential-provisioner.port';
import { UnitOfWorkPort } from '../ports/unit-of-work.port';
import { Employee } from '../../domain/entities/employee.entity';
import { OrganizationNormalizationService } from '../../domain/services/organization-normalization.service';
import { OrganizationPolicyService } from '../../domain/services/organization-policy.service';
import {
  NotFoundDomainError,
  ConflictDomainError,
  UnprocessableDomainError,
  ValidationDomainError,
} from '../../domain/errors/organization.errors';

export interface CreateEmployeeCommand {
  name: string;
  email: string;
  mob?: string;
  password: string;
  dep_id: number;
  role_id?: number | null;
  reporting_manager?: number | null;
  joining_date: Date | string;
  acting_admin_id: number;
}

export class CreateEmployeeUseCase {
  constructor(
    private readonly employeeRepo: EmployeeRepositoryPort,
    private readonly departmentRepo: DepartmentRepositoryPort,
    private readonly roleRepo: RoleRepositoryPort,
    private readonly credentialProvisioner: CredentialProvisionerPort,
    private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(command: CreateEmployeeCommand): Promise<Employee> {
    const trimmedName = command.name?.trim();
    if (!trimmedName) {
      throw new ValidationDomainError('Employee name is required', 'name');
    }

    const normalizedEmail = OrganizationNormalizationService.normalizeEmail(command.email);
    let normalizedMob: string;
    if (command.mob && command.mob.trim()) {
      normalizedMob = OrganizationNormalizationService.normalizeMobile(command.mob);
    } else {
      normalizedMob = `+9100${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    OrganizationNormalizationService.validatePassword(command.password, {
      name: trimmedName,
      email: normalizedEmail,
    });

    const parsedJoiningDate = new Date(command.joining_date);
    if (isNaN(parsedJoiningDate.getTime())) {
      throw new ValidationDomainError('Invalid joining date format', 'joining_date');
    }

    const department = await this.departmentRepo.findById(command.dep_id);
    if (!department) {
      throw new NotFoundDomainError('Department', command.dep_id);
    }
    if (!department.is_active) {
      throw new UnprocessableDomainError(
        'DEPARTMENT_INACTIVE',
        'Cannot assign employee to an inactive department',
        'dep_id',
      );
    }

    let assignedRoleId: number | null = null;
    if (command.role_id) {
      const role = await this.roleRepo.findById(command.role_id);
      if (!role) {
        throw new NotFoundDomainError('Role', command.role_id);
      }
      if (!role.is_active) {
        throw new UnprocessableDomainError(
          'ROLE_INACTIVE',
          'Cannot assign employee to an inactive role',
          'role_id',
        );
      }

      OrganizationPolicyService.validateRoleBelongsToDepartment(role.dep_id, command.dep_id);
      assignedRoleId = role.role_id;
    }

    if (command.reporting_manager) {
      const manager = await this.employeeRepo.findById(command.reporting_manager);
      if (!manager) {
        throw new NotFoundDomainError('Reporting Manager', command.reporting_manager);
      }
      if (manager.status !== 'Active') {
        throw new UnprocessableDomainError(
          'MANAGER_INACTIVE',
          'Reporting manager must be an active employee',
          'reporting_manager',
        );
      }
    }

    const existingEmail = await this.employeeRepo.findByEmail(normalizedEmail);
    if (existingEmail) {
      throw new ConflictDomainError('EMAIL_EXISTS', 'An employee with this email already exists', 'email');
    }

    if (command.mob && command.mob.trim()) {
      const existingMob = await this.employeeRepo.findByMobile(normalizedMob);
      if (existingMob) {
        throw new ConflictDomainError(
          'MOBILE_EXISTS',
          'An employee with this mobile number already exists',
          'mob',
        );
      }
    }

    return this.unitOfWork.run(async (tx) => {
      const created = await this.employeeRepo.create(
        {
          name: trimmedName,
          email: normalizedEmail,
          mob: normalizedMob,
          dep_id: command.dep_id,
          role_id: assignedRoleId,
          reporting_manager: command.reporting_manager || null,
          joining_date: parsedJoiningDate,
          created_by: command.acting_admin_id,
        },
        tx,
      );

      await this.credentialProvisioner.provision(
        {
          emp_id: created.emp_id,
          password: command.password,
          actor_emp_id: command.acting_admin_id,
        },
        tx,
      );

      return created;
    });
  }
}
