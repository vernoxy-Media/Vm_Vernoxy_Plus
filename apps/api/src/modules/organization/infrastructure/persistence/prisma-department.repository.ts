import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  DepartmentRepositoryPort,
  DepartmentListFilter,
} from '../../application/ports/department.repository.port';
import { Department } from '../../domain/entities/department.entity';
import {
  parseLimit,
  encodeCursor,
  decodeCursor,
} from '../../../../core/pagination/keyset-pagination';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaDepartmentRepository implements DepartmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): PrismaClient {
    return (tx as PrismaClient) || this.prisma;
  }

  async findMany(
    filter: DepartmentListFilter,
    tx?: unknown,
  ): Promise<{ items: Department[]; next_cursor: string | null }> {
    const client = this.getClient(tx);
    const limit = parseLimit(filter.limit);

    const where: any = {
      deleted_at: null,
    };

    if (filter.q) {
      where.name = { contains: filter.q, mode: 'insensitive' };
    }

    if (filter.is_active !== undefined) {
      where.is_active = filter.is_active;
    }

    const decoded = decodeCursor<{ id: number }>(filter.cursor);
    if (decoded?.id) {
      where.dep_id = { gt: decoded.id };
    }

    const records = await client.departments.findMany({
      where,
      take: limit + 1,
      orderBy: { dep_id: 'asc' },
    });

    const hasNext = records.length > limit;
    const items = hasNext ? records.slice(0, limit) : records;
    const lastItem = items[items.length - 1];
    const next_cursor = hasNext && lastItem ? encodeCursor({ id: lastItem.dep_id }) : null;

    return {
      items,
      next_cursor,
    };
  }

  async findActiveOptions(tx?: unknown): Promise<Array<{ dep_id: number; name: string }>> {
    const client = this.getClient(tx);
    return client.departments.findMany({
      where: {
        deleted_at: null,
        is_active: true,
      },
      select: {
        dep_id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: number, tx?: unknown): Promise<Department | null> {
    const client = this.getClient(tx);
    return client.departments.findFirst({
      where: {
        dep_id: id,
        deleted_at: null,
      },
    });
  }

  async findByName(name: string, tx?: unknown): Promise<Department | null> {
    const client = this.getClient(tx);
    return client.departments.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        deleted_at: null,
      },
    });
  }

  async create(data: { name: string; created_by: number }, tx?: unknown): Promise<Department> {
    const client = this.getClient(tx);
    return client.departments.create({
      data: {
        name: data.name,
        created_by: data.created_by,
        is_active: true,
      },
    });
  }

  async update(
    id: number,
    data: { name?: string; is_active?: boolean; updated_by: number },
    tx?: unknown,
  ): Promise<Department> {
    const client = this.getClient(tx);
    return client.departments.update({
      where: { dep_id: id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        updated_by: data.updated_by,
        updated_at: new Date(),
      },
    });
  }

  async softDelete(id: number, deleted_by: number, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.departments.update({
      where: { dep_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by,
        is_active: false,
      },
    });
  }

  async hasActiveRolesOrEmployees(
    id: number,
    tx?: unknown,
  ): Promise<{ hasActiveRoles: boolean; hasActiveEmployees: boolean }> {
    const client = this.getClient(tx);
    const [activeRoles, activeEmployees] = await Promise.all([
      client.roles.count({
        where: {
          dep_id: id,
          is_active: true,
          deleted_at: null,
        },
      }),
      client.employees.count({
        where: {
          dep_id: id,
          status: 'Active',
          deleted_at: null,
        },
      }),
    ]);

    return {
      hasActiveRoles: activeRoles > 0,
      hasActiveEmployees: activeEmployees > 0,
    };
  }
}
