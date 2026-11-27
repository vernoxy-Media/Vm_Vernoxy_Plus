import { buildCompanyCallRows, CompanyCallAttempt, viewCompanyCallRows } from './company-call-report.service';

const call = (over: Partial<CompanyCallAttempt>): CompanyCallAttempt => ({
  communication_id: 1,
  company_id: 1,
  lead_id: null,
  company_name: 'Mekor',
  company_contact: 'Pankaj',
  call_contact: null,
  call_date: new Date('2026-11-01T06:00:00Z'),
  call_status: 'Received',
  not_received_reason: null,
  outcome: 'Interested',
  duration_seconds: null,
  remark: 'first',
  called_by: 'Krishna',
  ...over,
});

describe('buildCompanyCallRows', () => {
  it('makes one row per company whose total is received plus not received', () => {
    const rows = buildCompanyCallRows([
      call({ communication_id: 1 }),
      call({ communication_id: 2, call_status: 'Not received', outcome: 'No response' }),
      call({ communication_id: 3, call_status: null }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ total: 2, received: 1, not_received: 1 });
  });

  it('takes the outcome from the latest received call, and the date and remark from the latest attempt', () => {
    const [row] = buildCompanyCallRows([
      call({ communication_id: 1, outcome: 'Interested' }),
      call({ communication_id: 2, outcome: 'Call back later', call_date: new Date('2026-11-02T06:00:00Z'), remark: 'second' }),
      call({ communication_id: 3, call_status: 'Not received', outcome: 'No response', call_date: new Date('2026-11-03T06:00:00Z'), remark: 'busy' }),
    ]);
    expect(row.latest_outcome).toBe('Call back later');
    expect(row.last_remark).toBe('busy');
    expect(row.last_call_date.toISOString()).toBe('2026-11-03T06:00:00.000Z');
  });

  it('leaves out a company with no received call', () => {
    expect(buildCompanyCallRows([call({ call_status: 'Not received' }), call({ company_id: 2, call_status: null })])).toEqual([]);
  });

  it('uses the contact named on a call when the company has none', () => {
    const [row] = buildCompanyCallRows([call({ company_contact: ' ', call_contact: 'Ramesh' })]);
    expect(row.contact_person).toBe('Ramesh');
  });
});

describe('viewCompanyCallRows', () => {
  const rows = buildCompanyCallRows([
    call({ communication_id: 1, company_id: 1, company_name: 'Mekor' }),
    call({ communication_id: 2, company_id: 2, company_name: 'amazon', company_contact: null, call_date: new Date('2026-11-05T06:00:00Z') }),
  ]);
  const names = (r: typeof rows) => r.map((x) => x.company_name);

  it('shows the newest call first by default', () => {
    expect(names(viewCompanyCallRows(rows, {}))).toEqual(['amazon', 'Mekor']);
  });

  it('searches the company name and the contact person', () => {
    expect(names(viewCompanyCallRows(rows, { q: 'MEK' }))).toEqual(['Mekor']);
    expect(names(viewCompanyCallRows(rows, { q: 'pankaj' }))).toEqual(['Mekor']);
  });

  it('sorts either way and keeps empty values at the end', () => {
    expect(names(viewCompanyCallRows(rows, { sort: 'company_name', dir: 'desc' }))).toEqual(['Mekor', 'amazon']);
    expect(names(viewCompanyCallRows(rows, { sort: 'contact_person', dir: 'asc' }))).toEqual(['Mekor', 'amazon']);
    expect(names(viewCompanyCallRows(rows, { sort: 'contact_person', dir: 'desc' }))).toEqual(['Mekor', 'amazon']);
  });
});
