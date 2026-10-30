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
  department_ids?: number[];
  role_id?: number | null;
  reporting_manager?: number | null;
  joining_date: Date | string;
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

    let parsedBirthDate: Date | null = null;
    if (command.birth_date) {
      parsedBirthDate = new Date(command.birth_date);
      if (isNaN(parsedBirthDate.getTime())) {
        throw new ValidationDomainError('Invalid birth date format', 'birth_date');
      }
    }

    if (command.salary !== undefined && command.salary < 0) {
      throw new ValidationDomainError('Salary cannot be negative', 'salary');
    }
    if (command.pf !== undefined && command.pf < 0) {
      throw new ValidationDomainError('PF cannot be negative', 'pf');
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

    const allDepIds = Array.from(new Set([command.dep_id, ...(command.department_ids || [])]));

    return this.unitOfWork.run(async (tx) => {
      const created = await this.employeeRepo.create(
        {
          name: trimmedName,
          email: normalizedEmail,
          mob: normalizedMob,
          dep_id: command.dep_id,
          department_ids: allDepIds,
          role_id: assignedRoleId,
          reporting_manager: command.reporting_manager || null,
          joining_date: parsedJoiningDate,
          gender_id: command.gender_id ?? null,
          personal_email: command.personal_email?.trim() || null,
          office_email: command.office_email?.trim() || normalizedEmail,
          birth_date: parsedBirthDate,
          blood_group: command.blood_group?.trim() || null,
          address: command.address?.trim() || null,
          emergency_contact_name: command.emergency_contact_name?.trim() || null,
          emergency_contact_number: command.emergency_contact_number?.trim() || null,
          emergency_contact_relation: command.emergency_contact_relation?.trim() || null,
          employment_type_id: command.employment_type_id ?? null,
          salary: command.salary !== undefined ? Number(command.salary) : 0,
          pf: command.pf !== undefined ? Number(command.pf) : 0,
          ot_eligible: command.ot_eligible ?? false,
          ot_rate_type: command.ot_rate_type ?? null,
          ot_rate: command.ot_rate !== undefined && command.ot_rate !== null ? Number(command.ot_rate) : null,
          ot_multiplier: command.ot_multiplier !== undefined && command.ot_multiplier !== null ? Number(command.ot_multiplier) : null,
          minimum_ot_per_day: command.minimum_ot_per_day !== undefined ? Number(command.minimum_ot_per_day) : 0,
          ot_paid_as: command.ot_paid_as ?? 'SALARY',
          pf_applicable: command.pf_applicable ?? (Number(command.pf) > 0),
          uan: command.uan?.trim() || null,
          employee_pf_pct: command.employee_pf_pct !== undefined ? Number(command.employee_pf_pct) : 12,
          employer_pf_pct: command.employer_pf_pct !== undefined ? Number(command.employer_pf_pct) : 12,
          payment_mode: command.payment_mode ?? null,
          bank_name: command.bank_name?.trim() || null,
          account_number: command.account_number?.trim() || null,
          ifsc_code: command.ifsc_code?.trim() || null,
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

      // Log initial milestone into history
      await this.employeeRepo.addHistory(
        {
          emp_id: created.emp_id,
          event_type: 'HIRED',
          title: 'Joined the company',
          department_ids: allDepIds,
          role_id: assignedRoleId,
          manager_id: command.reporting_manager || null,
          effective_date: parsedJoiningDate,
          reason: 'Initial Hire',
          salary: command.salary !== undefined ? Number(command.salary) : 0,
          created_by: command.acting_admin_id,
        },
        tx,
      );

      return created;
    });
  }
}

