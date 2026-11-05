import { LeadActivityUseCases } from './lead-activity.use-cases';
import { LeadStatusUseCases } from './lead-status.use-cases';
import { CreateCommunicationData, LeadWorkContext, SalesWorkRepositoryPort } from '../ports/sales-work.repository.port';
import { SalesLeadRepositoryPort } from '../ports/sales-lead.repository.port';
import { SalesNotifierPort } from '../ports/sales-notifier.port';
import { SalesActor } from '../ports/sales-access-policy.port';
import { LeadStatus } from '../../domain/entities/sales-lead';
import { ConflictSalesError, FieldValidationError, InvalidTransitionError } from '../../domain/errors/sales.errors';

const rep: SalesActor = { emp_id: 5, is_admin: false, is_sales: true };
const NOW = new Date('2026-11-04T10:00:00Z');

const lead = (stage: LeadStatus): LeadWorkContext => ({
  lead_id: 7,
  lead_code: 'LEAD-0007',
  company_id: 3,
  company_name: 'Patel Precision',
  stage,
  lead_by_id: 5,
  service_fit: null,
  person_id: 11,
});

/** A work repository that records what the use case asks it to do. Only the methods these flows touch are real. */
function fakeWork(stage: LeadStatus) {
  const calls = { created: [] as CreateCommunicationData[], moved: [] as Array<{ to: string }>, lost: [] as unknown[], hold: [] as unknown[], qualify: [] as unknown[] };
  const work = {
    getLeadForWork: async () => lead(stage),
    isActiveContactOfCompany: async () => true,
    isEligibleAssignee: async () => true,
    getPrimaryContactPersonId: async () => 11,
    resolveCallNotReceivedReason: async (label: string) => (label.toLowerCase() === 'busy' ? { label: 'Busy' } : null),
    resolveLostReason: async (label: string) => (label.toLowerCase() === 'other' ? { label: 'Other', lookup_id: 9 } : label.toLowerCase() === 'budget too low' ? { label: 'Budget too low', lookup_id: 4 } : null),
    createCommunication: async (d: CreateCommunicationData) => {
      calls.created.push(d);
      return { communication_id: 1, status_change: null, follow_up_id: null };
    },
    getCommunication: async () => ({
      communication_id: 1, company_id: 3, lead_id: 7, contact: { person_id: 11, name: 'Nirav' }, type: 'Call', communication_date: NOW,
      what_discussed: '', outcome: null, call_status: null, not_received_reason: null, logged_by: null, created_by: 5, created_at: NOW, updated_at: null,
    }),
    moveStage: async (d: { to: string }) => {
      calls.moved.push({ to: d.to });
      return { from: stage, to: d.to };
    },
    qualify: async (d: unknown) => {
      calls.qualify.push(d);
      return { from: stage, to: 'Qualified' };
    },
    putOnHold: async (d: unknown) => {
      calls.hold.push(d);
      return { from: stage, to: 'On Hold' };
    },
    markLost: async (d: unknown) => {
      calls.lost.push(d);
      return { from: stage, to: 'Lost' };
    },
  } as unknown as SalesWorkRepositoryPort;
  return { work, calls };
}

const leads = {} as SalesLeadRepositoryPort;
const notifier = {} as SalesNotifierPort;

describe('logging a call', () => {
  const base = { type: 'Call', contact_id: 11, communication_date: new Date('2026-11-04T09:30:00Z') };

  it('a received call is saved with its call time and conversation', async () => {
    const { work, calls } = fakeWork('New');
    await new LeadActivityUseCases(work).logOnLead(7, { ...base, call_status: 'Received', what_discussed: 'Wants a quote', outcome: 'Interested' }, rep, NOW);
    expect(calls.created[0]).toMatchObject({ call_status: 'Received', what_discussed: 'Wants a quote', outcome: 'Interested', counts_as_conversation: true });
    expect(calls.created[0].communication_date).toEqual(base.communication_date);
  });

  it('a received call without a conversation is refused', async () => {
    const { work } = fakeWork('New');
    await expect(new LeadActivityUseCases(work).logOnLead(7, { ...base, call_status: 'Received', outcome: 'Interested' }, rep, NOW)).rejects.toBeInstanceOf(FieldValidationError);
  });

  it('a call that was not received needs a reason from the list, and is not a conversation', async () => {
    const { work, calls } = fakeWork('New');
    const uc = new LeadActivityUseCases(work);

    await expect(uc.logOnLead(7, { ...base, call_status: 'Not received' }, rep, NOW)).rejects.toMatchObject({
      errors: [{ field: 'not_received_reason' }],
    });
    await expect(uc.logOnLead(7, { ...base, call_status: 'Not received', not_received_reason: 'Teleported' }, rep, NOW)).rejects.toMatchObject({
      errors: [{ field: 'not_received_reason', message: 'Choose a reason from the list.' }],
    });

    await uc.logOnLead(7, { ...base, call_status: 'Not received', not_received_reason: 'busy' }, rep, NOW);
    expect(calls.created).toHaveLength(1);
    expect(calls.created[0]).toMatchObject({
      call_status: 'Not received',
      not_received_reason: 'Busy',
      outcome: 'No response',
      counts_as_conversation: false, // so a New lead does not become Contacted
    });
    expect(calls.created[0].what_discussed).toBe('Call not received: Busy');
  });

  it('works the same on a company: calls there are Received or Not received too', async () => {
    const { work, calls } = fakeWork('New');
    (work as unknown as { getCompanyForLog: unknown }).getCompanyForLog = async () => ({ company_id: 3, name: 'Patel', open_lead: null });
    await new LeadActivityUseCases(work).logOnCompany(3, { ...base, call_status: 'Not received', not_received_reason: 'Busy' }, rep, NOW);
    expect(calls.created[0]).toMatchObject({ company_id: 3, lead_id: null, call_status: 'Not received' });
  });

  it('only a call has a status', async () => {
    const { work } = fakeWork('New');
    await expect(new LeadActivityUseCases(work).logOnLead(7, { type: 'Email', contact_id: 11, call_status: 'Not received', not_received_reason: 'Busy' }, rep, NOW)).rejects.toBeInstanceOf(FieldValidationError);
  });
});

