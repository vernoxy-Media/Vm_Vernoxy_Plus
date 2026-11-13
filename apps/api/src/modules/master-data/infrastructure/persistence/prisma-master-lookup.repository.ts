import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  MasterLookupRepositoryPort,
  LookupOption,
  MasterLookupItem,
  CreateMasterLookupInput,
  UpdateMasterLookupInput,
} from '../../application/ports/master-lookup.repository.port';

/**
 * A code is made from a name: lower case, words joined by _, only a-z 0-9 _. A plus or a minus sign at the end is
 * kept as a word, otherwise "A+" and "A-" would both become "a" (blood groups: A+, A-, AB+, AB-, O+, O-).
 */
export function codeFromLabel(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\+/g, '_plus')
    .replace(/(?<=[a-z0-9])\s*-$/, '_minus')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

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
        parent_id: true,
      },
    });

    return rows.map((r) => ({
      id: r.lookup_id,
      code: r.code,
      label: r.label,
      parent_id: r.parent_id,
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
      include: { parent: { select: { label: true } } },
    });

    return rows.map((r) => this.toItem(r));
  }

  async getById(id: number): Promise<MasterLookupItem | null> {
    const row = await this.prisma.master_lookup.findFirst({
      where: { lookup_id: id, deleted_at: null },
      include: { parent: { select: { label: true } } },
    });
    if (!row) return null;
    return this.toItem(row);
  }

  async create(input: CreateMasterLookupInput): Promise<MasterLookupItem> {
    // Auto-generate code from label if not provided
    const typedCode = Boolean(input.code && input.code.trim());
    let code = codeFromLabel(input.code || input.label);
    if (!code) throw new ConflictException('Enter a name or a code made of letters or numbers.');

    // Codes are unique per type, and "Phase I" exists under many GIDCs, so a child carries its parent's code.
    if (input.parent_id) {
      const parent = await this.prisma.master_lookup.findFirst({
        where: { lookup_id: input.parent_id, deleted_at: null },
        select: { code: true },
      });
      if (parent) code = `${parent.code}__${code}`.slice(0, 50);
    }

    // The same name twice in a list is a mistake (a child may repeat a name under another parent)
    if (!input.parent_id) {
      const sameName = await this.prisma.master_lookup.findFirst({
        where: { lookup_type: input.lookup_type, parent_id: null, deleted_at: null, label: { equals: input.label.trim(), mode: 'insensitive' } },
        select: { label: true },
      });
      if (sameName) throw new ConflictException(`"${sameName.label}" already exists in this list.`);
    }

    // The code must be free. Deleted rows still hold their code, so they count too.
    const taken = await this.prisma.master_lookup.findFirst({
      where: { lookup_type: input.lookup_type, code },
      select: { label: true, deleted_at: true },
    });
    if (taken) {
      if (typedCode) {
        throw new ConflictException(
          `The code "${code}" is already used by "${taken.label}"${taken.deleted_at ? ' (deleted)' : ''}. Choose another code or leave it blank.`,
        );
      }
      // A code made from the name: add a number until it is free
      const base = code.slice(0, 46);
      for (let n = 2; n < 100; n++) {
        const candidate = `${base}_${n}`;
        const used = await this.prisma.master_lookup.findFirst({ where: { lookup_type: input.lookup_type, code: candidate }, select: { lookup_id: true } });
        if (!used) {
          code = candidate;
          break;
        }
      }
    }

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

    try {
      const row = await this.prisma.master_lookup.create({
        data: {
          lookup_type: input.lookup_type,
          code,
          label: input.label.trim(),
          sort_order: sortOrder,
          is_active: input.is_active ?? true,
          parent_id: input.parent_id ?? null,
          created_by: actor,
          updated_by: actor,
        },
        include: { parent: { select: { label: true } } },
      });
      return this.toItem(row);
    } catch (err) {
      // Someone else saved the same code a moment ago: say so plainly, never show the database message
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`The code "${code}" is already in use. Choose another code.`);
      }
      throw err;
    }
  }

  async update(input: UpdateMasterLookupInput): Promise<MasterLookupItem> {
    const actor = this.actorId(input.actor_id);
    const data: Record<string, unknown> = { updated_by: actor, updated_at: new Date() };

    if (input.label !== undefined) data.label = input.label.trim();
    if (input.code !== undefined) data.code = input.code;
    if (input.sort_order !== undefined) data.sort_order = input.sort_order;
    if (input.is_active !== undefined) data.is_active = input.is_active;
    if (input.parent_id !== undefined) data.parent_id = input.parent_id;

    try {
      const row = await this.prisma.master_lookup.update({
        where: { lookup_id: input.id },
        data,
        include: { parent: { select: { label: true } } },
      });
      return this.toItem(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('That code is already used by another item in this list. Choose another code.');
      }
      throw err;
    }
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
    parent_id: number | null;
    parent?: { label: string } | null;
  }): MasterLookupItem {
    return {
      id: row.lookup_id,
      lookup_type: row.lookup_type,
      code: row.code,
      label: row.label,
      sort_order: row.sort_order,
      is_active: row.is_active,
      created_at: row.created_at.toISOString(),
      parent_id: row.parent_id,
      parent_label: row.parent?.label ?? null,
    };
  }
}
