import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { BillingCycle, BillingCycleKind, billingCycleProblem } from '../../domain/license-rules';

export interface BillingCycleRow extends BillingCycle {
  cycle_id: number;
  display_order: number;
  is_active: boolean;
  /** Terms that use this cycle: its kind and length can no longer change, and it can only be deactivated. */
  in_use: number;
  /** Software licenses with at least one term on this cycle (what the Settings list shows). */
  licenses: number;
}

export interface BillingCycleInput {
  name?: string;
  kind?: string;
  months?: number | null;
  display_order?: number;
  is_active?: boolean;
}

/** Same shape as the other license errors: the web shows `message` next to `field`. */
const fieldError = (field: string, message: string) => new BadRequestException({ message, field });

/**
 * Billing Cycles of software licenses (Settings -> License Settings). Terms store the cycle's name;
 * the database ties it to this list (renaming a cycle renames it on every term).
 */
@Injectable()
export class LicenseBillingCycleService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive = false): Promise<BillingCycleRow[]> {
    const rows = await this.prisma.software_license_billing_cycles.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { software_license_terms: true } } },
    });
    // Distinct software per cycle (a license renewed three times on Monthly counts once).
    const pairs = await this.prisma.software_license_terms.groupBy({ by: ['billing_cycle', 'software_id'], where: { billing_cycle: { not: null } } });
    const licenses = new Map<string, number>();
    for (const p of pairs) if (p.billing_cycle) licenses.set(p.billing_cycle, (licenses.get(p.billing_cycle) ?? 0) + 1);
    return rows.map((r) => ({
      cycle_id: r.cycle_id,
      name: r.name,
      kind: r.kind as BillingCycleKind,
      months: r.months,
      display_order: r.display_order,
      is_active: r.is_active,
      in_use: r._count.software_license_terms,
      licenses: licenses.get(r.name) ?? 0,
    }));
  }

  /** Every cycle (active or not) by name, for the cost and term rules of existing terms. */
  async byName(): Promise<Map<string, BillingCycle>> {
    const rows = await this.prisma.software_license_billing_cycles.findMany({ select: { name: true, kind: true, months: true } });
    return new Map(rows.map((r) => [r.name, { name: r.name, kind: r.kind as BillingCycleKind, months: r.months }]));
  }

  /**
   * The cycle a term may be saved with. `keep` is the term's current cycle: it stays allowed even
   * after the Admin deactivated it, so editing an old term does not force a new cycle.
   */
  async requireUsable(name: string | null | undefined, keep?: string | null): Promise<BillingCycle> {
    const wanted = name?.trim();
    if (!wanted) throw fieldError('billing_cycle', 'Please fill this field.');
    const row = await this.prisma.software_license_billing_cycles.findUnique({ where: { name: wanted } });
    if (!row) throw fieldError('billing_cycle', 'Please choose a Billing Cycle from the list.');
    if (!row.is_active && row.name !== keep) throw fieldError('billing_cycle', 'This Billing Cycle is no longer in use. Please choose another.');
    return { name: row.name, kind: row.kind as BillingCycleKind, months: row.months };
  }

  async create(input: BillingCycleInput) {
    const name = this.cleanName(input.name);
    const kind = String(input.kind ?? '');
    const months = kind === 'FIXED' ? Number(input.months) : null;
    const problem = billingCycleProblem(kind, months);
    if (problem) throw fieldError(kind === 'FIXED' ? 'months' : 'kind', problem);
    await this.assertNameFree(name);
    return this.prisma.software_license_billing_cycles.create({
      data: { name, kind, months, display_order: input.display_order ?? 1, is_active: input.is_active ?? true },
    });
  }

  async update(cycleId: number, input: BillingCycleInput) {
    const current = await this.prisma.software_license_billing_cycles.findUnique({
      where: { cycle_id: cycleId },
      include: { _count: { select: { software_license_terms: true } } },
    });
    if (!current) throw new NotFoundException('Billing Cycle not found.');

    const name = input.name !== undefined ? this.cleanName(input.name) : current.name;
    if (name.toLowerCase() !== current.name.toLowerCase()) await this.assertNameFree(name, cycleId);

    const kind = input.kind !== undefined ? String(input.kind) : current.kind;
    const months = kind === 'FIXED' ? Number(input.months !== undefined ? input.months : current.months) : null;
    const problem = billingCycleProblem(kind, months);
    if (problem) throw fieldError(kind === 'FIXED' ? 'months' : 'kind', problem);
    // Changing the length would change the cost and checks of licenses already on this cycle.
    if (current._count.software_license_terms > 0 && (kind !== current.kind || months !== current.months)) {
      throw fieldError('months', 'Licenses already use this Billing Cycle, so its length cannot change. Add a new cycle instead.');
    }

    return this.prisma.software_license_billing_cycles.update({
      where: { cycle_id: cycleId },
      data: {
        name,
        kind,
        months,
        ...(input.display_order !== undefined && { display_order: input.display_order }),
        ...(input.is_active !== undefined && { is_active: input.is_active }),
        updated_at: new Date(),
      },
    });
  }

  /** Unused cycles are deleted; cycles that licenses use are only deactivated. */
  async remove(cycleId: number) {
    const current = await this.prisma.software_license_billing_cycles.findUnique({
      where: { cycle_id: cycleId },
      include: { _count: { select: { software_license_terms: true } } },
    });
    if (!current) throw new NotFoundException('Billing Cycle not found.');
    if (current._count.software_license_terms > 0) {
      return this.prisma.software_license_billing_cycles.update({ where: { cycle_id: cycleId }, data: { is_active: false, updated_at: new Date() } });
    }
    return this.prisma.software_license_billing_cycles.delete({ where: { cycle_id: cycleId } });
  }

  private cleanName(raw: string | undefined): string {
    const name = String(raw ?? '').trim().replace(/\s+/g, ' ');
    if (!name) throw fieldError('name', 'Please fill this field.');
    if (name.length > 30) throw fieldError('name', 'Use 30 characters or fewer.');
    return name;
  }

  private async assertNameFree(name: string, exceptId?: number) {
    const clash = await this.prisma.software_license_billing_cycles.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId && { NOT: { cycle_id: exceptId } }) },
      select: { cycle_id: true },
    });
    if (clash) throw new ConflictException({ message: `A Billing Cycle named "${name}" already exists.`, field: 'name' });
  }
}
