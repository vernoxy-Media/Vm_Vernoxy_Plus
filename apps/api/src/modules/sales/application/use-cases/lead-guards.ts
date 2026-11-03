import { SalesActor } from '../ports/sales-access-policy.port';
import { LeadWorkContext } from '../ports/sales-work.repository.port';
import { ConflictSalesError, ForbiddenSalesError, NotFoundSalesError } from '../../domain/errors/sales.errors';
import { canWorkOnLead } from '../../domain/services/lead-workflow.service';

export function assertLeadFound(lead: LeadWorkContext | null): LeadWorkContext {
  if (!lead) throw new NotFoundSalesError('Lead not found', 'LEAD_NOT_FOUND', 'id');
  return lead;
}

/** Only the Lead By user or the Admin works on a lead. */
export function assertCanWork(lead: LeadWorkContext, actor: SalesActor): void {
  if (!canWorkOnLead({ lead_by_id: lead.lead_by_id }, actor)) {
    throw new ForbiddenSalesError('Only the Lead By user or the Admin can work on this lead.');
  }
}

/** A Converted lead is read-only (BFD section 9). */
export function assertNotLocked(lead: LeadWorkContext): void {
  if (lead.stage === 'Converted') {
    throw new ConflictSalesError('This lead is converted to a client and is read-only.', 'LEAD_LOCKED');
  }
}
