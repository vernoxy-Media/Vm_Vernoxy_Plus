import { CompanyRepositoryPort, CompanyDetail } from '../ports/company.repository.port';
import { PersonRepositoryPort } from '../ports/person.repository.port';
import { IndustryCatalogPort } from '../ports/industry-catalog.port';
import { CustomerTypeCatalogPort } from '../ports/customer-type-catalog.port';
import { EmployeeDirectoryPort } from '../ports/employee-directory.port';
import { CrmUnitOfWorkPort } from '../ports/unit-of-work.port';
import { CrmNormalizationService } from '../../domain/services/crm-normalization.service';
import {
  ValidationDomainError,
  ConflictDomainError,
  UnprocessableDomainError,
} from '../../domain/errors/crm.errors';

export interface CreateCompanyInput {
  name: string;
  parent_company_id?: number | null;
  customer_type_id: number;
  industry_id: number;
  sub_industry_id?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  owner_id?: number | null;
  channels?: Array<{
    channel_type: string;
    value: string;
    label?: string | null;
    is_primary?: boolean;
  }>;
  contacts?: Array<{
    person_id?: number;
    person?: {
      name: string;
      email?: string | null;
      mobile?: string | null;
      linkedin_url?: string | null;
    };
    designation?: string | null;
    department_id?: number | null;
    is_primary?: boolean;
    reports_to_index?: number | null;
  }>;
  acting_admin_id: number;
}

export class CreateCompanyUseCase {
  constructor(
    private readonly companyRepo: CompanyRepositoryPort,
    private readonly personRepo: PersonRepositoryPort,
    private readonly industryCatalog: IndustryCatalogPort,
    private readonly customerTypeCatalog: CustomerTypeCatalogPort,
    private readonly employeeDirectory: EmployeeDirectoryPort,
    private readonly uow: CrmUnitOfWorkPort,
  ) {}

