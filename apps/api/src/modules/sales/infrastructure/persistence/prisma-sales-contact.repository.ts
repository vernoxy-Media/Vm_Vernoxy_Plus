import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  ContactInput,
  ContactRecord,
  SalesContactRepositoryPort,
} from '../../application/ports/sales-contact.repository.port';
import { ContactDuplicateMatch } from '../../domain/errors/sales.errors';

type Tx = Prisma.TransactionClient;

const INCLUDE = { persons: true } satisfies Prisma.company_personsInclude;
type Row = Prisma.company_personsGetPayload<{ include: typeof INCLUDE }>;

const toRecord = (r: Row): ContactRecord => ({
  company_person_id: r.company_person_id,
  person_id: r.person_id,
  company_id: r.company_id,
  name: r.persons.name,
  designation: r.designation,
  mobile: r.persons.mobile,
  email: r.persons.email,
  is_primary: r.is_primary,
  is_active: r.is_active,
});

@Injectable()
export class PrismaSalesContactRepository implements SalesContactRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async companyExists(companyId: number): Promise<boolean> {
    return (await this.prisma.companies.count({ where: { company_id: companyId, deleted_at: null } })) > 0;
  }

  async list(companyId: number): Promise<ContactRecord[]> {
    const rows = await this.prisma.company_persons.findMany({
      where: { company_id: companyId, deleted_at: null },
      include: INCLUDE,
      orderBy: [{ is_primary: 'desc' }, { is_active: 'desc' }, { company_person_id: 'asc' }],
    });
    return rows.map(toRecord);
  }

  async get(companyPersonId: number): Promise<ContactRecord | null> {
    const r = await this.prisma.company_persons.findFirst({ where: { company_person_id: companyPersonId, deleted_at: null }, include: INCLUDE });
    return r ? toRecord(r) : null;
  }

  async findDuplicates(q: { mobile: string | null; email: string | null; exclude_company_id: number; exclude_person_id?: number }): Promise<ContactDuplicateMatch[]> {
    const or: Prisma.personsWhereInput[] = [];
    if (q.mobile) or.push({ mobile: q.mobile });
    if (q.email) or.push({ email: { equals: q.email, mode: 'insensitive' } });
    if (or.length === 0) return [];
    const rows = await this.prisma.company_persons.findMany({
      where: {
        deleted_at: null,
        company_id: { not: q.exclude_company_id },
        companies: { deleted_at: null },
        persons: { deleted_at: null, OR: or, ...(q.exclude_person_id ? { person_id: { not: q.exclude_person_id } } : {}) },
      },
      include: { persons: true, companies: { select: { company_id: true, company_code: true, name: true } } },
      take: 5,
    });
    return rows.map((r) => ({
      company_id: r.companies.company_id,
      company_code: r.companies.company_code,
      company_name: r.companies.name,
      contact_name: r.persons.name,
      reason: q.mobile && r.persons.mobile === q.mobile ? ('SAME_MOBILE' as const) : ('SAME_EMAIL' as const),
    }));
  }

  async add(companyId: number, input: ContactInput, actor: number): Promise<ContactRecord> {
    return this.prisma.$transaction(async (tx) => {
      const hasPrimary = (await tx.company_persons.count({ where: { company_id: companyId, is_primary: true, is_active: true, deleted_at: null } })) > 0;
      const p = await tx.persons.create({ data: { name: input.name, mobile: input.mobile, email: input.email, created_by: actor }, select: { person_id: true } });
      const cp = await tx.company_persons.create({
        data: { company_id: companyId, person_id: p.person_id, designation: input.designation, is_primary: !hasPrimary, created_by: actor },
        include: INCLUDE,
      });
      if (!hasPrimary) await this.syncCompanyContact(tx, companyId, actor);
      await this.log(tx, companyId, 'CONTACT_ADDED', `Contact ${input.name} added`, actor, { company_person_id: cp.company_person_id });
      return toRecord(cp);
    });
  }

  async update(companyPersonId: number, input: ContactInput, actor: number): Promise<ContactRecord> {
    return this.prisma.$transaction(async (tx) => {
      const cur = await tx.company_persons.findFirstOrThrow({ where: { company_person_id: companyPersonId, deleted_at: null }, include: INCLUDE });
      await tx.persons.update({ where: { person_id: cur.person_id }, data: { name: input.name, mobile: input.mobile, email: input.email, updated_by: actor } });
      const cp = await tx.company_persons.update({ where: { company_person_id: companyPersonId }, data: { designation: input.designation, updated_by: actor }, include: INCLUDE });
      if (cp.is_primary) await this.syncCompanyContact(tx, cp.company_id, actor);
      await this.log(tx, cp.company_id, 'CONTACT_EDITED', `Contact ${input.name} edited`, actor, {
        company_person_id: companyPersonId,
        changes: { name: { from: cur.persons.name, to: input.name }, mobile: { from: cur.persons.mobile, to: input.mobile }, email: { from: cur.persons.email, to: input.email }, designation: { from: cur.designation, to: input.designation } },
      });
      return toRecord(cp);
    });
  }

  async setPrimary(companyPersonId: number, actor: number): Promise<ContactRecord> {
    return this.prisma.$transaction(async (tx) => {
      const cur = await tx.company_persons.findFirstOrThrow({ where: { company_person_id: companyPersonId, deleted_at: null } });
      await tx.company_persons.updateMany({ where: { company_id: cur.company_id, is_primary: true, deleted_at: null }, data: { is_primary: false, updated_by: actor } });
      const cp = await tx.company_persons.update({ where: { company_person_id: companyPersonId }, data: { is_primary: true, updated_by: actor }, include: INCLUDE });
      await this.syncCompanyContact(tx, cur.company_id, actor);
      await this.log(tx, cur.company_id, 'CONTACT_PRIMARY_CHANGED', `${cp.persons.name} is now the primary contact`, actor, { company_person_id: companyPersonId });
      return toRecord(cp);
    });
  }

  async markLeft(companyPersonId: number, actor: number): Promise<ContactRecord> {
    return this.prisma.$transaction(async (tx) => {
      const cur = await tx.company_persons.findFirstOrThrow({ where: { company_person_id: companyPersonId, deleted_at: null } });
      const cp = await tx.company_persons.update({ where: { company_person_id: companyPersonId }, data: { is_active: false, is_primary: false, updated_by: actor }, include: INCLUDE });
      const successor = await this.promoteIfNeeded(tx, cur.company_id, cur.is_primary, actor);
      await this.repointLeads(tx, cur.company_id, cur.person_id, successor?.person_id ?? null, actor);
      await this.log(tx, cur.company_id, 'CONTACT_LEFT', `${cp.persons.name} left the company`, actor, { company_person_id: companyPersonId });
      return toRecord(cp);
    });
  }

  async isUsed(companyPersonId: number): Promise<boolean> {
    const cp = await this.prisma.company_persons.findFirst({ where: { company_person_id: companyPersonId }, select: { company_id: true, person_id: true } });
    if (!cp) return false;
    const [comms, follow, leads] = await Promise.all([
      this.prisma.crm_communications.count({ where: { company_id: cp.company_id, contact_id: cp.person_id, deleted_at: null } }),
      this.prisma.crm_follow_ups.count({ where: { company_id: cp.company_id, contact_id: cp.person_id, deleted_at: null } }),
      this.prisma.leads.count({ where: { company_id: cp.company_id, person_id: cp.person_id, deleted_at: null } }),
    ]);
    return comms + follow + leads > 0;
  }

  async softDelete(companyPersonId: number, actor: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const cur = await tx.company_persons.findFirstOrThrow({ where: { company_person_id: companyPersonId, deleted_at: null }, include: INCLUDE });
      await tx.company_persons.update({ where: { company_person_id: companyPersonId }, data: { deleted_at: new Date(), deleted_by: actor, is_primary: false } });
      await this.promoteIfNeeded(tx, cur.company_id, cur.is_primary, actor);
      await this.log(tx, cur.company_id, 'CONTACT_DELETED', `Contact ${cur.persons.name} deleted`, actor, { company_person_id: companyPersonId });
    });
  }

  // ---------------------------------------------------------------------- helpers ----

  /** When the primary contact goes away, the earliest remaining active contact takes over. */
  private async promoteIfNeeded(tx: Tx, companyId: number, wasPrimary: boolean, actor: number) {
    if (!wasPrimary) return null;
    const next = await tx.company_persons.findFirst({
      where: { company_id: companyId, is_active: true, deleted_at: null, is_primary: false },
      orderBy: { company_person_id: 'asc' },
    });
    if (next) await tx.company_persons.update({ where: { company_person_id: next.company_person_id }, data: { is_primary: true, updated_by: actor } });
    await this.syncCompanyContact(tx, companyId, actor);
    return next;
  }

  /**
   * A lead keeps a pointer to the contact it was made with, and the database refuses to save a lead
   * whose contact is no longer active at the company. Move those pointers to the new primary contact.
   * Converted leads are locked and left alone.
   */
  private async repointLeads(tx: Tx, companyId: number, fromPersonId: number, toPersonId: number | null, actor: number) {
    await tx.leads.updateMany({
      where: { company_id: companyId, person_id: fromPersonId, deleted_at: null, NOT: { lead_stage: 'Converted' } },
      data: { person_id: toPersonId, updated_by: actor },
    });
  }

  /** companies.contact_person / designation / mobile / email mirror the primary contact (Sales Fields sheet fields 13-16). */
  private async syncCompanyContact(tx: Tx, companyId: number, actor: number) {
    const primary = await tx.company_persons.findFirst({
      where: { company_id: companyId, is_primary: true, is_active: true, deleted_at: null },
      include: INCLUDE,
    });
    await tx.companies.update({
      where: { company_id: companyId },
      data: {
        contact_person: primary?.persons.name ?? null,
        designation: primary?.designation ?? null,
        mobile: primary?.persons.mobile ?? null,
        email: primary?.persons.email ?? null,
        updated_by: actor,
      },
    });
  }

  private async log(tx: Tx, companyId: number, event: string, summary: string, actor: number, details: Record<string, unknown>) {
    await tx.activity_logs.create({
      data: { entity_type: 'COMPANY', entity_id: companyId, event, summary, details: details as Prisma.InputJsonValue, performed_by: actor },
    });
  }
}
