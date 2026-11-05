import { SalesContactRepositoryPort, ContactRecord, ContactInput } from '../ports/sales-contact.repository.port';
import {
  ConflictSalesError,
  DuplicateContactError,
  FieldValidationError,
  NotFoundSalesError,
} from '../../domain/errors/sales.errors';
import { validateContact } from '../../domain/services/activity-validator.service';
import { cleanText, normalizeEmail, normalizeMobile } from '../../domain/services/sales-normalization.service';

type RawContact = { name?: unknown; designation?: unknown; mobile?: unknown; email?: unknown };

function toInput(raw: RawContact, base?: ContactRecord): ContactInput & { name: string } {
  const pick = <T>(v: unknown, fallback: T, norm: (x: unknown) => T) => (v === undefined ? fallback : norm(v));
  return {
    name: pick(raw.name, base?.name ?? '', (v) => cleanText(v) ?? ''),
    designation: pick(raw.designation, base?.designation ?? null, cleanText),
    mobile: pick(raw.mobile, base?.mobile ?? null, normalizeMobile),
    email: pick(raw.email, base?.email ?? null, normalizeEmail),
  };
}

/** Company contacts (BFD section 5, Part 1). Open to every Sales user and the Admin. */
export class ContactUseCases {
  constructor(private readonly repo: SalesContactRepositoryPort) {}

  async list(companyId: number): Promise<ContactRecord[]> {
    if (!(await this.repo.companyExists(companyId))) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');
    return this.repo.list(companyId);
  }

  async add(companyId: number, raw: RawContact & { confirm_duplicate?: boolean }, actorEmpId: number): Promise<ContactRecord> {
    if (!(await this.repo.companyExists(companyId))) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');
    const input = toInput(raw);
    const errors = validateContact({ ...input, name: input.name || null });
    if (errors.length > 0) throw new FieldValidationError(errors);
    await this.warnIfSamePersonElsewhere(companyId, input, raw.confirm_duplicate === true);
    return this.repo.add(companyId, input, actorEmpId);
  }

  async update(companyPersonId: number, raw: RawContact & { confirm_duplicate?: boolean }, actorEmpId: number): Promise<ContactRecord> {
    const current = await this.mustGet(companyPersonId);
    const input = toInput(raw, current);
    const errors = validateContact({ ...input, name: input.name || null });
    if (errors.length > 0) throw new FieldValidationError(errors);
    if (input.mobile !== current.mobile || input.email !== current.email) {
      await this.warnIfSamePersonElsewhere(
        current.company_id,
        { ...input, mobile: input.mobile !== current.mobile ? input.mobile : null, email: input.email !== current.email ? input.email : null },
        raw.confirm_duplicate === true,
        current.person_id,
      );
    }
    return this.repo.update(companyPersonId, input, actorEmpId);
  }

  /** Only one contact can be primary. */
  async makePrimary(companyPersonId: number, actorEmpId: number): Promise<ContactRecord> {
    const current = await this.mustGet(companyPersonId);
    if (!current.is_active) {
      throw new ConflictSalesError('This person has left the company and cannot be the primary contact.', 'CONTACT_LEFT');
    }
    return current.is_primary ? current : this.repo.setPrimary(companyPersonId, actorEmpId);
  }

  /** "Left the company": stays in the history, is not offered in new conversations. */
  async markLeft(companyPersonId: number, actorEmpId: number): Promise<ContactRecord> {
    const current = await this.mustGet(companyPersonId);
    return current.is_active ? this.repo.markLeft(companyPersonId, actorEmpId) : current;
  }

  /** Allowed only when the contact is not used anywhere; otherwise mark "Left the company". */
  async remove(companyPersonId: number, actorEmpId: number): Promise<void> {
    await this.mustGet(companyPersonId);
    if (await this.repo.isUsed(companyPersonId)) {
      throw new ConflictSalesError(
        'This contact is used in conversations or leads and cannot be deleted. Mark them as "Left the company" instead.',
        'CONTACT_IN_USE',
      );
    }
    await this.repo.softDelete(companyPersonId, actorEmpId);
  }

  private async mustGet(id: number): Promise<ContactRecord> {
    const c = await this.repo.get(id);
    if (!c) throw new NotFoundSalesError('Contact not found', 'CONTACT_NOT_FOUND', 'id');
    return c;
  }

  private async warnIfSamePersonElsewhere(
    companyId: number,
    input: { mobile: string | null; email: string | null },
    confirmed: boolean,
    excludePersonId?: number,
  ): Promise<void> {
    if (confirmed || (!input.mobile && !input.email)) return;
    const matches = await this.repo.findDuplicates({
      mobile: input.mobile,
      email: input.email,
      exclude_company_id: companyId,
      exclude_person_id: excludePersonId,
    });
    if (matches.length > 0) throw new DuplicateContactError(matches);
  }
}
