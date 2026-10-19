import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  ActiveEmployeeSummary,
  EmployeeDirectoryPort,
} from '../../domain/ports/employee-directory.port';
import { FileStoragePort, STORAGE_TOKENS } from '../../../storage/public-api';

@Injectable()
export class EmployeeDirectoryAdapter implements EmployeeDirectoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(STORAGE_TOKENS.FileStoragePort)
    private readonly fileStorage?: FileStoragePort,
  ) {}

  async listActiveEmployees(): Promise<ActiveEmployeeSummary[]> {
    const rows = await this.prisma.employees.findMany({
      where: {
        status: 'Active',
        deleted_at: null,
      },
      include: {
        roles_employees_role_idToroles: true,
        departments_employees_dep_idTodepartments: true,
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((e) => {
      let avatarUrl: string | null = null;
      if (e.profile_picture) {
        if (this.fileStorage && !e.profile_picture.startsWith('http')) {
          try {
            avatarUrl = this.fileStorage.getSignedUrl(e.profile_picture);
          } catch {
            avatarUrl = e.profile_picture;
          }
        } else {
          avatarUrl = e.profile_picture;
        }
      }

      return {
        emp_id: e.emp_id,
        name: e.name,
        email: e.email,
        avatar_url: avatarUrl,
        role_name: e.roles_employees_role_idToroles?.role_name ?? 'Employee',
        department_name: e.departments_employees_dep_idTodepartments?.name ?? 'General',
      };
    });
  }

  async validateActiveEmployees(empIds: number[]): Promise<boolean> {
    if (!empIds.length) return false;
    const uniqueIds = Array.from(new Set(empIds));
    const count = await this.prisma.employees.count({
      where: {
        emp_id: { in: uniqueIds },
        status: 'Active',
        deleted_at: null,
      },
    });
    return count === uniqueIds.length;
  }
}