  async execute(input: CreateCompanyInput): Promise<CompanyDetail> {
    const { acting_admin_id } = input;

    // 1. Normalize company name & strings
    const name = CrmNormalizationService.normalizeName(input.name);
    if (!name) {
      throw new ValidationDomainError('Company name is required', 'VALIDATION_ERROR', 'name');
    }
    const address = input.address ? input.address.trim() : null;
    const city = input.city ? input.city.trim() : null;
    const state = input.state ? input.state.trim() : null;
    const country = input.country ? input.country.trim() : null;

    // 2. Validate Catalogs
    const customerType = await this.customerTypeCatalog.findCustomerTypeById(input.customer_type_id);
    if (!customerType || !customerType.is_active) {
      throw new UnprocessableDomainError('Customer type is inactive or not found', 'CUSTOMER_TYPE_INACTIVE', 'customer_type_id');
    }

    const industry = await this.industryCatalog.findIndustryById(input.industry_id);
    if (!industry || !industry.is_active) {
      throw new UnprocessableDomainError('Industry is inactive or not found', 'INDUSTRY_INACTIVE', 'industry_id');
    }

    if (input.sub_industry_id) {
      const subIndustry = await this.industryCatalog.findIndustryById(input.sub_industry_id);
      if (!subIndustry || !subIndustry.is_active) {
        throw new UnprocessableDomainError('Sub-industry is inactive or not found', 'INDUSTRY_INACTIVE', 'sub_industry_id');
      }
      if (subIndustry.parent_id !== input.industry_id) {
        throw new UnprocessableDomainError('Sub-industry does not belong to the selected industry', 'SUB_INDUSTRY_MISMATCH', 'sub_industry_id');
      }
    }

    if (input.owner_id) {
      const owner = await this.employeeDirectory.findEmployeeById(input.owner_id);
      if (!owner || owner.status !== 'Active') {
        throw new UnprocessableDomainError('Owner employee is invalid or inactive', 'OWNER_INVALID', 'owner_id');
      }
    }

    if (input.parent_company_id) {
      const parent = await this.companyRepo.findById(input.parent_company_id);
      if (!parent) {
        throw new UnprocessableDomainError('Parent company does not exist or is deleted', 'PARENT_COMPANY_INVALID', 'parent_company_id');
      }
    }

    // 3. Normalize & validate channels
    const normalizedChannels: Array<{
      channel_type: string;
      value: string;
      label: string | null;
      is_primary: boolean;
    }> = [];

    const primaryChannelsByType = new Set<string>();
    const seenChannelKeys = new Set<string>();

    if (input.channels && input.channels.length > 0) {
      if (input.channels.length > 20) {
        throw new ValidationDomainError('Maximum 20 channels allowed', 'VALIDATION_ERROR', 'channels');
      }

      for (let i = 0; i < input.channels.length; i++) {
        const ch = input.channels[i];
        let normalizedVal: string;
        try {
          normalizedVal = CrmNormalizationService.normalizeChannelValue(ch.channel_type, ch.value);
        } catch (err: any) {
          throw new ValidationDomainError(
            err.message || 'Invalid channel value',
            'VALIDATION_ERROR',
            `channels[${i}].value`,
          );
        }

        const isPrimary = Boolean(ch.is_primary);
        if (isPrimary) {
          if (primaryChannelsByType.has(ch.channel_type)) {
            throw new ConflictDomainError(
              `Multiple primary channels for channel type ${ch.channel_type}`,
              'PRIMARY_CONFLICT',
              `channels[${i}].is_primary`,
            );
          }
          primaryChannelsByType.add(ch.channel_type);
        }

        const key = `${ch.channel_type}:${normalizedVal.toLowerCase()}`;
        if (seenChannelKeys.has(key)) {
          throw new ConflictDomainError(
            `Duplicate channel ${ch.channel_type}: ${normalizedVal}`,
            'DUPLICATE_CHANNEL',
            `channels[${i}].value`,
          );
        }
        seenChannelKeys.add(key);

        normalizedChannels.push({
          channel_type: ch.channel_type,
          value: normalizedVal,
          label: ch.label ? ch.label.trim() : null,
          is_primary: isPrimary,
        });
      }
    }

    // 4. Normalize & validate contacts
    const normalizedContacts: Array<{
      person_id?: number;
      person?: {
        name: string;
        email: string | null;
        mobile: string | null;
        linkedin_url: string | null;
      };
      designation: string | null;
      department_id: number | null;
      is_primary: boolean;
      reports_to_index: number | null;
    }> = [];

    let hasPrimaryContact = false;

    if (input.contacts && input.contacts.length > 0) {
      if (input.contacts.length > 50) {
        throw new ValidationDomainError('Maximum 50 contacts allowed', 'VALIDATION_ERROR', 'contacts');
      }

      for (let i = 0; i < input.contacts.length; i++) {
        const c = input.contacts[i];
        const hasPersonId = Boolean(c.person_id);
        const hasPerson = Boolean(c.person);

        if ((hasPersonId && hasPerson) || (!hasPersonId && !hasPerson)) {
          throw new ValidationDomainError(
            'Exactly one of person_id or person must be provided',
            'VALIDATION_ERROR',
            `contacts[${i}]`,
          );
        }

        const isPrimary = Boolean(c.is_primary);
        if (isPrimary) {
          if (hasPrimaryContact) {
            throw new ConflictDomainError(
              'Multiple primary contacts are not allowed',
              'PRIMARY_CONFLICT',
              `contacts[${i}].is_primary`,
            );
          }
          hasPrimaryContact = true;
        }

        if (c.reports_to_index !== undefined && c.reports_to_index !== null) {
          if (
            c.reports_to_index < 0 ||
            c.reports_to_index >= input.contacts.length ||
            c.reports_to_index === i
          ) {
            throw new ValidationDomainError(
              'Invalid reports_to_index',
              'VALIDATION_ERROR',
              `contacts[${i}].reports_to_index`,
            );
          }
        }

        if (hasPersonId) {
          const person = await this.personRepo.findById(c.person_id!);
          if (!person) {
            throw new UnprocessableDomainError(
              `Person ${c.person_id} not found`,
              'PERSON_NOT_FOUND',
              `contacts[${i}].person_id`,
            );
          }
          normalizedContacts.push({
            person_id: c.person_id,
            designation: c.designation ? c.designation.trim() : null,
            department_id: c.department_id || null,
            is_primary: isPrimary,
            reports_to_index: c.reports_to_index ?? null,
          });
        } else {
          // nested person
          const p = c.person!;
          const pName = CrmNormalizationService.normalizeName(p.name);
          if (!pName) {
            throw new ValidationDomainError('Contact name is required', 'VALIDATION_ERROR', `contacts[${i}].person.name`);
          }

          let normEmail: string | null = null;
          if (p.email && p.email.trim()) {
            try {
              normEmail = CrmNormalizationService.normalizeEmail(p.email);
            } catch (err: any) {
              throw new ValidationDomainError(
                err.message || 'Invalid email format',
                'VALIDATION_ERROR',
                `contacts[${i}].person.email`,
              );
            }
          }

          let normMobile: string | null = null;
          if (p.mobile && p.mobile.trim()) {
            try {
              normMobile = CrmNormalizationService.normalizePhone(p.mobile);
            } catch (err: any) {
              throw new ValidationDomainError(
                err.message || 'Invalid mobile format',
                'VALIDATION_ERROR',
                `contacts[${i}].person.mobile`,
              );
            }
          }

          if (!normEmail && !normMobile) {
            throw new UnprocessableDomainError(
              'Contact needs email or mobile',
              'CONTACT_NEEDS_EMAIL_OR_MOBILE',
              `contacts[${i}].person`,
            );
          }

          let normLinkedin: string | null = null;
          if (p.linkedin_url && p.linkedin_url.trim()) {
            try {
              normLinkedin = CrmNormalizationService.normalizeUrl(p.linkedin_url);
            } catch (err: any) {
              throw new ValidationDomainError(
                err.message || 'Invalid linkedin url',
                'VALIDATION_ERROR',
                `contacts[${i}].person.linkedin_url`,
              );
            }
          }

          normalizedContacts.push({
            person: {
              name: pName,
              email: normEmail,
              mobile: normMobile,
              linkedin_url: normLinkedin,
            },
            designation: c.designation ? c.designation.trim() : null,
            department_id: c.department_id || null,
            is_primary: isPrimary,
            reports_to_index: c.reports_to_index ?? null,
          });
        }
      }
    }

    // 5. Execute everything in ONE UnitOfWork transaction
    const createdCompanyId = await this.uow.runInTransaction(async (tx) => {
      // 5.1 Insert Company
      const companyRow = await tx.companies.create({
        data: {
          name,
          parent_company_id: input.parent_company_id || null,
          customer_type_id: input.customer_type_id,
          industry_id: input.industry_id,
          sub_industry_id: input.sub_industry_id || null,
          address,
          city,
          state,
          country,
          owner_id: input.owner_id || null,
          is_active: true,
          created_by: acting_admin_id,
        },
      });

      const companyId = companyRow.company_id;

      // 5.2 Insert Channels
      for (const ch of normalizedChannels) {
        await tx.company_channels.create({
          data: {
            company_id: companyId,
            channel_type: ch.channel_type,
            value: ch.value,
            label: ch.label,
            is_primary: ch.is_primary,
            created_by: acting_admin_id,
          },
        });
      }

      // 5.3 Insert/Link Contacts & CompanyPersons
      const insertedCompanyPersonIds: number[] = [];

      for (let i = 0; i < normalizedContacts.length; i++) {
        const c = normalizedContacts[i];
        let personId = c.person_id;

        if (!personId && c.person) {
          const personRow = await tx.persons.create({
            data: {
              name: c.person.name,
              email: c.person.email,
              mobile: c.person.mobile,
              linkedin_url: c.person.linkedin_url,
              created_by: acting_admin_id,
            },
          });
          personId = personRow.person_id;
        }

        const cpRow = await tx.company_persons.create({
          data: {
            company_id: companyId,
            person_id: personId!,
            designation: c.designation,
            department_id: c.department_id,
            is_primary: c.is_primary,
            reports_to_id: null,
            created_by: acting_admin_id,
          },
        });

        insertedCompanyPersonIds.push(cpRow.company_person_id);
      }

      // 5.4 Resolve reports_to_index
      for (let i = 0; i < normalizedContacts.length; i++) {
        const c = normalizedContacts[i];
        if (c.reports_to_index !== null && c.reports_to_index !== undefined) {
          const targetCpId = insertedCompanyPersonIds[c.reports_to_index];
          const selfCpId = insertedCompanyPersonIds[i];
          await tx.company_persons.update({
            where: { company_person_id: selfCpId },
            data: { reports_to_id: targetCpId },
          });
        }
      }

      return companyId;
    });

    // 6. Return fresh company detail
    const detail = await this.companyRepo.getDetail(createdCompanyId);
    return detail!;
  }
}
