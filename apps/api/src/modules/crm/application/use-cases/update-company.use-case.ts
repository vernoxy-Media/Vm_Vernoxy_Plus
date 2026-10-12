import { CompanyRepositoryPort, CompanyDetail } from '../ports/company.repository.port';
import { PersonRepositoryPort } from '../ports/person.repository.port';
import { IndustryCatalogPort } from '../ports/industry-catalog.port';
import { CustomerTypeCatalogPort } from '../ports/customer-type-catalog.port';
import { EmployeeDirectoryPort } from '../ports/employee-directory.port';
import { CrmUnitOfWorkPort } from '../ports/unit-of-work.port';
import { CrmNormalizationService } from '../../domain/services/crm-normalization.service';
import {
  ValidationDomainError,
  NotFoundDomainError,
  ConflictDomainError,
  UnprocessableDomainError,
} from '../../domain/errors/crm.errors';

export interface UpdateCompanyInput {
  id: number;
  name?: string;
  parent_company_id?: number | null;
  customer_type_id?: number;
  industry_id?: number;
  sub_industry_id?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  owner_id?: number | null;
  is_active?: boolean;
  channels?: Array<{
    channel_id?: number;
    channel_type: string;
    value: string;
    label?: string | null;
    is_primary?: boolean;
  }>;
  contacts?: Array<{
    company_person_id?: number;
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
    reports_to_company_person_id?: number | null;
    reports_to_index?: number | null;
  }>;
  acting_admin_id: number;
}

export class UpdateCompanyUseCase {
  constructor(
    private readonly companyRepo: CompanyRepositoryPort,
    private readonly personRepo: PersonRepositoryPort,
    private readonly industryCatalog: IndustryCatalogPort,
    private readonly customerTypeCatalog: CustomerTypeCatalogPort,
    private readonly employeeDirectory: EmployeeDirectoryPort,
    private readonly uow: CrmUnitOfWorkPort,
  ) {}