describe('moving a lead between stages', () => {
  const stages: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'On Hold', 'Lost'];

  it('moves between any two stages with nothing filled in, except Lost', async () => {
    for (const from of stages) {
      for (const to of stages.filter((s) => s !== from && s !== 'Lost')) {
        const { work, calls } = fakeWork(from);
        const result = await new LeadStatusUseCases(work, leads, notifier).moveToStage(7, { to }, rep);
        expect(result.to).toBe(to);
        const touched = calls.moved.length + calls.qualify.length + calls.hold.length;
        expect(touched).toBe(1);
      }
    }
  });

  it('puts a lead on hold without asking for a follow-up date', async () => {
    const { work, calls } = fakeWork('Contacted');
    await new LeadStatusUseCases(work, leads, notifier).moveToStage(7, { to: 'On Hold' }, rep);
    expect(calls.hold[0]).toMatchObject({ follow_up: null });
  });

  it('qualifies a lead that has no conversation, no notes and no service fit', async () => {
    const { work, calls } = fakeWork('New');
    await new LeadStatusUseCases(work, leads, notifier).moveToStage(7, { to: 'Qualified' }, rep);
    expect(calls.qualify).toHaveLength(1);
  });

  it('Lost asks for a reason, and a note when the reason is Other', async () => {
    for (const from of ['New', 'Contacted', 'Qualified', 'On Hold'] as LeadStatus[]) {
      const { work } = fakeWork(from);
      await expect(new LeadStatusUseCases(work, leads, notifier).moveToStage(7, { to: 'Lost' }, rep)).rejects.toMatchObject({ errors: [{ field: 'reason' }] });
    }
    const { work, calls } = fakeWork('Qualified');
    const uc = new LeadStatusUseCases(work, leads, notifier);
    await expect(uc.moveToStage(7, { to: 'Lost', reason: 'Other' }, rep)).rejects.toMatchObject({ errors: [{ field: 'note' }] });
    await expect(uc.moveToStage(7, { to: 'Lost', reason: 'Because' }, rep)).rejects.toMatchObject({ errors: [{ field: 'reason' }] });
    await uc.moveToStage(7, { to: 'Lost', reason: 'Budget too low' }, rep);
    expect(calls.lost[0]).toMatchObject({ reason: 'Budget too low', reason_lookup_id: 4 });
  });

  it('a converted lead stays locked, and a lead cannot be moved to the stage it is already in', async () => {
    const { work } = fakeWork('Converted');
    await expect(new LeadStatusUseCases(work, leads, notifier).moveToStage(7, { to: 'New' }, rep)).rejects.toBeInstanceOf(ConflictSalesError);

    const same = fakeWork('Contacted').work;
    await expect(new LeadStatusUseCases(same, leads, notifier).moveToStage(7, { to: 'Contacted' }, rep)).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it('Converted is not a stage you can move to: that is Mark as Won', async () => {
    const { work } = fakeWork('Qualified');
    await expect(new LeadStatusUseCases(work, leads, notifier).moveToStage(7, { to: 'Converted' }, rep)).rejects.toBeInstanceOf(FieldValidationError);
  });

  it('only the Lead By user or the Admin can move a lead', async () => {
    const { work } = fakeWork('New');
    const stranger: SalesActor = { emp_id: 99, is_admin: false, is_sales: true };
    await expect(new LeadStatusUseCases(work, leads, notifier).moveToStage(7, { to: 'Contacted' }, stranger)).rejects.toThrow('Only the Lead By user');
  });
});
