import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  IndustryRepositoryPort,
  IndustryWithCounts,
  ListIndustriesParams,
  IndustryOption,
} from '../../application/ports/industry.repository.port';
import { Industry } from '../../domain/entities/industry.entity';

@Injectable()
export class PrismaIndustryRepository implements IndustryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: any): Industry {
    return new Industry({
      industry_id: row.industry_id,
      name: row.name,
      parent_id: row.parent_id,
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

  async findById(id: number): Promise<Industry | null> {
    const row = await this.prisma.industries.findFirst({
      where: { industry_id: id, deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByName(name: string, parentId?: number | null): Promise<Industry | null> {
    const row = await this.prisma.industries.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        parent_id: parentId != null ? parentId : null,
        deleted_at: null,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(params: ListIndustriesParams): Promise<{ items: IndustryWithCounts[]; next_cursor: number | null }> {
    const { q, parent_id, level, is_active, limit = 50, cursor } = params;

    const where: any = {
      deleted_at: null,
    };

    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    if (parent_id !== undefined) {
      where.parent_id = parent_id;
    } else if (level === 'top') {
      where.parent_id = null;
    } else if (level === 'sub') {
      where.parent_id = { not: null };
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const rows = await this.prisma.industries.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { industry_id: cursor }, skip: 1 } : {}),
      orderBy: [
        { is_default: 'desc' },
        { name: 'asc' },
        { industry_id: 'asc' },
      ],
      include: {
        industries: {
          select: { industry_id: true, name: true },
        },
        other_industries: {
          where: { deleted_at: null, is_active: true },
          select: { industry_id: true },
        },
        companies_companies_industry_idToindustries: {
          where: { deleted_at: null, is_active: true },
          select: { company_id: true },
        },
        companies_companies_sub_industry_idToindustries: {
          where: { deleted_at: null, is_active: true },
          select: { company_id: true },
        },
      },
    });

    let next_cursor: number | null = null;
    let resultRows = rows;
    if (rows.length > limit) {
      next_cursor = rows[limit - 1].industry_id;
      resultRows = rows.slice(0, limit);
    }

    const items: IndustryWithCounts[] = resultRows.map((r) => {
      const parent = r.industries ? { id: r.industries.industry_id, name: r.industries.name } : null;
      const sub_count = r.other_industries.length;
      const directCompanies = r.companies_companies_industry_idToindustries.length;
      const subCompanies = r.companies_companies_sub_industry_idToindustries.length;
      const company_count = directCompanies + subCompanies;

      return {
        industry: this.toDomain(r),
        parent,
        sub_count,
        company_count,
      };
    });

    return { items, next_cursor };
  }

  async getOptions(parentId?: number): Promise<IndustryOption[]> {
    const rows = await this.prisma.industries.findMany({
      where: {
        parent_id: parentId !== undefined ? parentId : null,
        is_active: true,
        deleted_at: null,
      },
      orderBy: [
        { is_default: 'desc' },
        { name: 'asc' },
      ],
      select: {
        industry_id: true,
        name: true,
        is_default: true,
      },
    });

    return rows.map((r) => ({
      id: r.industry_id,
      name: r.name,
      is_default: r.is_default,
    }));
  }

  async create(data: { name: string; parent_id?: number | null; is_default?: boolean; created_by: number }): Promise<Industry> {
    const row = await this.prisma.industries.create({
      data: {
        name: data.name,
        parent_id: data.parent_id ?? null,
        is_default: data.is_default ?? false,
        created_by: data.created_by,
        is_active: true,
      },
    });
    return this.toDomain(row);
  }

  async update(id: number, data: { name?: string; is_active?: boolean; updated_by: number }): Promise<Industry> {
    const row = await this.prisma.industries.update({
      where: { industry_id: id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        updated_by: data.updated_by,
        updated_at: new Date(),
      },
    });
    return this.toDomain(row);
  }

  async softDelete(id: number, deleted_by: number): Promise<void> {
    await this.prisma.industries.update({
      where: { industry_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by,
      },
    });
  }
}
