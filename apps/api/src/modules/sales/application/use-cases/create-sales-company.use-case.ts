import { SalesCompanyRepositoryPort, SalesCompanyDetail } from '../ports/sales-company.repository.port';
import { FieldValidationError, DuplicateCompanyError } from '../../domain/errors/sales.errors';
import { applyCompanyDefaults, validateCompany } from '../../domain/services/company-validator.service';
import { mergeCompanyFields, mergeContact } from '../../domain/services/company-input.service';

export interface CreateSalesCompanyInput {
  company: Record<string, unknown>;
  contact?: Record<string, unknown>;
  /** The user confirmed "This is a different company" after a duplicate warning. */
  confirm_duplicate?: boolean;
  actor_emp_id: number;
}

export class CreateSalesCompanyUseCase {
  constructor(private readonly repo: SalesCompanyRepositoryPort) {}

  async execute(input: CreateSalesCompanyInput): Promise<SalesCompanyDetail & { duplicate_confirmed: boolean }> {
    const fields = applyCompanyDefaults(mergeCompanyFields(null, input.company));
    const contact = mergeContact(null, input.contact);

    const errors = validateCompany(fields, contact);
    if (errors.length > 0) throw new FieldValidationError(errors);

    const matches = await this.repo.findDuplicates({
      name: fields.name,
      city: fields.city,
      mobile: contact.mobile,
      email: contact.email,
    });
    if (matches.length > 0 && !input.confirm_duplicate) throw new DuplicateCompanyError(matches);

    const created = await this.repo.create({
      fields,
      contact,
      actor_emp_id: input.actor_emp_id,
      confirmed_duplicates: input.confirm_duplicate ? matches : [],
    });

    const detail = await this.repo.getDetail(created.company_id);
    if (!detail) throw new Error('Company was created but could not be read back');
    return { ...detail, duplicate_confirmed: input.confirm_duplicate === true && matches.length > 0 };
  }
}
