import { Injectable, Inject } from '@nestjs/common';
import { AUTH_TOKENS } from './application/ports/tokens';
import { EmployeeAuthRepository } from './application/ports/auth.ports';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';

export { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
export { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';

export interface AccessPolicy {
  canManageOrganization(empId: number): Promise<boolean>;
  canManageCompanies(empId: number): Promise<boolean>;
  canManageTasks(empId: number): Promise<boolean>;
}

export const ACCESS_POLICY_TOKEN = Symbol('AccessPolicy');

@Injectable()
export class AccessPolicyAdapter implements AccessPolicy {
  constructor(
    @Inject(AUTH_TOKENS.EmployeeAuthRepository)
    private readonly employeeRepo: EmployeeAuthRepository,
  ) {}

  async canManageOrganization(empId: number): Promise<boolean> {
    const emp = await this.employeeRepo.findById(empId);
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null) {
      return false;
    }
    return Boolean(emp.is_admin);
  }

  async canManageCompanies(empId: number): Promise<boolean> {
    const emp = await this.employeeRepo.findById(empId);
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null) {
      return false;
    }
    return Boolean(emp.is_admin);
  }

  async canManageTasks(empId: number): Promise<boolean> {
    const emp = await this.employeeRepo.findById(empId);
    if (!emp || emp.status !== 'Active' || emp.deleted_at !== null) {
      return false;
    }
    return Boolean(emp.is_admin);
  }
}

export interface ProvisionCredentialsInput {
  tx: any;
  empId: number;
  passwordHash: string;
  mustChangePassword?: boolean;
  actorEmpId: number;
}

export async function provisionCredentialsInTransaction(input: ProvisionCredentialsInput): Promise<void> {
  const { tx, empId, passwordHash, mustChangePassword = false, actorEmpId } = input;

  await tx.employee_credentials.create({
    data: {
      emp_id: empId,
      password_hash: passwordHash,
      must_change_password: mustChangePassword,
      created_by: actorEmpId,
    },
  });

  await tx.auth_events.create({
    data: {
      emp_id: empId,
      actor_emp_id: actorEmpId,
      event_type: 'credentials_created',
      details: { source: 'admin' },
    },
  });
}
