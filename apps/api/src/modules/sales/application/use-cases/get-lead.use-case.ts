import { SalesLeadRepositoryPort, LeadDetail, LeadMasters } from '../ports/sales-lead.repository.port';
import { NotFoundSalesError } from '../../domain/errors/sales.errors';

export class GetLeadUseCase {
  constructor(private readonly repo: SalesLeadRepositoryPort) {}

  async execute(leadId: number, now: Date = new Date()): Promise<LeadDetail> {
    const detail = await this.repo.getDetail(leadId, now);
    if (!detail) throw new NotFoundSalesError('Lead not found', 'LEAD_NOT_FOUND', 'id');
    return detail;
  }
}

export class GetLeadMastersUseCase {
  constructor(private readonly repo: SalesLeadRepositoryPort) {}

  execute(): Promise<LeadMasters> {
    return this.repo.getMasters();
  }
}
