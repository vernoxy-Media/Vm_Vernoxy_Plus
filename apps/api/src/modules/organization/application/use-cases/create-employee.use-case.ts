import { Logger } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../ports/employee.repository.port';
import { DepartmentRepositoryPort } from '../ports/department.repository.port';
import { RoleRepositoryPort } from '../ports/role.repository.port';
import { CredentialProvisionerPort } from '../ports/credential-provisioner.port';
import { UnitOfWorkPort } from '../ports/unit-of-work.port';
import { MailPort } from '../../../auth/application/ports/auth.ports';
import { Employee } from '../../domain/entities/employee.entity';
import { OrganizationNormalizationService } from '../../domain/services/organization-normalization.service';
import { OrganizationPolicyService } from '../../domain/services/organization-policy.service';
import {
  NotFoundDomainError,
  ConflictDomainError,
  UnprocessableDomainError,
  ValidationDomainError,
} from '../../domain/errors/organization.errors';

import { resolveRoleSelection } from '../services/employee-role-selection';
import { assertAmount, assertPersonName, normalizeEmergencyContacts } from '../../domain/services/employee-input-rules';


export interface CreateEmployeeCommand {
  name: string;
  email: string;
  mob?: string;
  password: string;
  dep_id: number;
  department_ids?: number[];
  role_id?: number | null;
  /** All designations (each must belong to one of the selected departments). role_id is the primary one. */
  role_ids?: number[];
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
  /** Several emergency contacts; when sent they replace the single contact fields */
  emergency_contacts?: Array<{ name: string; relation?: string | null; number: string }>;
  employment_type_id?: number | null;
  salary?: number;
  probation_period?: string | null;
  notice_period?: string | null;
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
  leave_policy_id?: number | null;
  /** Bulk import creates the account without mailing the temporary password; HR sends it later. Default: the mail goes out. */
  skip_welcome_email?: boolean;
  acting_admin_id: number;
}

export class CreateEmployeeUseCase {
  private readonly logger = new Logger(CreateEmployeeUseCase.name);

  constructor(
    private readonly employeeRepo: EmployeeRepositoryPort,
    private readonly departmentRepo: DepartmentRepositoryPort,
    private readonly roleRepo: RoleRepositoryPort,
    private readonly credentialProvisioner: CredentialProvisionerPort,
    private readonly unitOfWork: UnitOfWorkPort,
    private readonly mailPort?: MailPort,
  ) {}

