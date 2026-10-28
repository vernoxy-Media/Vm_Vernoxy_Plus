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
  email?: string;
  mob?: string;
  dep_id?: number;
  department_ids?: number[];
  role_id?: number | null;
  reporting_manager?: number | null;
  joining_date?: Date | string;
  exit_date?: Date | string | null;
  status?: 'Active' | 'Inactive';
  gender_id?: number | null;
  personal_email?: string | null;
  office_email?: string | null;
  birth_date?: Date | string | null;
  blood_group?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  emergency_contact_relation?: string | null;
  employment_type_id?: number | null;
  salary?: number;
  pf?: number;
  ot_eligible?: boolean;
  ot_rate_type?: 'FIXED' | 'MULTIPLIER' | null;
  ot_rate?: number | null;
  ot_multiplier?: number | null;
  minimum_ot_per_day?: number;
  ot_paid_as?: 'SALARY' | 'COMP_OFF';
  pf_applicable?: boolean;
  uan?: string | null;
  employee_pf_pct?: number;
  employer_pf_pct?: number;
  payment_mode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  termination_date?: Date | string | null;
  deactivation_reason?: string | null;
  deactivation_notes?: string | null;
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

    if (command.salary !== undefined && command.salary < 0) {
      throw new ValidationDomainError('Salary cannot be negative', 'salary');
    }
    if (command.pf !== undefined && command.pf < 0) {
      throw new ValidationDomainError('PF cannot be negative', 'pf');
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

    let parsedBirthDate: Date | null | undefined;
    if (command.birth_date !== undefined) {
      if (command.birth_date === null) {
        parsedBirthDate = null;
      } else {
        parsedBirthDate = new Date(command.birth_date);
        if (isNaN(parsedBirthDate.getTime())) {
          throw new ValidationDomainError('Invalid birth date format', 'birth_date');
        }
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

    let parsedTerminationDate: Date | null | undefined;
    if (command.termination_date !== undefined) {
      if (command.termination_date === null) {
        parsedTerminationDate = null;
      } else {
        parsedTerminationDate = new Date(command.termination_date);
        if (isNaN(parsedTerminationDate.getTime())) {
          throw new ValidationDomainError('Invalid termination date format', 'termination_date');
        }
      }
    }

    // Record milestone events if critical fields changed
    const targetDepartmentIds = command.department_ids !== undefined
      ? command.department_ids
      : (employee.departments?.map((d) => d.dep_id) || [employee.dep_id]);

    if (command.role_id !== undefined && command.role_id !== employee.role_id && targetRole) {
      await this.employeeRepo.addHistory({
        emp_id: command.id,
        event_type: 'PROMOTION',
        title: `Designation updated to ${targetRole.role_name}`,
        department_ids: targetDepartmentIds,
        role_id: command.role_id,
        manager_id: command.reporting_manager !== undefined ? command.reporting_manager : employee.reporting_manager,
        effective_date: new Date(),
        reason: 'Role Change',
        created_by: command.acting_admin_id,
      });
    }

    if (command.dep_id !== undefined && command.dep_id !== employee.dep_id) {
      const newDep = await this.departmentRepo.findById(command.dep_id);
      await this.employeeRepo.addHistory({
        emp_id: command.id,
        event_type: 'TRANSFER',
        title: `Department transferred to ${newDep?.name ?? 'Department #' + command.dep_id}`,
        department_ids: targetDepartmentIds,
        role_id: command.role_id !== undefined ? command.role_id : employee.role_id,
        manager_id: command.reporting_manager !== undefined ? command.reporting_manager : employee.reporting_manager,
        effective_date: new Date(),
        reason: 'Department Transfer',
        created_by: command.acting_admin_id,
      });
    }

    if (command.salary !== undefined && Number(command.salary) !== Number(employee.salary)) {
      await this.employeeRepo.addHistory({
        emp_id: command.id,
        event_type: 'SALARY_REVISION',
        title: `Salary revised to ₹${command.salary.toLocaleString()}`,
        department_ids: targetDepartmentIds,
        salary: Number(command.salary),
        effective_date: new Date(),
        reason: 'Salary Revision',
        created_by: command.acting_admin_id,
      });
    }

    return this.employeeRepo.update(command.id, {
      name: trimmedName,
      email: command.email,
      mob: normalizedMob,
      dep_id: command.dep_id,
      department_ids: command.department_ids,
      role_id: command.role_id,
      reporting_manager: command.reporting_manager,
      joining_date: parsedJoiningDate,
      exit_date: parsedExitDate,
      status: command.status,
      gender_id: command.gender_id,
      personal_email: command.personal_email?.trim() || null,
      office_email: command.office_email?.trim() || null,
      birth_date: parsedBirthDate,
      blood_group: command.blood_group?.trim() || null,
      address: command.address?.trim() || null,
      emergency_contact_name: command.emergency_contact_name?.trim() || null,
      emergency_contact_number: command.emergency_contact_number?.trim() || null,
      emergency_contact_relation: command.emergency_contact_relation?.trim() || null,
      employment_type_id: command.employment_type_id,
      salary: command.salary !== undefined ? Number(command.salary) : undefined,
      pf: command.pf !== undefined ? Number(command.pf) : undefined,
      ot_eligible: command.ot_eligible,
      ot_rate_type: command.ot_rate_type,
      ot_rate: command.ot_rate !== undefined && command.ot_rate !== null ? Number(command.ot_rate) : command.ot_rate,
      ot_multiplier: command.ot_multiplier !== undefined && command.ot_multiplier !== null ? Number(command.ot_multiplier) : command.ot_multiplier,
      minimum_ot_per_day: command.minimum_ot_per_day !== undefined ? Number(command.minimum_ot_per_day) : undefined,
      ot_paid_as: command.ot_paid_as,
      pf_applicable: command.pf_applicable,
      uan: command.uan !== undefined ? (command.uan?.trim() || null) : undefined,
      employee_pf_pct: command.employee_pf_pct !== undefined ? Number(command.employee_pf_pct) : undefined,
      employer_pf_pct: command.employer_pf_pct !== undefined ? Number(command.employer_pf_pct) : undefined,
      payment_mode: command.payment_mode,
      bank_name: command.bank_name !== undefined ? (command.bank_name?.trim() || null) : undefined,
      account_number: command.account_number !== undefined ? (command.account_number?.trim() || null) : undefined,
      ifsc_code: command.ifsc_code !== undefined ? (command.ifsc_code?.trim() || null) : undefined,
      termination_date: parsedTerminationDate,
      deactivation_reason: command.deactivation_reason,
      deactivation_notes: command.deactivation_notes,
      updated_by: command.acting_admin_id,
    });
  }
}