  async execute(input: UpdateCompanyInput): Promise<CompanyDetail> {
    const { id, acting_admin_id } = input;

    const existing = await this.companyRepo.findById(id);
    if (!existing) {
      throw new NotFoundDomainError(`Company with ID ${id} not found`, 'COMPANY_NOT_FOUND', 'id');
    }

    // 1. Validate parent_company_id
    if (input.parent_company_id !== undefined && input.parent_company_id !== null) {
      if (input.parent_company_id === id) {
        throw new ConflictDomainError('Company cannot be its own parent', 'PARENT_CYCLE', 'parent_company_id');
      }
      const parent = await this.companyRepo.findById(input.parent_company_id);
      if (!parent) {
        throw new UnprocessableDomainError('Parent company does not exist or is deleted', 'PARENT_COMPANY_INVALID', 'parent_company_id');
      }
    }

    // 2. Validate Catalogs
    const effectiveIndustryId = input.industry_id ?? existing.industry_id;
    if (input.industry_id !== undefined) {
      const ind = await this.industryCatalog.findIndustryById(input.industry_id);
      if (!ind || !ind.is_active) {
        throw new UnprocessableDomainError('Industry is inactive or not found', 'INDUSTRY_INACTIVE', 'industry_id');
      }
    }

    const effectiveSubIndustryId = input.sub_industry_id !== undefined ? input.sub_industry_id : existing.sub_industry_id;
    if (effectiveSubIndustryId) {
      const subInd = await this.industryCatalog.findIndustryById(effectiveSubIndustryId);
      if (!subInd || !subInd.is_active) {
        throw new UnprocessableDomainError('Sub-industry is inactive or not found', 'INDUSTRY_INACTIVE', 'sub_industry_id');
      }
      if (subInd.parent_id !== effectiveIndustryId) {
        throw new UnprocessableDomainError('Sub-industry does not belong to the selected industry', 'SUB_INDUSTRY_MISMATCH', 'sub_industry_id');
      }
    }

    if (input.customer_type_id !== undefined) {
      const ct = await this.customerTypeCatalog.findCustomerTypeById(input.customer_type_id);
      if (!ct || !ct.is_active) {
        throw new UnprocessableDomainError('Customer type is inactive or not found', 'CUSTOMER_TYPE_INACTIVE', 'customer_type_id');
      }
    }

    if (input.owner_id !== undefined && input.owner_id !== null) {
      const owner = await this.employeeDirectory.findEmployeeById(input.owner_id);
      if (!owner || owner.status !== 'Active') {
        throw new UnprocessableDomainError('Owner employee is invalid or inactive', 'OWNER_INVALID', 'owner_id');
      }
    }

    // 3. Channels diffing & validation
    let normalizedChannels: Array<{
      channel_id?: number;
      channel_type: string;
      value: string;
      label: string | null;
      is_primary: boolean;
    }> | null = null;

    if (input.channels !== undefined) {
      if (input.channels.length > 20) {
        throw new ValidationDomainError('Maximum 20 channels allowed', 'VALIDATION_ERROR', 'channels');
      }

      normalizedChannels = [];
      const primaryChannelsByType = new Set<string>();
      const seenChannelKeys = new Set<string>();

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
          channel_id: ch.channel_id,
          channel_type: ch.channel_type,
          value: normalizedVal,
          label: ch.label ? ch.label.trim() : null,
          is_primary: isPrimary,
        });
      }
    }

    // 4. Contacts diffing & validation
    let normalizedContacts: Array<{
      company_person_id?: number;
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
      reports_to_company_person_id?: number | null;
      reports_to_index?: number | null;
    }> | null = null;

    if (input.contacts !== undefined) {
      if (input.contacts.length > 50) {
        throw new ValidationDomainError('Maximum 50 contacts allowed', 'VALIDATION_ERROR', 'contacts');
      }

      normalizedContacts = [];
      let hasPrimaryContact = false;

      for (let i = 0; i < input.contacts.length; i++) {
        const c = input.contacts[i];
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

        if (c.company_person_id) {
          // Existing link update (person data NOT editable)
          normalizedContacts.push({
            company_person_id: c.company_person_id,
            designation: c.designation ? c.designation.trim() : null,
            department_id: c.department_id || null,
            is_primary: isPrimary,
            reports_to_company_person_id: c.reports_to_company_person_id || null,
            reports_to_index: c.reports_to_index ?? null,
          });
        } else if (c.person_id) {
          // Linking existing person (nested person data is ignored as specified)
          const person = await this.personRepo.findById(c.person_id);
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
            reports_to_company_person_id: c.reports_to_company_person_id || null,
            reports_to_index: c.reports_to_index ?? null,
          });
        } else if (c.person) {
          // New contact row with nested person
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
              reports_to_company_person_id: c.reports_to_company_person_id || null,
              reports_to_index: c.reports_to_index ?? null,
            });
          }
        }
      }

    // 5. Execute diff update in transaction
    await this.uow.runInTransaction(async (tx) => {
      const now = new Date();

      // 5.1 Update Company row
      const updateData: any = {
        updated_at: now,
        updated_by: acting_admin_id,
      };

      if (input.name !== undefined) {
        const normName = CrmNormalizationService.normalizeName(input.name);
        if (!normName) {
          throw new ValidationDomainError('Company name is required', 'VALIDATION_ERROR', 'name');
        }
        updateData.name = normName;
      }
      if (input.parent_company_id !== undefined) updateData.parent_company_id = input.parent_company_id;
      if (input.customer_type_id !== undefined) updateData.customer_type_id = input.customer_type_id;
      if (input.industry_id !== undefined) updateData.industry_id = input.industry_id;
      if (input.sub_industry_id !== undefined) updateData.sub_industry_id = input.sub_industry_id;
      if (input.address !== undefined) updateData.address = input.address ? input.address.trim() : null;
      if (input.city !== undefined) updateData.city = input.city ? input.city.trim() : null;
      if (input.state !== undefined) updateData.state = input.state ? input.state.trim() : null;
      if (input.country !== undefined) updateData.country = input.country ? input.country.trim() : null;
      if (input.owner_id !== undefined) updateData.owner_id = input.owner_id;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;

      await tx.companies.update({
        where: { company_id: id },
        data: updateData,
      });

      // 5.2 Channels diffing
      if (normalizedChannels !== null) {
        const retainedChannelIds: number[] = [];

        // Unset primary for matching channel types if any new primary is specified
        for (const ch of normalizedChannels) {
          if (ch.is_primary) {
            await tx.company_channels.updateMany({
              where: { company_id: id, channel_type: ch.channel_type, is_primary: true, deleted_at: null },
              data: { is_primary: false },
            });
          }
        }

        for (const ch of normalizedChannels) {
          if (ch.channel_id) {
            // Update existing channel
            await tx.company_channels.update({
              where: { channel_id: ch.channel_id },
              data: {
                channel_type: ch.channel_type,
                value: ch.value,
                label: ch.label,
                is_primary: ch.is_primary,
                updated_at: now,
                updated_by: acting_admin_id,
              },
            });
            retainedChannelIds.push(ch.channel_id);
          } else {
            // Create new channel
            const createdCh = await tx.company_channels.create({
              data: {
                company_id: id,
                channel_type: ch.channel_type,
                value: ch.value,
                label: ch.label,
                is_primary: ch.is_primary,
                created_by: acting_admin_id,
              },
            });
            retainedChannelIds.push(createdCh.channel_id);
          }
        }

        // Soft delete channels not mentioned
        await tx.company_channels.updateMany({
          where: {
            company_id: id,
            deleted_at: null,
            channel_id: { notIn: retainedChannelIds },
          },
          data: {
            deleted_at: now,
            deleted_by: acting_admin_id,
          },
        });
      }

      // 5.3 Contacts diffing
      if (normalizedContacts !== null) {
        // Unset previous primary contacts if any new contact is designated as primary
        if (normalizedContacts.some((c) => c.is_primary)) {
          await tx.company_persons.updateMany({
            where: { company_id: id, is_primary: true, deleted_at: null },
            data: { is_primary: false },
          });
        }

        const retainedCpIds: number[] = [];
        const indexToCpIdMap = new Map<number, number>();

        for (let i = 0; i < normalizedContacts.length; i++) {
          const c = normalizedContacts[i];

          let targetCpId = c.company_person_id;
          if (!targetCpId && c.person_id) {
            const existingCp = await tx.company_persons.findFirst({
              where: { company_id: id, person_id: c.person_id, deleted_at: null },
            });
            if (existingCp) {
              targetCpId = existingCp.company_person_id;
            }
          }

          if (targetCpId) {
            // Update existing company_persons row
            const updatedCp = await tx.company_persons.update({
              where: { company_person_id: targetCpId },
              data: {
                designation: c.designation,
                department_id: c.department_id,
                is_primary: c.is_primary,
                reports_to_id: c.reports_to_company_person_id,
                updated_at: now,
                updated_by: acting_admin_id,
              },
            });
            retainedCpIds.push(updatedCp.company_person_id);
            indexToCpIdMap.set(i, updatedCp.company_person_id);
          } else {
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

            const createdCp = await tx.company_persons.create({
              data: {
                company_id: id,
                person_id: personId!,
                designation: c.designation,
                department_id: c.department_id,
                is_primary: c.is_primary,
                reports_to_id: c.reports_to_company_person_id || null,
                created_by: acting_admin_id,
              },
            });
            retainedCpIds.push(createdCp.company_person_id);
            indexToCpIdMap.set(i, createdCp.company_person_id);
          }
        }

        // Soft delete company_persons not mentioned (persons themselves are NEVER deleted!)
        await tx.company_persons.updateMany({
          where: {
            company_id: id,
            deleted_at: null,
            company_person_id: { notIn: retainedCpIds },
          },
          data: {
            deleted_at: now,
            deleted_by: acting_admin_id,
          },
        });

        // Resolve reports_to_index for contacts
        for (let i = 0; i < normalizedContacts.length; i++) {
          const c = normalizedContacts[i];
          if (c.reports_to_index !== null && c.reports_to_index !== undefined) {
            const targetCpId = indexToCpIdMap.get(c.reports_to_index);
            const selfCpId = indexToCpIdMap.get(i);
            if (targetCpId && selfCpId) {
              await tx.company_persons.update({
                where: { company_person_id: selfCpId },
                data: { reports_to_id: targetCpId },
              });
            }
          }
        }
      }
    });

    // 6. Return fresh company detail
    const detail = await this.companyRepo.getDetail(id);
    return detail!;
  }
}
