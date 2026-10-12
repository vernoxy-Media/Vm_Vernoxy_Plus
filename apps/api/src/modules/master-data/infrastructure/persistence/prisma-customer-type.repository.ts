import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CustomerTypeRepositoryPort,
  ListCustomerTypesParams,
  CustomerTypeOption,
} from '../../application/ports/customer-type.repository.port';
import { CustomerType } from '../../domain/entities/customer-type.entity';

@Injectable()
export class PrismaCustomerTypeRepository implements CustomerTypeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: any): CustomerType {
    return new CustomerType({
      customer_type_id: row.customer_type_id,
      name: row.name,
      is_active: row.is_active,
      is_default: row.is_default,
      created_at: row.created_at,
      created_by: row.created_by,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
      deleted_at: row.deleted_at,
      deleted_by: row.deleted_by,
    });
  }

  async findById(id: number): Promise<CustomerType | null> {
    const row = await this.prisma.customer_types.findFirst({
      where: { customer_type_id: id, deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByName(name: string): Promise<CustomerType | null> {
    const row = await this.prisma.customer_types.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        deleted_at: null,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findDefault(): Promise<CustomerType | null> {
    const row = await this.prisma.customer_types.findFirst({
      where: { is_default: true, deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(params: ListCustomerTypesParams): Promise<{ items: CustomerType[]; next_cursor: number | null }> {
    const { q, is_active, limit = 50, cursor } = params;

    const where: any = {
      deleted_at: null,
    };

    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const rows = await this.prisma.customer_types.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { customer_type_id: cursor }, skip: 1 } : {}),
      orderBy: [
        { is_default: 'desc' },
        { name: 'asc' },
        { customer_type_id: 'asc' },
      ],
    });

    let next_cursor: number | null = null;
    let resultRows = rows;
    if (rows.length > limit) {
      next_cursor = rows[limit - 1].customer_type_id;
      resultRows = rows.slice(0, limit);
    }

    return {
      items: resultRows.map((r) => this.toDomain(r)),
      next_cursor,
    };
  }

  async getOptions(): Promise<CustomerTypeOption[]> {
    const rows = await this.prisma.customer_types.findMany({
      where: {
        is_active: true,
        deleted_at: null,
      },
      orderBy: [
        { is_default: 'desc' },
        { name: 'asc' },
      ],
      select: {
        customer_type_id: true,
        name: true,
        is_default: true,
      },
    });

    return rows.map((r) => ({
      id: r.customer_type_id,
      name: r.name,
      is_default: r.is_default,
    }));
  }

  async create(data: { name: string; is_default?: boolean; created_by: number }): Promise<CustomerType> {
    const row = await this.prisma.customer_types.create({
      data: {
        name: data.name,
        is_default: data.is_default ?? false,
        created_by: data.created_by,
        is_active: true,
      },
    });
    return this.toDomain(row);
  }

  async update(id: number, data: { name?: string; is_active?: boolean; updated_by: number }): Promise<CustomerType> {
    const row = await this.prisma.customer_types.update({
      where: { customer_type_id: id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        updated_by: data.updated_by,
        updated_at: new Date(),
      },
    });
    return this.toDomain(row);
  }

  async switchDefault(newDefaultId: number, updated_by: number, data?: { name?: string; is_active?: boolean }): Promise<CustomerType> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Unset existing default
      await tx.customer_types.updateMany({
        where: { is_default: true, deleted_at: null },
        data: {
          is_default: false,
          updated_by,
          updated_at: new Date(),
        },
      });

      // 2. Set new default
      const updated = await tx.customer_types.update({
        where: { customer_type_id: newDefaultId },
        data: {
          is_default: true,
          is_active: true,
          ...(data?.name ? { name: data.name } : {}),
          updated_by,
          updated_at: new Date(),
        },
      });

      return this.toDomain(updated);
    });
  }

  async softDelete(id: number, deleted_by: number): Promise<void> {
    await this.prisma.customer_types.update({
      where: { customer_type_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by,
      },
    });
  }
}
