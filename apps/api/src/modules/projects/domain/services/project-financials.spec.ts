import { allocateOffice, employeeCost, hourlyRate, resolveRevenue, summarise, workingDaysInMonth } from './project-financials';

describe('project financials', () => {
  it('counts every day but Sunday as a working day', () => {
    expect(workingDaysInMonth(2026, 10)).toBe(25); // November 2026: 30 days, 5 Sundays
    expect(workingDaysInMonth(2026, 1)).toBe(24); // February 2026: 28 days, 4 Sundays
  });

  it('matches the worked example: 20 days x 10 hours', () => {
    const a = hourlyRate(30000, 20, 10);
    const b = hourlyRate(40000, 20, 10);
    const c = hourlyRate(25000, 20, 10);
    expect([a, b, c]).toEqual([150, 200, 125]);
    expect(employeeCost(a, 20) + employeeCost(b, 15) + employeeCost(c, 10)).toBe(7250);
  });

  it('allocates office expenses by hours', () => {
    expect(allocateOffice(200, 400, 100000)).toBe(50000);
    expect(allocateOffice(120, 400, 100000)).toBe(30000);
    expect(allocateOffice(80, 400, 100000)).toBe(20000);
    expect(allocateOffice(0, 400, 100000)).toBe(0);
    expect(allocateOffice(10, 0, 100000)).toBe(0);
  });

  it('adds the three parts and works out profit', () => {
    const f = summarise(7250, 5000, 50000, 100000);
    expect(f.actual_expense).toBe(62250);
    expect(f.profit).toBe(37750);
    expect(f.profit_percent).toBe(37.75);
  });

  it('shows no profit when there is no revenue', () => {
    const f = summarise(100, 0, 0, null);
    expect(f.profit).toBeNull();
    expect(f.profit_percent).toBeNull();
  });

  it('splits a client revenue equally, keeping project overrides', () => {
    const projects = [
      { project_id: 1, client_id: 9, project_revenue: null },
      { project_id: 2, client_id: 9, project_revenue: null },
      { project_id: 3, client_id: 9, project_revenue: 40000 },
      { project_id: 4, client_id: null, project_revenue: null },
    ];
    const out = resolveRevenue(projects, new Map([[9, 100000]]));
    expect(out.get(1)).toBe(30000);
    expect(out.get(2)).toBe(30000);
    expect(out.get(3)).toBe(40000);
    expect(out.get(4)).toBeNull();
  });
});
