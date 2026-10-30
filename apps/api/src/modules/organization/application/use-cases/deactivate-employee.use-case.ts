import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { RoleRepositoryPort } from '../ports/role.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import { OrganizationPolicyService } from '../../domain/services/organization-policy.service';
import {
  NotFoundDomainError,
  ValidationDomainError,
} from '../../domain/errors/organization.errors';

export interface DeactivateEmployeeCommand {
  id: number;
  termination_date: Date | string;
  reason: string;
  notes?: string;
  acting_admin_id: number;
}

export class DeactivateEmployeeUseCase {
  constructor(
    private readonly employeeRepo: EmployeeRepositoryPort,
    private readonly roleRepo: RoleRepositoryPort,
  ) {}

  async execute(command: DeactivateEmployeeCommand): Promise<Employee> {
    const employee = await this.employeeRepo.findById(command.id);
    if (!employee) {
      throw new NotFoundDomainError('Employee', command.id);
    }

    OrganizationPolicyService.validateSelfModification(command.acting_admin_id, command.id, {
      status: 'Inactive',
    });

    const currentRole = employee.role_id ? await this.roleRepo.findById(employee.role_id) : null;
    const isCurrentAdmin = currentRole?.is_admin === true;
    if (isCurrentAdmin && employee.status === 'Active') {
      const activeAdminCount = await this.employeeRepo.countActiveAdmins();
      OrganizationPolicyService.validateLastAdminDemotion(
        isCurrentAdmin,
        employee.status,
        activeAdminCount,
        'Inactive',
        false,
      );
    }

    const trimmedReason = command.reason?.trim();
    if (!trimmedReason) {
      throw new ValidationDomainError('Deactivation reason is required', 'reason');
    }

    if (trimmedReason.toLowerCase() === 'other' && (!command.notes || !command.notes.trim())) {
      throw new ValidationDomainError('Notes are required when Reason is "Other"', 'notes');
    }

    const parsedTerminationDate = new Date(command.termination_date);
    if (isNaN(parsedTerminationDate.getTime())) {
      throw new ValidationDomainError('Invalid termination date format', 'termination_date');
    }

    const deactivated = await this.employeeRepo.deactivate(command.id, {
      termination_date: parsedTerminationDate,
      reason: trimmedReason,
      notes: command.notes?.trim(),
      deactivated_by: command.acting_admin_id,
    });

    await this.employeeRepo.addHistory({
      emp_id: command.id,
      event_type: 'DEACTIVATED',
      title: `Employee deactivated (${trimmedReason})`,
      effective_date: parsedTerminationDate,
      reason: trimmedReason,
      notes: command.notes?.trim() || null,
      created_by: command.acting_admin_id,
    });

    return deactivated;
  }
}
