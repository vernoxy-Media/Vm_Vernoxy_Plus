import { deriveCallingStatus, splitEqually, validateCampaign, validateCampaignCall } from './campaign.service';

const NOW = new Date('2026-11-18T10:00:00.000Z');
const fields = (errs: { field: string }[]) => errs.map((e) => e.field).sort();

describe('campaign form', () => {
  const good = {
    name: 'Vapi Industrial Outreach',
    campaign_type: 'Calling + Meeting',
    target_cities: ['Vapi'],
    target_state: 'Gujarat',
    industry_id: 3,
    start_date: '2026-11-18',
    end_date: '2026-11-30',
    objective: 'Generate ERP enquiries',
    description: null,
    status: 'Draft',
  };

  it('accepts the example campaign of the BFD', () => {
    expect(validateCampaign(good, { partial: false })).toEqual([]);
  });

  it('needs a name, a type and both dates when creating', () => {
    const errs = validateCampaign({ name: ' ', campaign_type: null, start_date: null, end_date: null }, { partial: false });
    expect(fields(errs)).toEqual(['campaign_type', 'end_date', 'name', 'start_date']);
  });

  it('rejects an end date before the start date and dates that do not exist', () => {
    expect(fields(validateCampaign({ ...good, end_date: '2026-11-01' }, { partial: false }))).toEqual(['end_date']);
    expect(fields(validateCampaign({ ...good, start_date: '2026-02-31' }, { partial: false }))).toEqual(['start_date']);
  });

  it('rejects an unknown type or status', () => {
    expect(fields(validateCampaign({ ...good, campaign_type: 'SMS', status: 'Done' }, { partial: false }))).toEqual(['campaign_type', 'status']);
  });

  it('on update checks only what was sent', () => {
    expect(validateCampaign({ status: 'Active' }, { partial: true })).toEqual([]);
    expect(fields(validateCampaign({ name: '' }, { partial: true }))).toEqual(['name']);
  });
});

describe('logging a campaign call', () => {
  const received = { call_status: 'Received', what_discussed: 'Asked for a demo', outcome: 'Interested' };

  it('accepts a received call with notes and a result', () => {
    expect(validateCampaignCall(received, NOW)).toEqual([]);
  });

  it('a received call needs notes and a result', () => {
    expect(fields(validateCampaignCall({ call_status: 'Received' }, NOW))).toEqual(['outcome', 'what_discussed']);
  });

  it('a call that was not received needs a reason and nothing else', () => {
    expect(fields(validateCampaignCall({ call_status: 'Not received' }, NOW))).toEqual(['not_received_reason']);
    expect(validateCampaignCall({ call_status: 'Not received', not_received_reason: 'Busy' }, NOW)).toEqual([]);
    expect(fields(validateCampaignCall({ call_status: 'Not received', not_received_reason: 'Busy', outcome: 'Interested' }, NOW))).toEqual(['outcome']);
  });

  it('only a received call has a length and a reason belongs only to a missed call', () => {
    expect(fields(validateCampaignCall({ ...received, call_duration_seconds: 0 }, NOW))).toEqual(['call_duration_seconds']);
    expect(fields(validateCampaignCall({ ...received, not_received_reason: 'Busy' }, NOW))).toEqual(['not_received_reason']);
  });

  it('a call back needs a date, and the next follow-up cannot be in the past', () => {
    expect(fields(validateCampaignCall({ ...received, outcome: 'Call back later' }, NOW))).toEqual(['next_follow_up_on']);
    expect(validateCampaignCall({ ...received, outcome: 'Call back later', next_follow_up_on: new Date('2026-11-20T09:00:00.000Z') }, NOW)).toEqual([]);
    expect(fields(validateCampaignCall({ ...received, next_follow_up_on: new Date('2026-11-01T09:00:00.000Z') }, NOW))).toEqual(['next_follow_up_on']);
  });

  it('rejects a status or result that is not in the list', () => {
    expect(fields(validateCampaignCall({ call_status: 'Connected' }, NOW))).toEqual(['call_status']);
    expect(fields(validateCampaignCall({ ...received, outcome: 'Maybe' }, NOW))).toEqual(['outcome']);
  });
});

describe('calling status shown in the list', () => {
  it('is Pending until the first call', () => {
    expect(deriveCallingStatus({ call_attempts: 0, last_call_status: null, last_outcome: null })).toBe('Pending');
  });
  it('follows the latest call', () => {
    expect(deriveCallingStatus({ call_attempts: 2, last_call_status: 'Not received', last_outcome: 'Interested' })).toBe('Not Received');
    expect(deriveCallingStatus({ call_attempts: 1, last_call_status: 'Received', last_outcome: 'Interested' })).toBe('Interested');
    expect(deriveCallingStatus({ call_attempts: 1, last_call_status: 'Received', last_outcome: 'Not interested' })).toBe('Not Interested');
    expect(deriveCallingStatus({ call_attempts: 1, last_call_status: 'Received', last_outcome: 'Call back later' })).toBe('Connected');
  });
});

describe('equal distribution', () => {
  it('shares the companies so every employee gets the same, give or take one', () => {
    const plan = splitEqually([1, 2, 3, 4, 5, 6, 7], [10, 20, 30]);
    expect(plan.map((p) => p.ids.length)).toEqual([3, 2, 2]);
    expect(plan.flatMap((p) => p.ids)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('gives nothing to nobody', () => {
    expect(splitEqually([1, 2], [])).toEqual([]);
    expect(splitEqually([], [10]).map((p) => p.ids)).toEqual([[]]);
  });
});