  async execute(command: CreateEmployeeCommand): Promise<Employee> {
    const trimmedName = assertPersonName(command.name, 'name', 'Employee name');

    // The fields the BRD marks as required: nothing is filled in on the employee's behalf
    if (!command.mob || !command.mob.trim()) throw new ValidationDomainError('Phone number is required', 'mob');
    if (!command.gender_id) throw new ValidationDomainError('Gender is required', 'gender_id');
    if (!command.personal_email || !command.personal_email.trim()) throw new ValidationDomainError('Personal email is required', 'personal_email');
    if (!command.birth_date) throw new ValidationDomainError('Birth date is required', 'birth_date');
    if (!command.employment_type_id) throw new ValidationDomainError('Employment type is required', 'employment_type_id');
    if (!command.joining_date) throw new ValidationDomainError('Joining date is required', 'joining_date');
    if (!command.role_id && !(command.role_ids && command.role_ids.length > 0)) {
      throw new ValidationDomainError('Select at least one designation', 'role_ids');
    }
    if (!command.dep_id && !(command.department_ids && command.department_ids.length > 0)) {
      throw new ValidationDomainError('Select at least one department', 'department_ids');
    }

    const emergencyContacts = command.emergency_contacts !== undefined
      ? normalizeEmergencyContacts(command.emergency_contacts)
      : normalizeEmergencyContacts(
          command.emergency_contact_name || command.emergency_contact_number
            ? [{ name: command.emergency_contact_name, number: command.emergency_contact_number, relation: command.emergency_contact_relation }]
            : [],
        );

    const normalizedEmail = OrganizationNormalizationService.normalizeEmail(command.email);
    const normalizedMob = OrganizationNormalizationService.normalizeMobile(command.mob);

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
      const today = new Date();
      let age = today.getFullYear() - parsedBirthDate.getFullYear();
      const m = today.getMonth() - parsedBirthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < parsedBirthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        throw new ValidationDomainError('Employees must be 18 or older.', 'birth_date');
      }
    }

    if (command.salary !== undefined) assertAmount(command.salary, 'salary', 'Salary');
    if (command.pf !== undefined) assertAmount(command.pf, 'pf', 'PF amount');

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
    let primaryDepId = command.dep_id;
    const roleSelection = resolveRoleSelection(command.role_id, command.role_ids);
    if (roleSelection.primary) {
      const role = await this.roleRepo.findById(roleSelection.primary);
      if (!role) {
        throw new NotFoundDomainError('Role', roleSelection.primary);
      }
      if (!role.is_active) {
        throw new UnprocessableDomainError(
          'ROLE_INACTIVE',
          'Cannot assign employee to an inactive role',
          'role_id',
        );
      }

      // The designation decides the main department: it may belong to any of the departments that were selected
      const selectedDepIds = Array.from(new Set([command.dep_id, ...(command.department_ids || [])]));
      primaryDepId = OrganizationPolicyService.validateRoleBelongsToAnyDepartment(role.dep_id, selectedDepIds, role.role_name);
      if (primaryDepId !== command.dep_id) {
        const roleDepartment = await this.departmentRepo.findById(primaryDepId);
        if (!roleDepartment || !roleDepartment.is_active) {
          throw new UnprocessableDomainError('DEPARTMENT_INACTIVE', 'The department of this designation is not active', 'department_ids');
        }
      }
      assignedRoleId = role.role_id;
    }

    // Every other designation must be active and belong to one of the selected departments
    const selectedForRoles = new Set([command.dep_id, primaryDepId, ...(command.department_ids || [])]);
    for (const extraRoleId of roleSelection.all.filter((id) => id !== assignedRoleId)) {
      const extra = await this.roleRepo.findById(extraRoleId);
      if (!extra) {
        throw new NotFoundDomainError('Role', extraRoleId);
      }
      if (!extra.is_active) {
        throw new UnprocessableDomainError('ROLE_INACTIVE', `Designation "${extra.role_name}" is inactive`, 'role_ids');
      }
      if (!selectedForRoles.has(extra.dep_id)) {
        throw new UnprocessableDomainError(
          'ROLE_DEPARTMENT_MISMATCH',
          `Designation "${extra.role_name}" does not belong to any of the selected departments`,
          'role_ids',
        );
      }
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
      const code = existingEmail.employee_code || `EMP-${String(existingEmail.emp_id).padStart(4, '0')}`;
      throw new ConflictDomainError('EMAIL_EXISTS', `This email already belongs to ${code}.`, 'email');
    }

    const existingMob = await this.employeeRepo.findByMobile(normalizedMob);
    if (existingMob) {
      throw new ConflictDomainError(
        'MOBILE_EXISTS',
        'An employee with this mobile number already exists',
        'mob',
      );
    }

    const allDepIds = Array.from(new Set([primaryDepId, command.dep_id, ...(command.department_ids || [])]));

    const createdEmployee = await this.unitOfWork.run(async (tx) => {
      const created = await this.employeeRepo.create(
        {
          name: trimmedName,
          email: normalizedEmail,
          mob: normalizedMob,
          dep_id: primaryDepId,
          department_ids: allDepIds,
          role_id: assignedRoleId,
          role_ids: roleSelection.all,
          reporting_manager: command.reporting_manager || null,
          joining_date: parsedJoiningDate,
          gender_id: command.gender_id ?? null,
          personal_email: command.personal_email?.trim() || null,
          office_email: command.office_email?.trim() || normalizedEmail,
          birth_date: parsedBirthDate,
          blood_group: command.blood_group?.trim() || null,
          address: command.address?.trim() || null,
          emergency_contact_name: emergencyContacts[0]?.name ?? null,
          emergency_contact_number: emergencyContacts[0]?.number ?? null,
          emergency_contact_relation: emergencyContacts[0]?.relation ?? null,
          emergency_contacts: emergencyContacts,
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
          leave_policy_id: command.leave_policy_id ?? null,
          created_by: command.acting_admin_id,
        },
        tx,
      );

      await this.credentialProvisioner.provision(
        {
          emp_id: created.emp_id,
          password: command.password,
          // The password the Admin hands over is temporary: the employee chooses their own at the first sign in
          must_change_password: true,
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

    if (this.mailPort && !command.skip_welcome_email) {
      const targetOfficeEmail = (command.office_email || command.email).trim().toLowerCase();
      // Send welcome credentials email asynchronously in the background so employee creation is instant
      this.mailPort
        .sendWelcomeCredentials({
          officeEmail: targetOfficeEmail,
          personalEmail: command.personal_email?.trim().toLowerCase() || undefined,
          employeeName: command.name,
          temporaryPassword: command.password,
          loginUrl: process.env.WEB_ORIGIN || 'http://localhost:5173',
        })
        .catch((mailErr: any) => {
          this.logger.warn(`Failed to dispatch welcome email: ${mailErr.message}`);
        });
    }

    return createdEmployee;
  }
}

