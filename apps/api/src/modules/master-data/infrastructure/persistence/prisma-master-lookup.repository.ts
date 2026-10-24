import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  MasterLookupRepositoryPort,
  LookupOption,
  MasterLookupItem,
  CreateMasterLookupInput,
  UpdateMasterLookupInput,
} from '../../application/ports/master-lookup.repository.port';

@Injectable()
export class PrismaMasterLookupRepository implements MasterLookupRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  /** Sanitize actor_id: only set FK if it's a valid positive integer */
  private actorId(id?: number): number | null {
    return id && id > 0 ? id : null;
  }

  async getOptions(lookupType: string): Promise<LookupOption[]> {
    const rows = await this.prisma.master_lookup.findMany({
      where: {
        lookup_type: lookupType,
        is_active: true,
        deleted_at: null,
      },
      orderBy: [
        { sort_order: 'asc' },
        { label: 'asc' },
      ],
      select: {
        lookup_id: true,
        code: true,
        label: true,
      },
    });

    return rows.map((r) => ({
      id: r.lookup_id,
      code: r.code,
      label: r.label,
    }));
  }

  async getAll(lookupType?: string): Promise<MasterLookupItem[]> {
    const rows = await this.prisma.master_lookup.findMany({
      where: {
        ...(lookupType ? { lookup_type: lookupType } : {}),
        deleted_at: null,
      },
      orderBy: [
        { lookup_type: 'asc' },
        { sort_order: 'asc' },
        { label: 'asc' },
      ],
    });

    return rows.map((r) => this.toItem(r));
  }

  async getById(id: number): Promise<MasterLookupItem | null> {
    const row = await this.prisma.master_lookup.findFirst({
      where: { lookup_id: id, deleted_at: null },
    });
    if (!row) return null;
    return this.toItem(row);
  }

  async create(input: CreateMasterLookupInput): Promise<MasterLookupItem> {
    // Auto-generate code from label if not provided
    const code = (input.code || input.label)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/^_+|_+$/g, '');

    // Get max sort_order for this type to append at end
    let sortOrder = input.sort_order ?? 0;
    if (!input.sort_order) {
      const existing = await this.prisma.master_lookup.findFirst({
        where: { lookup_type: input.lookup_type, deleted_at: null },
        orderBy: { sort_order: 'desc' },
        select: { sort_order: true },
      });
      sortOrder = (existing?.sort_order ?? 0) + 10;
    }

    const actor = this.actorId(input.actor_id);

    const row = await this.prisma.master_lookup.create({
      data: {
        lookup_type: input.lookup_type,
        code,
        label: input.label.trim(),
        sort_order: sortOrder,
        is_active: input.is_active ?? true,
        created_by: actor,
        updated_by: actor,
      },
    });

    return this.toItem(row);
  }

  async update(input: UpdateMasterLookupInput): Promise<MasterLookupItem> {
    const actor = this.actorId(input.actor_id);
    const data: Record<string, unknown> = { updated_by: actor, updated_at: new Date() };

    if (input.label !== undefined) data.label = input.label.trim();
    if (input.code !== undefined) data.code = input.code;
    if (input.sort_order !== undefined) data.sort_order = input.sort_order;
    if (input.is_active !== undefined) data.is_active = input.is_active;

    const row = await this.prisma.master_lookup.update({
      where: { lookup_id: input.id },
      data,
    });

    return this.toItem(row);
  }

  async delete(id: number, actorId?: number): Promise<void> {
    const actor = this.actorId(actorId);
    await this.prisma.master_lookup.update({
      where: { lookup_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by: actor,
        updated_by: actor,
        updated_at: new Date(),
      },
    });
  }

  private toItem(row: {
    lookup_id: number;
    lookup_type: string;
    code: string;
    label: string;
    sort_order: number;
    is_active: boolean;
    created_at: Date;
  }): MasterLookupItem {
    return {
      id: row.lookup_id,
      lookup_type: row.lookup_type,
      code: row.code,
      label: row.label,
      sort_order: row.sort_order,
      is_active: row.is_active,
      created_at: row.created_at.toISOString(),
    };
  }
}
