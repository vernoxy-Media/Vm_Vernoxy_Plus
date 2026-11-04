import { buildSalesReport, istDayBoundary, percent, ReportLeadRow } from './sales-report.service';

const row = (over: Partial<ReportLeadRow>): ReportLeadRow => ({
  lead_id: 1,
  stage: 'New',
  source: 'Cold calling',
  service_fit: 'Website Development',
  lead_by_id: 1,
  lead_by_name: 'Kishan Patel',
  lost_reason: null,
  created_at: new Date('2026-10-10T06:00:00Z'),
  won_on: null,
  ...over,
});

const extras = { companies_total: 129, companies_in_period: 12, overdue_follow_ups: 3 };
const now = new Date('2026-11-04T06:00:00Z');

describe('percent', () => {
  it('rounds to one decimal and never divides by zero', () => {
    expect(percent(1, 3)).toBe(33.3);
    expect(percent(2, 3)).toBe(66.7);
    expect(percent(5, 0)).toBe(0);
  });
});

describe('istDayBoundary', () => {
  it('uses India time, not the server time zone', () => {
    expect(istDayBoundary('2026-10-01', 'start').toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(istDayBoundary('2026-10-31', 'end').toISOString()).toBe('2026-10-31T18:29:59.999Z');
  });
});

describe('buildSalesReport', () => {
  const rows: ReportLeadRow[] = [
    row({ lead_id: 1, stage: 'New' }),
    row({ lead_id: 2, stage: 'Contacted', source: 'Reference' }),
    row({ lead_id: 3, stage: 'Qualified', service_fit: 'CRM / ERP Software, Mobile App' }),
    row({ lead_id: 4, stage: 'On Hold' }),
    row({ lead_id: 5, stage: 'Converted', source: 'Reference', won_on: new Date('2026-10-20T06:00:00Z') }),
    row({ lead_id: 6, stage: 'Converted', lead_by_id: 2, lead_by_name: 'Dhruv Mehta', won_on: new Date('2026-10-14T06:00:00Z') }),
    row({ lead_id: 7, stage: 'Lost', lost_reason: 'Budget too low' }),
    row({ lead_id: 8, stage: 'Lost', lost_reason: 'Budget too low' }),
    row({ lead_id: 9, stage: 'Lost', lost_reason: 'Not reachable' }),
    row({ lead_id: 10, stage: null, created_at: new Date('2026-08-05T06:00:00Z') }),
  ];

  it('counts leads by stage and treats a missing stage as New', () => {
    const r = buildSalesReport(rows, { from: null, to: null }, extras, now);
    expect(r.totals.leads).toBe(10);
    expect(r.by_stage.find((s) => s.stage === 'New')?.count).toBe(2);
    expect(r.totals.open).toBe(5);
    expect(r.totals.converted).toBe(2);
    expect(r.totals.lost).toBe(3);
    expect(r.totals.on_hold).toBe(1);
    expect(r.by_stage.map((s) => s.stage)).toEqual(['New', 'Contacted', 'Qualified', 'On Hold', 'Converted', 'Lost']);
  });

  it('works out the conversion rate and the average days to convert', () => {
    const r = buildSalesReport(rows, { from: null, to: null }, extras, now);
    expect(r.totals.conversion_rate).toBe(20);
    // lead 5: 10 Oct -> 20 Oct = 10 days, lead 6: 10 Oct -> 14 Oct = 4 days
    expect(r.totals.avg_days_to_convert).toBe(7);
  });

  it('only counts leads added inside the period', () => {
    const r = buildSalesReport(rows, { from: istDayBoundary('2026-10-01', 'start'), to: istDayBoundary('2026-10-31', 'end') }, extras, now);
    expect(r.totals.leads).toBe(9);
    expect(r.period).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('splits a Service Fit that holds several services', () => {
    const r = buildSalesReport(rows, { from: null, to: null }, extras, now);
    expect(r.by_service_fit.find((s) => s.name === 'CRM / ERP Software')?.total).toBe(1);
    expect(r.by_service_fit.find((s) => s.name === 'Mobile App')?.total).toBe(1);
  });

  it('groups by source and by user, with their own conversion rate', () => {
    const r = buildSalesReport(rows, { from: null, to: null }, extras, now);
    const ref = r.by_source.find((s) => s.name === 'Reference')!;
    expect(ref).toMatchObject({ total: 2, converted: 1, conversion_rate: 50 });
    const dhruv = r.by_user.find((u) => u.name === 'Dhruv Mehta')!;
    expect(dhruv).toMatchObject({ total: 1, converted: 1, conversion_rate: 100 });
  });

  it('ranks lost reasons with their share of all lost leads', () => {
    const r = buildSalesReport(rows, { from: null, to: null }, extras, now);
    expect(r.lost_reasons[0]).toEqual({ reason: 'Budget too low', count: 2, percent: 66.7 });
    expect(r.lost_reasons[1]).toEqual({ reason: 'Not reachable', count: 1, percent: 33.3 });
  });

  it('shows six months ending with the month of the period end', () => {
    const r = buildSalesReport(rows, { from: null, to: istDayBoundary('2026-10-31', 'end') }, extras, now);
    expect(r.trend.map((t) => t.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(r.trend.find((t) => t.month === '2026-08')?.created).toBe(1);
    expect(r.trend.find((t) => t.month === '2026-10')?.created).toBe(9);
    expect(r.trend.find((t) => t.month === '2026-10')?.converted).toBe(2);
  });

  it('passes the company and follow-up figures through and handles an empty list', () => {
    const r = buildSalesReport([], { from: null, to: null }, extras, now);
    expect(r.totals).toMatchObject({ leads: 0, conversion_rate: 0, avg_days_to_convert: null, companies: 129, overdue_follow_ups: 3 });
    expect(r.by_source).toEqual([]);
  });
});
