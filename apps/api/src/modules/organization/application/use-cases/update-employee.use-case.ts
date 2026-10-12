import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { DepartmentRepositoryPort } from '../ports/department.repository.port';
import { RoleRepositoryPort } from '../ports/role.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import { OrganizationNormalizationService } from '../../domain/services/organization-normalization.service';
import { OrganizationPolicyService } from '../../domain/services/organization-policy.service';
import {
  NotFoundDomainError,
  ConflictDomainError,
  UnprocessableDomainError,
  ValidationDomainError,
} from '../../domain/errors/organization.errors';

export interface UpdateEmployeeCommand {
  id: number;
  name?: string;
  mob?: string;
  dep_id?: number;
  role_id?: number | null;
  reporting_manager?: number | null;
  joining_date?: Date | string;
  exit_date?: Date | string | null;
  status?: 'Active' | 'Inactive';
  acting_admin_id: number;
}

export class UpdateEmployeeUseCase {
  constructor(
    private readonly employeeRepo: EmployeeRepositoryPort,
    private readonly departmentRepo: DepartmentRepositoryPort,
    private readonly roleRepo: RoleRepositoryPort,
  ) {}

  async execute(command: UpdateEmployeeCommand): Promise<Employee> {
    const employee = await this.employeeRepo.findById(command.id);
    if (!employee) {
      throw new NotFoundDomainError('Employee', command.id);
    }

    OrganizationPolicyService.validateSelfModification(command.acting_admin_id, command.id, {
      dep_id: command.dep_id,
      role_id: command.role_id,
      status: command.status,
    });

    let trimmedName: string | undefined;
    if (command.name !== undefined) {
      trimmedName = command.name.trim();
      if (!trimmedName) {
        throw new ValidationDomainError('Employee name cannot be empty', 'name');
      }
    }

    let normalizedMob: string | undefined;
    if (command.mob !== undefined) {
      normalizedMob = OrganizationNormalizationService.normalizeMobile(command.mob);
      if (normalizedMob !== employee.mob) {
        const existingMob = await this.employeeRepo.findByMobile(normalizedMob);
        if (existingMob && existingMob.emp_id !== command.id) {
          throw new ConflictDomainError(
            'MOBILE_EXISTS',
            'An employee with this mobile number already exists',
            'mob',
          );
        }
      }
    }

    const targetDepId = command.dep_id !== undefined ? command.dep_id : employee.dep_id;
    const targetRoleId = command.role_id !== undefined ? command.role_id : employee.role_id;

    let targetRole = targetRoleId && employee.role_id === targetRoleId
      ? null
      : targetRoleId
        ? await this.roleRepo.findById(targetRoleId)
        : null;

    if (command.dep_id !== undefined || command.role_id !== undefined) {
      const department = await this.departmentRepo.findById(targetDepId);
      if (!department) {
        throw new NotFoundDomainError('Department', targetDepId);
      }
      if (!department.is_active) {
        throw new UnprocessableDomainError(
          'DEPARTMENT_INACTIVE',
          'Cannot assign employee to an inactive department',
          'dep_id',
        );
      }

      if (targetRoleId) {
        if (!targetRole) {
          targetRole = await this.roleRepo.findById(targetRoleId);
        }
        if (!targetRole) {
          throw new NotFoundDomainError('Role', targetRoleId);
        }
        if (!targetRole.is_active) {
          throw new UnprocessableDomainError(
            'ROLE_INACTIVE',
            'Cannot assign employee to an inactive role',
            'role_id',
          );
        }

        OrganizationPolicyService.validateRoleBelongsToDepartment(targetRole.dep_id, targetDepId);
      }
    }

    if (command.reporting_manager !== undefined && command.reporting_manager !== null) {
      if (command.reporting_manager === command.id) {
        throw new ConflictDomainError(
          'REPORTING_CYCLE_DETECTED',
          'An employee cannot report to themselves',
          'reporting_manager',
        );
      }

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

      const isCycle = await this.employeeRepo.checkReportingCycle(command.id, command.reporting_manager);
      if (isCycle) {
        throw new ConflictDomainError(
          'REPORTING_CYCLE_DETECTED',
          'Cycle detected in reporting hierarchy',
          'reporting_manager',
        );
      }
    }

    // Last admin protection check
    const currentRole = employee.role_id ? await this.roleRepo.findById(employee.role_id) : null;
    const isCurrentAdmin = currentRole?.is_admin === true;
    const isTargetAdmin = targetRole ? targetRole.is_admin : (command.role_id === null ? false : isCurrentAdmin);

    if (isCurrentAdmin && employee.status === 'Active') {
      const proposedStatus = command.status ?? employee.status;
      const proposedIsAdmin = isTargetAdmin;
      if (proposedStatus === 'Inactive' || !proposedIsAdmin) {
        const activeAdminCount = await this.employeeRepo.countActiveAdmins();
        OrganizationPolicyService.validateLastAdminDemotion(
          isCurrentAdmin,
          employee.status,
          activeAdminCount,
          proposedStatus,
          proposedIsAdmin,
        );
      }
    }

    let parsedJoiningDate: Date | undefined;
    if (command.joining_date !== undefined) {
      parsedJoiningDate = new Date(command.joining_date);
      if (isNaN(parsedJoiningDate.getTime())) {
        throw new ValidationDomainError('Invalid joining date format', 'joining_date');
      }
    }

    let parsedExitDate: Date | null | undefined;
    if (command.exit_date !== undefined) {
      if (command.exit_date === null) {
        parsedExitDate = null;
      } else {
        parsedExitDate = new Date(command.exit_date);
        if (isNaN(parsedExitDate.getTime())) {
          throw new ValidationDomainError('Invalid exit date format', 'exit_date');
        }
      }
    } else if (command.status === 'Inactive' && !employee.exit_date) {
      parsedExitDate = new Date();
    }

    return this.employeeRepo.update(command.id, {
      name: trimmedName,
      mob: normalizedMob,
      dep_id: command.dep_id,
      role_id: command.role_id,
      reporting_manager: command.reporting_manager,
      joining_date: parsedJoiningDate,
      exit_date: parsedExitDate,
      status: command.status,
      updated_by: command.acting_admin_id,
    });
  }
}
