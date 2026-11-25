import { buildHistory, cellReader, parseDateParts, parseTimeMinutes, RawSheetRow, RawSheets } from './import-history.service';

const NOW = new Date('2026-11-24T10:00:00+05:30');
const users = [{ emp_id: 7, name: 'Krishna Admin', email: 'krishna@vernoxy.com' }];
const keys = new Map([['CMP001', { row: 2 }]]);

const row = (n: number, cells: Record<string, string>): RawSheetRow => ({ rowNumber: n, cells });
const sample = (): RawSheets => ({
  contacts: [row(2, { company_key: 'CMP001', contact_name: 'Ramesh Patel', designation: 'Director', mobile: '9824012345', email: 'ramesh@shreeramind.com', is_primary: 'Yes' })],
  leads: [row(2, { company_key: 'CMP001', lead_source: 'LinkedIn', lead_by: 'Krishna Admin', service_fit: 'ERP, CRM', date_added: '2026-10-15', lead_status: 'Converted' })],
  interactions: [row(2, { company_key: 'CMP001', contact_name: 'Ramesh Patel', date: '2026-11-10', time: '11:15', type: 'Call', what_discussed: 'Intro call', outcome: 'Interested', call_status: 'Received', 'call_duration_(min)': '8', done_by: 'Krishna Admin' })],
  'follow-ups': [
    row(2, { company_key: 'CMP001', contact_name: 'Ramesh Patel', 'follow-up_date': '2026-11-20', 'follow-up_time': '14:30', type: 'Meeting', assigned_to: 'Krishna Admin', status: 'Completed', done_on_date: '2026-11-20', done_time: '15:15', outcome: 'Interested', completion_note: 'Confirmed budget' }),
    row(3, { company_key: 'CMP001', contact_name: 'Ramesh Patel', 'follow-up_date': '2026-11-25', 'follow-up_time': '11:00', type: 'Call', assigned_to: 'Krishna Admin', status: 'Pending' }),
  ],
  won: [row(2, { company_key: 'CMP001', won_on: '2026-11-20', project_revenue: '550000', win_note: 'Contract signed', owner: 'Krishna Admin' })],
  notes: [row(2, { company_key: 'CMP001', note_type: 'Budget', note: 'Budget is 10 lakhs', is_pinned: 'Yes', created_by: 'Krishna Admin', created_on: '2026-10-20' })],
});
const build = (s: RawSheets) => buildHistory(s, keys, users, NOW);
const errors = (b: ReturnType<typeof build>) => b.issues.filter((i) => i.severity === 'error');

describe('import history: parsing helpers', () => {
  it('reads dates day-first and ISO, and rejects impossible dates', () => {
    expect(parseDateParts('2026-11-20')).toEqual({ y: 2026, m: 11, d: 20 });
    expect(parseDateParts('20/11/2026')).toEqual({ y: 2026, m: 11, d: 20 });
    expect(parseDateParts('31-02-2026')).toBeNull();
    expect(parseDateParts('soon')).toBeNull();
  });
  it('reads times', () => {
    expect(parseTimeMinutes('14:30')).toBe(870);
    expect(parseTimeMinutes('3:15 PM')).toBe(915);
    expect(parseTimeMinutes('25:00')).toBeNull();
  });
  it('finds headers without caring about case, spaces or the * mark', () => {
    expect(cellReader({ 'company_key_*': 'CMP9' })('Company Key')).toBe('CMP9');
  });
});

describe('import history: the sample company', () => {
  it('builds a clean plan', () => {
    const b = build(sample());
    expect(errors(b)).toEqual([]);
    const p = b.plans.get('CMP001')!;
    expect(p.contacts).toHaveLength(1);
    expect(p.contacts[0].is_primary).toBe(true);
    expect(p.lead?.stage).toBe('Converted');
    expect(p.interactions[0].call_duration_seconds).toBe(480);
    expect(p.interactions[0].done_by_id).toBe(7);
    expect(p.won?.project_revenue).toBe(550000);
    expect(p.notes[0].is_pinned).toBe(true);
    expect(b.blocked.size).toBe(0);
  });

  it('cancels a pending follow-up of a converted lead, with a warning', () => {
    const p = build(sample()).plans.get('CMP001')!;
    const pending = p.follow_ups.find((f) => f.row === 3)!;
    expect(pending.status).toBe('Cancelled');
    expect(pending.reason).toBe('Lead converted to client');
    expect(build(sample()).issues.some((i) => i.severity === 'warning' && i.sheet === 'Follow-ups')).toBe(true);
  });

  it('keeps the original (past) dates', () => {
    const p = build(sample()).plans.get('CMP001')!;
    expect(p.interactions[0].at.toISOString()).toBe(new Date('2026-11-10T11:15:00+05:30').toISOString());
    expect(p.follow_ups[0].done_on?.toISOString()).toBe(new Date('2026-11-20T15:15:00+05:30').toISOString());
  });
});

