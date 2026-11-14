import { AnalyticsDayRow, AnalyticsEmployee, buildAnalyticsRecords, DEFAULT_SHIFT, eachDate, formatTimeIst, hhmm, hourInIst, istMinutes, todayInIst } from './attendance-analytics';

const emp = (id: number, joining: string | null = '2026-01-01'): AnalyticsEmployee => ({
  emp_id: id,
  name: `Emp ${id}`,
  email: `e${id}@x.com`,
  department: 'IT',
  designation: 'Developer',
  joining_date: joining,
});

// 09:30 IST is 04:00 UTC
const utc = (date: string, h: number, m: number) => new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);

const row = (over: Partial<AnalyticsDayRow> & { work_date: string; emp_id: number }): AnalyticsDayRow => ({
  attendance_id: 1,
  check_in_at: utc(over.work_date, 4, 0),
  check_out_at: utc(over.work_date, 12, 30),
  break_minutes: 60,
  production_minutes: 480,
  day_status: 'present',
  worked_on_non_working_day: false,
  is_regularized: false,
  regularization_id: null,
  shift: null,
  breaks: [],
  ...over,
});

const base = {
  workingDays: [1, 2, 3, 4, 5, 6],
  holidays: [] as string[],
  defaultShift: DEFAULT_SHIFT,
  from: '2026-11-02', // Monday
  to: '2026-11-07',
  today: '2026-11-13',
};

describe('attendance analytics records', () => {
  it('converts instants to Indian time', () => {
    expect(hhmm(istMinutes(utc('2026-11-02', 4, 0)))).toBe('09:30');
    expect(hhmm(istMinutes(utc('2026-11-02', 20, 0)))).toBe('01:30'); // next day in India
  });

  it('lists every date of a range', () => {
    expect(eachDate('2026-11-02', '2026-11-04')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
  });

  it('marks a working day with no punch as absent, and on leave when a leave covers it', () => {
    const records = buildAnalyticsRecords({
      ...base,
      employees: [emp(1)],
      days: [],
      leaves: [{ emp_id: 1, date: '2026-11-03', day_part: 'FULL_DAY' }],
    });
    const byDate = Object.fromEntries(records.map((r) => [r.workDate, r.dayStatus]));
    expect(byDate['2026-11-03']).toBe('on_leave');
    expect(byDate['2026-11-02']).toBe('absent');
    expect(records).toHaveLength(6); // Mon to Sat
  });

  it('never makes weekly offs, holidays, future days or days before joining absent', () => {
    const records = buildAnalyticsRecords({
      ...base,
      from: '2026-11-01', // Sunday
      to: '2026-11-20',
      holidays: ['2026-11-04'],
      employees: [emp(1, '2026-11-05')],
      days: [],
      leaves: [],
    });
    const dates = records.map((r) => r.workDate);
    expect(dates).not.toContain('2026-11-01'); // Sunday
    expect(dates).not.toContain('2026-11-04'); // holiday and before joining
    expect(dates).not.toContain('2026-11-13'); // today
    expect(dates).not.toContain('2026-11-16'); // future
    expect(dates).toContain('2026-11-05');
  });

  it('measures late and early against the shift and its grace, in Indian time', () => {
    const on = buildAnalyticsRecords({
      ...base,
      employees: [emp(1)],
      leaves: [],
      days: [
        row({ emp_id: 1, work_date: '2026-11-02', attendance_id: 1, check_in_at: utc('2026-11-02', 4, 10) }), // 09:40, within the 15 min grace
        row({ emp_id: 1, work_date: '2026-11-03', attendance_id: 2, check_in_at: utc('2026-11-03', 4, 40) }), // 10:10, 40 late
        row({ emp_id: 1, work_date: '2026-11-04', attendance_id: 3, check_out_at: utc('2026-11-04', 11, 0) }), // 16:30, early
      ],
    }).filter((r) => r.attendanceId > 0);
    const by = Object.fromEntries(on.map((r) => [r.workDate, r]));
    expect(by['2026-11-02']!.isLate).toBe(false);
    expect(by['2026-11-03']!.isLate).toBe(true);
    expect(by['2026-11-03']!.lateMinutes).toBe(40);
    expect(by['2026-11-04']!.isEarlyExit).toBe(true);
    expect(by['2026-11-04']!.earlyExitMinutes).toBe(120); // 16:30 against a shift that ends 18:30
    expect(by['2026-11-02']!.checkInTime).toBe('09:40');
  });

  it('maps stored statuses: short is a half day, no check-out on a past day is a missing punch', () => {
    const records = buildAnalyticsRecords({
      ...base,
      employees: [emp(1)],
      leaves: [],
      days: [
        row({ emp_id: 1, work_date: '2026-11-02', attendance_id: 1, day_status: 'short' }),
        row({ emp_id: 1, work_date: '2026-11-03', attendance_id: 2, day_status: 'incomplete', check_out_at: null }),
      ],
    }).filter((r) => r.attendanceId > 0);
    const by = Object.fromEntries(records.map((r) => [r.workDate, r.dayStatus]));
    expect(by['2026-11-02']).toBe('half_day');
    expect(by['2026-11-03']).toBe('missing_punch');
  });

  it("leaves out today's open day and counts work on a weekly off", () => {
    const records = buildAnalyticsRecords({
      ...base,
      from: '2026-11-08', // Sunday
      to: '2026-11-13',
      employees: [emp(1)],
      leaves: [],
      days: [
        row({ emp_id: 1, work_date: '2026-11-08', attendance_id: 1, worked_on_non_working_day: true }),
        row({ emp_id: 1, work_date: '2026-11-13', attendance_id: 2, day_status: 'incomplete', check_out_at: null }),
      ],
    }).filter((r) => r.attendanceId > 0);
    expect(records.map((r) => r.workDate)).toEqual(['2026-11-08']);
    expect(records[0]!.isWeeklyOffOrHoliday).toBe(true);
    expect(records[0]!.isLate).toBe(false);
  });

  it('formats clock times in Indian time whatever the server clock says (a UTC server showed 04:44 AM for 10:14 AM)', () => {
    expect(formatTimeIst(new Date('2026-11-13T04:44:00Z'))).toBe('10:14 AM');
    expect(formatTimeIst(new Date('2026-11-13T07:03:00Z'))).toBe('12:33 PM');
    expect(formatTimeIst(new Date('2026-11-13T18:29:00Z'))).toBe('11:59 PM');
    expect(formatTimeIst(new Date('2026-11-13T18:30:00Z'))).toBe('12:00 AM');
  });

  it('gives the hour in India, for rules such as "after 8 pm"', () => {
    expect(hourInIst(new Date('2026-11-13T14:29:00Z'))).toBe(19);
    expect(hourInIst(new Date('2026-11-13T14:30:00Z'))).toBe(20);
  });

  it('gives today in Indian time', () => {
    expect(todayInIst(new Date('2026-11-12T20:00:00Z'))).toBe('2026-11-13');
  });
});
