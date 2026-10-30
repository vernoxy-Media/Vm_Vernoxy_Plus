import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  EmployeeAuthRepository,
  EmployeeWithAuth,
} from '../../application/ports/auth.ports';
import {
  FileStoragePort,
  STORAGE_TOKENS,
} from '../../../storage/public-api';

@Injectable()
export class PrismaEmployeeAuthRepository implements EmployeeAuthRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(STORAGE_TOKENS.FileStoragePort)
    private readonly storage?: FileStoragePort,
  ) {}

  async findByEmail(email: string): Promise<EmployeeWithAuth | null> {
    const raw: any = await this.prisma.employees.findFirst({
      where: {
        email: {
          equals: email.trim().toLowerCase(),
          mode: 'insensitive',
        },
        deleted_at: null,
      },
      include: {
        roles_employees_role_idToroles: true,
        departments_employees_dep_idTodepartments: true,
        employee_credentials_employee_credentials_emp_idToemployees: {
          where: { deleted_at: null },
          orderBy: { credential_id: 'desc' },
          take: 1,
        },
      },
    });

    if (!raw) return null;

    const creds = raw.employee_credentials_employee_credentials_emp_idToemployees?.[0] ?? null;
    const profile_picture_url =
      raw.profile_picture && this.storage
        ? this.storage.getSignedUrl(raw.profile_picture)
        : null;

    return {
      emp_id: raw.emp_id,
      name: raw.name,
      email: raw.email,
      mob: raw.mob,
      profile_picture: raw.profile_picture ?? null,
      profile_picture_url,
      status: raw.status as 'Active' | 'Inactive',
      role_id: raw.role_id,
      role_name: raw.roles_employees_role_idToroles?.role_name ?? 'Unknown',
      dep_id: raw.dep_id,
      department_name: raw.departments_employees_dep_idTodepartments?.name ?? 'Unknown',
      is_admin: raw.roles_employees_role_idToroles?.is_admin ?? false,
      deleted_at: raw.deleted_at,
      credentials: creds
        ? {
            credential_id: creds.credential_id,
            password_hash: creds.password_hash,
            must_change_password: creds.must_change_password,
            failed_attempts: creds.failed_attempts,
            locked_until: creds.locked_until,
            last_login_at: creds.last_login_at,
          }
        : null,
    };
  }

  async findById(empId: number): Promise<EmployeeWithAuth | null> {
    const raw: any = await this.prisma.employees.findUnique({
      where: { emp_id: empId },
      include: {
        roles_employees_role_idToroles: true,
        departments_employees_dep_idTodepartments: true,
        employee_credentials_employee_credentials_emp_idToemployees: {
          where: { deleted_at: null },
          orderBy: { credential_id: 'desc' },
          take: 1,
        },
      },
    });

    if (!raw) return null;

    const creds = raw.employee_credentials_employee_credentials_emp_idToemployees?.[0] ?? null;
    const profile_picture_url =
      raw.profile_picture && this.storage
        ? this.storage.getSignedUrl(raw.profile_picture)
        : null;

    return {
      emp_id: raw.emp_id,
      name: raw.name,
      email: raw.email,
      mob: raw.mob,
      profile_picture: raw.profile_picture ?? null,
      profile_picture_url,
      status: raw.status as 'Active' | 'Inactive',
      role_id: raw.role_id,
      role_name: raw.roles_employees_role_idToroles?.role_name ?? 'Unknown',
      dep_id: raw.dep_id,
      department_name: raw.departments_employees_dep_idTodepartments?.name ?? 'Unknown',
      is_admin: raw.roles_employees_role_idToroles?.is_admin ?? false,
      deleted_at: raw.deleted_at,
      credentials: creds
        ? {
            credential_id: creds.credential_id,
            password_hash: creds.password_hash,
            must_change_password: creds.must_change_password,
            failed_attempts: creds.failed_attempts,
            locked_until: creds.locked_until,
            last_login_at: creds.last_login_at,
          }
        : null,
    };
  }

  async incrementFailedAttempts(empId: number): Promise<{ failedAttempts: number; lockedUntil: Date | null }> {
    const result: any[] = await this.prisma.$queryRaw`
      UPDATE employee_credentials
      SET failed_attempts = failed_attempts + 1,
          updated_at = NOW()
      WHERE emp_id = ${empId} AND deleted_at IS NULL
      RETURNING failed_attempts, locked_until;
    `;

    if (!result || result.length === 0) {
      return { failedAttempts: 0, lockedUntil: null };
    }

    return {
      failedAttempts: result[0].failed_attempts,
      lockedUntil: null,
    };
  }

  async resetFailedAttemptsAndSetLastLogin(empId: number, lastLoginAt: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE employee_credentials
      SET failed_attempts = 0,
          locked_until = NULL,
          last_login_at = ${lastLoginAt},
          updated_at = NOW()
      WHERE emp_id = ${empId} AND deleted_at IS NULL;
    `;
  }

  async updatePassword(empId: number, passwordHash: string, mustChangePassword = false): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE employee_credentials
      SET password_hash = ${passwordHash},
          password_changed_at = NOW(),
          must_change_password = ${mustChangePassword},
          failed_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
      WHERE emp_id = ${empId} AND deleted_at IS NULL;
    `;
  }
}
