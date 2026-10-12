import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { RoleRepositoryPort, RoleListFilter } from '../../application/ports/role.repository.port';
import { Role } from '../../domain/entities/role.entity';
import {
  parseLimit,
  encodeCursor,
  decodeCursor,
} from '../../../../core/pagination/keyset-pagination';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaRoleRepository implements RoleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown): PrismaClient {
    return (tx as PrismaClient) || this.prisma;
  }

  async findMany(
    filter: RoleListFilter,
    tx?: unknown,
  ): Promise<{ items: Role[]; next_cursor: string | null }> {
    const client = this.getClient(tx);
    const limit = parseLimit(filter.limit);

    const where: any = {
      deleted_at: null,
    };

    if (filter.dep_id) {
      where.dep_id = filter.dep_id;
    }

    if (filter.q) {
      where.role_name = { contains: filter.q, mode: 'insensitive' };
    }

    if (filter.is_active !== undefined) {
      where.is_active = filter.is_active;
    }

    const decoded = decodeCursor<{ id: number }>(filter.cursor);
    if (decoded?.id) {
      where.role_id = { gt: decoded.id };
    }

    const records = await client.roles.findMany({
      where,
      take: limit + 1,
      orderBy: { role_id: 'asc' },
    });

    const hasNext = records.length > limit;
    const items = hasNext ? records.slice(0, limit) : records;
    const lastItem = items[items.length - 1];
    const next_cursor = hasNext && lastItem ? encodeCursor({ id: lastItem.role_id }) : null;

    return {
      items,
      next_cursor,
    };
  }

  async findActiveOptionsByDepartment(
    depId: number,
    tx?: unknown,
  ): Promise<Array<{ role_id: number; role_name: string }>> {
    const client = this.getClient(tx);
    return client.roles.findMany({
      where: {
        dep_id: depId,
        deleted_at: null,
        is_active: true,
      },
      select: {
        role_id: true,
        role_name: true,
      },
      orderBy: {
        role_name: 'asc',
      },
    });
  }

  async findById(id: number, tx?: unknown): Promise<Role | null> {
    const client = this.getClient(tx);
    return client.roles.findFirst({
      where: {
        role_id: id,
        deleted_at: null,
      },
    });
  }

  async findByDepAndName(depId: number, name: string, tx?: unknown): Promise<Role | null> {
    const client = this.getClient(tx);
    return client.roles.findFirst({
      where: {
        dep_id: depId,
        role_name: {
          equals: name,
          mode: 'insensitive',
        },
        deleted_at: null,
      },
    });
  }

  async create(
    data: { role_name: string; dep_id: number; description?: string | null; created_by: number },
    tx?: unknown,
  ): Promise<Role> {
    const client = this.getClient(tx);
    return client.roles.create({
      data: {
        role_name: data.role_name,
        dep_id: data.dep_id,
        description: data.description || null,
        created_by: data.created_by,
        is_active: true,
        is_admin: false,
      },
    });
  }

  async update(
    id: number,
    data: { role_name?: string; description?: string | null; is_active?: boolean; updated_by: number },
    tx?: unknown,
  ): Promise<Role> {
    const client = this.getClient(tx);
    return client.roles.update({
      where: { role_id: id },
      data: {
        ...(data.role_name !== undefined ? { role_name: data.role_name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        updated_by: data.updated_by,
        updated_at: new Date(),
      },
    });
  }

  async softDelete(id: number, deleted_by: number, tx?: unknown): Promise<void> {
    const client = this.getClient(tx);
    await client.roles.update({
      where: { role_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by,
        is_active: false,
      },
    });
  }

  async hasActiveEmployees(id: number, tx?: unknown): Promise<boolean> {
    const client = this.getClient(tx);
    const count = await client.employees.count({
      where: {
        role_id: id,
        status: 'Active',
        deleted_at: null,
      },
    });
    return count > 0;
  }
}
