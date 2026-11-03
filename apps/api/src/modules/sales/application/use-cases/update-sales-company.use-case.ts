import { SalesCompanyRepositoryPort, SalesCompanyDetail } from '../ports/sales-company.repository.port';
import {
  FieldValidationError,
  DuplicateCompanyError,
  NotFoundSalesError,
  DuplicateMatch,
} from '../../domain/errors/sales.errors';
import { applyCompanyDefaults, validateCompany } from '../../domain/services/company-validator.service';
import { mergeCompanyFields, mergeContact } from '../../domain/services/company-input.service';
import { nameKey } from '../../domain/services/sales-normalization.service';

export interface UpdateSalesCompanyInput {
  company_id: number;
  /** Only the keys that were sent change; keys sent as null / "" are cleared. */
  company?: Record<string, unknown>;
  /** Edits the primary contact (the first contact of the company). */
  contact?: Record<string, unknown>;
  confirm_duplicate?: boolean;
  actor_emp_id: number;
}

export class UpdateSalesCompanyUseCase {
  constructor(private readonly repo: SalesCompanyRepositoryPort) {}

  async execute(input: UpdateSalesCompanyInput): Promise<SalesCompanyDetail> {
    const current = await this.repo.getDetail(input.company_id);
    if (!current) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');

    const primary = current.contacts.find((c) => c.is_primary) ?? null;
    const baseContact = primary
      ? { name: primary.name, designation: primary.designation, mobile: primary.mobile, email: primary.email }
      : null;

    const fields = applyCompanyDefaults(mergeCompanyFields(current.fields, input.company ?? {}));
    const contact = mergeContact(baseContact, input.contact);

    const errors = validateCompany(fields, contact);
    if (errors.length > 0) throw new FieldValidationError(errors);

    const mobileChanged = contact.mobile !== (baseContact?.mobile ?? null);
    const emailChanged = contact.email !== (baseContact?.email ?? null);
    const identityChanged =
      nameKey(fields.name) !== nameKey(current.fields.name) ||
      nameKey(fields.city) !== nameKey(current.fields.city) ||
      mobileChanged ||
      emailChanged;

    // Re-check duplicates only when something that defines identity changed.
    let confirmed: DuplicateMatch[] = [];
    if (identityChanged) {
      const matches = await this.repo.findDuplicates({
        name: fields.name,
        city: fields.city,
        mobile: mobileChanged ? contact.mobile : null,
        email: emailChanged ? contact.email : null,
        exclude_company_id: input.company_id,
      });
      if (matches.length > 0 && !input.confirm_duplicate) throw new DuplicateCompanyError(matches);
      if (input.confirm_duplicate) confirmed = matches;
    }

    await this.repo.update({
      company_id: input.company_id,
      fields,
      contact,
      actor_emp_id: input.actor_emp_id,
      confirmed_duplicates: confirmed,
    });

    const detail = await this.repo.getDetail(input.company_id);
    if (!detail) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');
    return detail;
  }
}