describe('import history: problems are reported and block only that company', () => {
  it('rejects a key that is not in Companies', () => {
    const s = sample();
    s.notes = [row(2, { company_key: 'NOPE', note_type: 'General', note: 'x' })];
    const b = build(s);
    expect(errors(b)[0]).toMatchObject({ sheet: 'Notes', field: 'Company Key' });
    expect(b.blocked.has('CMP001')).toBe(false);
  });

  it('rejects an interaction with an unknown contact and blocks the company', () => {
    const s = sample();
    s.interactions![0].cells.contact_name = 'Somebody Else';
    const b = build(s);
    expect(errors(b).some((e) => e.sheet === 'Interactions' && e.field === 'Contact Name')).toBe(true);
    expect(b.blocked.has('CMP001')).toBe(true);
  });

  it('rejects a future interaction date', () => {
    const s = sample();
    s.interactions![0].cells.date = '2026-12-31';
    expect(errors(build(s)).some((e) => e.field === 'Date')).toBe(true);
  });

  it('needs a reason for a call that was not received, and no duration', () => {
    const s = sample();
    Object.assign(s.interactions![0].cells, { call_status: 'Not received' });
    const fields = errors(build(s)).map((e) => e.field);
    expect(fields).toContain('Not Received Reason');
    expect(fields).toContain('Call Duration (min)');
  });

  it('needs outcome and note for a completed follow-up, and a reason for a cancelled one', () => {
    const s = sample();
    delete s['follow-ups']![0].cells.outcome;
    delete s['follow-ups']![0].cells.completion_note;
    Object.assign(s['follow-ups']![1].cells, { status: 'Cancelled' });
    const fields = errors(build(s)).map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['Outcome', 'Completion Note', 'Cancel Reason']));
  });

  it('turns a past pending follow-up into Overdue when the lead is still open', () => {
    const s = sample();
    s.leads![0].cells.lead_status = 'Qualified';
    delete s.won;
    s['follow-ups']![1].cells['follow-up_date'] = '2026-11-01';
    const f = build(s).plans.get('CMP001')!.follow_ups.find((x) => x.row === 3)!;
    expect(f.status).toBe('Overdue');
  });

  it('requires Won for Converted, and Converted for Won', () => {
    const noWon = sample();
    delete noWon.won;
    expect(errors(build(noWon)).some((e) => e.sheet === 'Leads' && e.field === 'Lead Status')).toBe(true);
    const wrongStatus = sample();
    wrongStatus.leads![0].cells.lead_status = 'Qualified';
    expect(errors(build(wrongStatus)).some((e) => e.sheet === 'Won')).toBe(true);
  });

  it('treats a blank status next to a Won row as Converted', () => {
    const s = sample();
    delete s.leads![0].cells.lead_status;
    expect(build(s).plans.get('CMP001')!.lead?.stage).toBe('Converted');
  });

  it('moves a New lead to Contacted when a conversation was received', () => {
    const s = sample();
    s.leads![0].cells.lead_status = 'New';
    delete s.won;
    expect(build(s).plans.get('CMP001')!.lead?.stage).toBe('Contacted');
  });

  it('requires Lost and On Hold reasons', () => {
    const lost = sample();
    delete lost.won;
    lost.leads![0].cells.lead_status = 'Lost';
    expect(errors(build(lost)).some((e) => e.field === 'Lost Reason')).toBe(true);
    const hold = sample();
    delete hold.won;
    hold.leads![0].cells.lead_status = 'On Hold';
    expect(errors(build(hold)).some((e) => e.field === 'On Hold Reason')).toBe(true);
  });

  it('rejects a bad mobile, duplicate contact names and two primaries', () => {
    const s = sample();
    s.contacts = [
      row(2, { company_key: 'CMP001', contact_name: 'Ramesh Patel', mobile: '12345', is_primary: 'Yes' }),
      row(3, { company_key: 'CMP001', contact_name: 'ramesh  patel', mobile: '9824012346', is_primary: 'Yes' }),
    ];
    const fields = errors(build(s)).map((e) => e.field);
    expect(fields).toContain('Mobile');
    expect(fields).toContain('Contact Name');
    expect(fields).toContain('Is Primary');
  });

  it('rejects unknown users, types and outcomes', () => {
    const s = sample();
    s.interactions![0].cells.done_by = 'Nobody';
    s.interactions![0].cells.type = 'Fax';
    s.interactions![0].cells.outcome = 'Maybe';
    const fields = errors(build(s)).map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['Done By', 'Type', 'Outcome']));
  });

  it('needs a lead for notes', () => {
    const s = sample();
    delete s.leads;
    delete s.won;
    expect(errors(build(s)).some((e) => e.sheet === 'Notes')).toBe(true);
  });
});
