import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  EmployeeRepositoryPort,
  EmployeeListFilter,
} from '../../application/ports/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import {
  parseLimit,
  encodeCursor,
  decodeCursor,
} from '../../../../core/pagination/keyset-pagination';
import { PrismaClient, employee_status } from '@prisma/client';
import { ConflictDomainError } from '../../domain/errors/organization.errors';
import { FileStoragePort, STORAGE_TOKENS } from '../../../storage/public-api';

@Injectable()
export class PrismaEmployeeRepository implements EmployeeRepositoryPort {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(STORAGE_TOKENS.FileStoragePort)
    private readonly storage?: FileStoragePort,
  ) {}

  private getClient(tx?: unknown): PrismaClient {
    return (tx as PrismaClient) || this.prisma;
  }

  private mapToEntity(record: any): Employee {
    return {
      emp_id: record.emp_id,
      name: record.name,
      email: record.email,
      mob: record.mob,
      dep_id: record.dep_id,
      role_id: record.role_id,
      reporting_manager: record.reporting_manager,
      profile_picture: record.profile_picture ?? null,
      profile_picture_url:
        record.profile_picture && this.storage
          ? this.storage.getSignedUrl(record.profile_picture)
          : null,
      status: record.status as 'Active' | 'Inactive',
      joining_date: record.joining_date,
      exit_date: record.exit_date,
      created_at: record.created_at,
      created_by: record.created_by,
      updated_at: record.updated_at,
      updated_by: record.updated_by,
      deleted_at: record.deleted_at,
      deleted_by: record.deleted_by,
      department: record.departments_employees_dep_idTodepartments
        ? {
            dep_id: record.departments_employees_dep_idTodepartments.dep_id,
            name: record.departments_employees_dep_idTodepartments.name,
          }
        : undefined,
      role: record.roles_employees_role_idToroles
        ? {
            role_id: record.roles_employees_role_idToroles.role_id,
            role_name: record.roles_employees_role_idToroles.role_name,
          }
        : undefined,
      manager: record.employees_employees_reporting_managerToemployees
        ? {
            emp_id: record.employees_employees_reporting_managerToemployees.emp_id,
            name: record.employees_employees_reporting_managerToemployees.name,
          }
        : null,
    };
  }

  async findMany(
    filter: EmployeeListFilter,
    tx?: unknown,
  ): Promise<{ items: Employee[]; next_cursor: string | null }> {
    const client = this.getClient(tx);
    const limit = parseLimit(filter.limit);

    const where: any = {
      deleted_at: null,
    };

    if (filter.dep_id) {
      where.dep_id = filter.dep_id;
    }

    if (filter.role_id) {
      where.role_id = filter.role_id;
    }

    if (filter.status) {
      where.status = filter.status as employee_status;
    }

    if (filter.q) {
      where.OR = [
        { name: { contains: filter.q, mode: 'insensitive' } },
        { email: { contains: filter.q, mode: 'insensitive' } },
      ];
    }

    const decoded = decodeCursor<{ id: number }>(filter.cursor);
    if (decoded?.id) {
      where.emp_id = { gt: decoded.id };
    }

    const records = await client.employees.findMany({
      where,
      take: limit + 1,
      orderBy: { emp_id: 'asc' },
      include: {
        departments_employees_dep_idTodepartments: {
          select: { dep_id: true, name: true },
        },
        roles_employees_role_idToroles: {
          select: { role_id: true, role_name: true },
        },
        employees_employees_reporting_managerToemployees: {
          select: { emp_id: true, name: true },
        },
      },
    });

    const hasNext = records.length > limit;
    const rawItems = hasNext ? records.slice(0, limit) : records;
    const items = rawItems.map((r) => this.mapToEntity(r));
    const lastItem = items[items.length - 1];
    const next_cursor = hasNext && lastItem ? encodeCursor({ id: lastItem.emp_id }) : null;

    return {
      items,
      next_cursor,
    };
  }

  async findActiveOptions(
    q?: string,
    tx?: unknown,
  ): Promise<Array<{ emp_id: number; name: string; email: string }>> {
    const client = this.getClient(tx);
    const where: any = {
      deleted_at: null,
      status: 'Active',
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    return client.employees.findMany({
      where,
      select: {
        emp_id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: number, tx?: unknown): Promise<Employee | null> {
    const client = this.getClient(tx);
    const record = await client.employees.findFirst({
      where: {
        emp_id: id,
        deleted_at: null,
      },
      include: {
        departments_employees_dep_idTodepartments: {
          select: { dep_id: true, name: true },
        },
        roles_employees_role_idToroles: {
          select: { role_id: true, role_name: true },
        },
        employees_employees_reporting_managerToemployees: {
          select: { emp_id: true, name: true },
        },
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  async findByEmail(email: string, tx?: unknown): Promise<Employee | null> {
    const client = this.getClient(tx);
    const record = await client.employees.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        deleted_at: null,
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  async findByMobile(mobile: string, tx?: unknown): Promise<Employee | null> {
    const client = this.getClient(tx);
    const record = await client.employees.findFirst({
      where: {
        mob: mobile,
        deleted_at: null,
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  async create(
    data: {
      name: string;
      email: string;
      mob: string;
      dep_id: number;
      role_id?: number | null;
      reporting_manager?: number | null;
      joining_date: Date;
      created_by: number;
    },
    tx?: unknown,
  ): Promise<Employee> {
    const client = this.getClient(tx);
    const created = await client.employees.create({
      data: {
        name: data.name,
        email: data.email,
        mob: data.mob,
        dep_id: data.dep_id,
        role_id: data.role_id ?? null,
        reporting_manager: data.reporting_manager || null,
        joining_date: data.joining_date,
        created_by: data.created_by,
        status: 'Active',
      },
      include: {
        departments_employees_dep_idTodepartments: {
          select: { dep_id: true, name: true },
        },
        roles_employees_role_idToroles: {
          select: { role_id: true, role_name: true },
        },
        employees_employees_reporting_managerToemployees: {
          select: { emp_id: true, name: true },
        },
      },
    });

    return this.mapToEntity(created);
  }

  async update(
    id: number,
    data: {
      name?: string;
      mob?: string;
      dep_id?: number;
      role_id?: number | null;
      reporting_manager?: number | null;
      joining_date?: Date;
      exit_date?: Date | null;
      status?: 'Active' | 'Inactive';
      profile_picture?: string | null;
      updated_by: number;
    },
    tx?: unknown,
  ): Promise<Employee> {
    const client = this.getClient(tx);
    const updateData: any = {
      updated_by: data.updated_by,
      updated_at: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.mob !== undefined) updateData.mob = data.mob;
    if (data.dep_id !== undefined) updateData.dep_id = data.dep_id;
    if (data.role_id !== undefined) updateData.role_id = data.role_id;
    if (data.reporting_manager !== undefined) updateData.reporting_manager = data.reporting_manager;
    if (data.joining_date !== undefined) updateData.joining_date = data.joining_date;
    if (data.exit_date !== undefined) updateData.exit_date = data.exit_date;
    if (data.status !== undefined) updateData.status = data.status as employee_status;
    if (data.profile_picture !== undefined) updateData.profile_picture = data.profile_picture;

    try {
      const updated = await client.employees.update({
        where: { emp_id: id },
        data: updateData,
        include: {
          departments_employees_dep_idTodepartments: {
            select: { dep_id: true, name: true },
          },
          roles_employees_role_idToroles: {
            select: { role_id: true, role_name: true },
          },
          employees_employees_reporting_managerToemployees: {
            select: { emp_id: true, name: true },
          },
        },
      });

      return this.mapToEntity(updated);
    } catch (err: any) {
      if (err?.message?.includes('Hierarchy cycle detected')) {
        throw new ConflictDomainError(
          'REPORTING_CYCLE_DETECTED',
          'Cycle detected in reporting hierarchy',
          'reporting_manager',
        );
      }
      if (err?.message?.includes('Cannot modify or delete last remaining active administrator')) {
        throw new ConflictDomainError(
          'LAST_ADMIN_PROTECTION',
          'Cannot modify or delete last remaining active administrator',
        );
      }
      throw err;
    }
  }

  async softDelete(id: number, deleted_by: number, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.employees.update({
      where: { emp_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by,
        status: 'Inactive',
        exit_date: new Date(),
      },
    });
  }

  async countActiveAdmins(excludeEmpId?: number, tx?: unknown): Promise<number> {
    const client = this.getClient(tx);
    const where: any = {
      deleted_at: null,
      status: 'Active',
      roles_employees_role_idToroles: {
        is_admin: true,
        is_active: true,
        deleted_at: null,
      },
    };

    if (excludeEmpId) {
      where.emp_id = { not: excludeEmpId };
    }

    return client.employees.count({ where });
  }

  async checkReportingCycle(
    empId: number,
    prospectiveManagerId: number,
    tx?: unknown,
  ): Promise<boolean> {
    if (empId === prospectiveManagerId) {
      return true;
    }

    const client = this.getClient(tx);
    const result = await client.$queryRaw<Array<{ is_cycle: boolean }>>`
      WITH RECURSIVE manager_chain AS (
        SELECT emp_id, reporting_manager, 1 AS depth
        FROM employees
        WHERE emp_id = ${prospectiveManagerId} AND deleted_at IS NULL
        UNION ALL
        SELECT e.emp_id, e.reporting_manager, mc.depth + 1
        FROM employees e
        INNER JOIN manager_chain mc ON e.emp_id = mc.reporting_manager
        WHERE e.deleted_at IS NULL AND mc.depth < 100
      )
      SELECT EXISTS (
        SELECT 1 FROM manager_chain WHERE emp_id = ${empId}
      ) AS is_cycle;
    `;

    return Boolean(result[0]?.is_cycle);
  }
}
