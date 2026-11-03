import { SalesLeadRepositoryPort, LeadDetail } from '../ports/sales-lead.repository.port';
import { SalesNotifierPort } from '../ports/sales-notifier.port';
import { SalesActor } from '../ports/sales-access-policy.port';
import {
  FieldError,
  FieldValidationError,
  NotFoundSalesError,
  OpenLeadExistsError,
} from '../../domain/errors/sales.errors';
import { validateConvertToLead, normalizeServiceFit } from '../../domain/services/lead-validator.service';
import { cleanText } from '../../domain/services/sales-normalization.service';

export interface ConvertCompanyToLeadInput {
  company_id: number;
  lead_source?: string | null;
  /** Defaults to the user who is converting. */
  lead_by_id?: number | null;
  /** One or many Service Fit values (the popup is multi select). */
  service_fit?: unknown;
  first_note?: string | null;
  actor: SalesActor;
}

export class ConvertCompanyToLeadUseCase {
  constructor(
    private readonly repo: SalesLeadRepositoryPort,
    private readonly notifier: SalesNotifierPort,
  ) {}

  async execute(input: ConvertCompanyToLeadInput): Promise<LeadDetail> {
    const ctx = await this.repo.getConvertContext(input.company_id);
    if (!ctx) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');

    // "This company is already LEAD-0057 (Contacted)" - the UI opens that lead instead.
    if (ctx.open_lead) throw new OpenLeadExistsError(ctx.open_lead);

    const masters = await this.repo.getMasters();
    const fields = {
      // A client that gets a new lead for more work always has the source "Existing client".
      lead_source: ctx.company.is_client
        ? masters.existing_client_lead_source
        : (cleanText(input.lead_source) ?? masters.default_lead_source),
      lead_by_id: input.lead_by_id ?? input.actor.emp_id,
      service_fit: normalizeServiceFit(input.service_fit),
      first_note: cleanText(input.first_note),
    };

    const errors: FieldError[] = validateConvertToLead(fields);

    let leadSource = fields.lead_source;
    if (leadSource && !errors.some((e) => e.field === 'lead_source')) {
      const resolved = await this.repo.resolveLeadSource(leadSource);
      if (resolved) leadSource = resolved;
      else if (!ctx.company.is_client) errors.push({ field: 'lead_source', message: 'Choose a lead source from the list.' });
    }

    let serviceFit = fields.service_fit;
    if (serviceFit.length > 0 && !errors.some((e) => e.field === 'service_fit')) {
      const { labels, unknown } = await this.repo.resolveServiceFit(serviceFit);
      if (unknown.length > 0) {
        errors.push({ field: 'service_fit', message: `Choose Service Fit from the list (not found: ${unknown.join(', ')}).` });
      } else {
        serviceFit = labels;
      }
    }

    if (!errors.some((e) => e.field === 'lead_by_id') && !(await this.repo.isEligibleLeadBy(fields.lead_by_id))) {
      errors.push({ field: 'lead_by_id', message: 'Choose an active Sales user or Admin.' });
    }
    if (errors.length > 0) throw new FieldValidationError(errors);

    const created = await this.repo.createLead({
      company_id: ctx.company.company_id,
      person_id: ctx.primary_contact?.person_id ?? null,
      company_name: ctx.company.name,
      lead_source: leadSource as string,
      lead_by_id: fields.lead_by_id,
      service_fit: serviceFit,
      first_note: fields.first_note,
      actor_emp_id: input.actor.emp_id,
    });

    // "Lead By user gets a message if the lead was made for someone else." Never blocks the conversion.
    if (fields.lead_by_id !== input.actor.emp_id) {
      try {
        await this.notifier.leadAssigned({
          recipient_emp_id: fields.lead_by_id,
          lead_id: created.lead_id,
          lead_code: created.lead_code,
          company_name: ctx.company.name,
          assigned_by_emp_id: input.actor.emp_id,
        });
      } catch {
        /* best effort */
      }
    }

    const detail = await this.repo.getDetail(created.lead_id, new Date());
    if (!detail) throw new Error('Lead was created but could not be read back');
    return detail;
  }
}
