import { SalesLeadRepositoryPort, LeadByUser, ConvertContext } from '../ports/sales-lead.repository.port';
import { SalesActor } from '../ports/sales-access-policy.port';
import { NotFoundSalesError } from '../../domain/errors/sales.errors';

export interface LeadForm {
  company: ConvertContext['company'];
  primary_contact: ConvertContext['primary_contact'];
  communication_count: number;
  /** Set when the company already has an open lead: the popup is not shown, that lead is opened instead. */
  open_lead: ConvertContext['open_lead'];
  /** Preview only; the real Lead ID is given when the user clicks Convert. */
  next_lead_code: string;
  defaults: {
    lead_source: string;
    lead_by: LeadByUser | null;
    status: 'New';
  };
  lead_sources: string[];
  service_fits: string[];
  lead_by_users: LeadByUser[];
}

/** Everything the "Convert to Lead" popup needs (BFD section 6, Part 1). */
export class GetLeadFormUseCase {
  constructor(private readonly repo: SalesLeadRepositoryPort) {}

  async execute(companyId: number, actor: SalesActor): Promise<LeadForm> {
    const ctx = await this.repo.getConvertContext(companyId);
    if (!ctx) throw new NotFoundSalesError('Company not found', 'COMPANY_NOT_FOUND', 'id');
    const [masters, nextCode] = await Promise.all([this.repo.getMasters(), this.repo.getNextLeadCode()]);

    return {
      company: ctx.company,
      primary_contact: ctx.primary_contact,
      communication_count: ctx.communication_count,
      open_lead: ctx.open_lead,
      next_lead_code: nextCode,
      defaults: {
        lead_source: ctx.company.is_client ? masters.existing_client_lead_source : masters.default_lead_source,
        lead_by: masters.lead_by_users.find((u) => u.emp_id === actor.emp_id) ?? null,
        status: 'New',
      },
      lead_sources: masters.lead_sources,
      service_fits: masters.service_fits,
      lead_by_users: masters.lead_by_users,
    };
  }
}
