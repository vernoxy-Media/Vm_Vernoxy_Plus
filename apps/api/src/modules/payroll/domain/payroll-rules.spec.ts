import { CalcInput, DayInput, calculateSalary, proposeOt, rupeesInWords, salaryOn, slipNumber } from './payroll-rules';

/** BFD Section 11: Ravi Patel, September 2026, Sunday off, holiday 14 Sep. */
function septemberDays(salary = 30000): DayInput[] {
  const days: DayInput[] = [];
  const halfDays = ['2026-09-09', '2026-09-22'];
  for (let d = 1; d <= 30; d++) {
    const date = `2026-09-${String(d).padStart(2, '0')}`;
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    const day: DayInput = {
      date,
      weeklyOff: dow === 0,
      holidayName: date === '2026-09-14' ? 'Ganesh Chaturthi' : null,
      hasShift: true,
      attendance: { status: 'present', checkIn: true, checkOut: true, workedMinutes: 480 },
      leaves: [],
      monthlySalary: salary,
    };
    if (day.weeklyOff || day.holidayName) day.attendance = null;
    if (halfDays.includes(date)) day.attendance = { status: 'half_day', checkIn: true, checkOut: true, workedMinutes: 240 };
    if (date === '2026-09-03') day.attendance = null; // Absent
    if (date === '2026-09-17') day.leaves = [{ part: 'FULL_DAY', paid: true }];
    if (date === '2026-09-24') day.leaves = [{ part: 'FULL_DAY', paid: false }];
    days.push(day);
  }
  return days;
}

function base(over: Partial<CalcInput> = {}): CalcInput {
  return {
    monthStart: '2026-09-01',
    monthEnd: '2026-09-30',
    employeeStatus: 'Active',
    joining: '2024-01-01',
    termination: null,
    days: septemberDays(),
    pay: {
      pfApplicable: true,
      uan: '100200300400',
      employeePfPct: 12,
      employerPfPct: 12,
      otEligible: true,
      otPaidAs: 'SALARY',
      otRateType: 'MULTIPLIER',
      otRate: 0,
      otMultiplier: 1.5,
      paymentMode: 'BANK_TRANSFER',
      bankName: 'HDFC',
      accountNumber: '123',
      ifsc: 'HDFC0001',
    },
    settings: { missingPunch: 'UNPAID', applyPfWageLimit: true, pfWageLimit: 15000, rounding: 'NEAREST_RUPEE' },
    fullDayHours: 8,
    dayAdjustments: {},
    additions: 0,
    deductions: 0,
    hasAmountAdjustments: false,
    otEntries: [],
    ...over,
  };
}

describe('payroll-rules (BFD Section 11 worked example)', () => {
  it('step 1–3: working days, daily rate and basic salary before adjustment', () => {
    const r = calculateSalary(base());
    expect(r.total_working_days).toBe(25);
    expect(r.daily_rate).toBe(1200);
    expect(r.full_days).toBe(21);
    expect(r.half_days).toBe(2);
    expect(r.basic_salary).toBe(26400);
  });

  it('steps 4–9: day adjustment, OT, additions, PF and total = ₹ 28,150', () => {
    const r = calculateSalary(
      base({
        dayAdjustments: { '2026-09-03': 'FULL' },
        otEntries: [{ date: '2026-09-10', approvedHours: 6, status: 'APPROVED' }],
        additions: 2000,
        deductions: 1000,
        hasAmountAdjustments: true,
      }),
    );
    expect(r.full_days).toBe(22);
    expect(r.basic_salary).toBe(27600);
    expect(r.ot_rate).toBe(225);
    expect(r.ot_amount).toBe(1350);
    expect(r.pf_wage).toBe(15000);
    expect(r.employee_pf).toBe(1800);
    expect(r.employer_pf).toBe(1800);
    expect(r.gross_earnings).toBe(30950);
    expect(r.total_salary).toBe(28150);
    expect(r.paid_days).toBe(23);
    expect(r.lop_days).toBe(2);
    expect(r.days.find((d) => d.date === '2026-09-03')).toMatchObject({ attendance_code: 'A', paid_as: 'FULL', is_adjusted: true });
    expect(r.flag).toBe('ADJUSTED');
  });

  it('joined 15 Sep: full-month working days, only days in employment paid, weekends not counted twice', () => {
    const r = calculateSalary(base({ joining: '2026-09-15' }));
    expect(r.total_working_days).toBe(25);
    expect(r.not_employed_days).toBe(11); // 1–13 Sep minus Sundays 6 & 13 (14 Sep is in employment? no: 15th)
    expect(r.issues.some((i) => i.code === 'JOINED')).toBe(true);
    expect(r.flag).toBe('JOINED_IN_MONTH');
  });

  it('errors: no salary, no working days, below zero', () => {
    expect(calculateSalary(base({ days: septemberDays(0) })).flag).toBe('ERROR');
    const noWork = septemberDays().map((d) => ({ ...d, weeklyOff: true }));
    expect(calculateSalary(base({ days: noWork })).issues.map((i) => i.code)).toContain('NO_WORKING_DAYS');
    const neg = calculateSalary(base({ deductions: 999999, hasAmountAdjustments: true }));
    expect(neg.issues.map((i) => i.code)).toContain('BELOW_ZERO');
  });

  it('warnings stack: missing UAN and bank details both reported', () => {
    const r = calculateSalary(base({ pay: { ...base().pay, uan: null, ifsc: null } }));
    expect(r.issues.filter((i) => i.level === 'WARNING').map((i) => i.code)).toEqual(['NO_UAN', 'BANK_DETAILS']);
  });

  it('salary changed mid-month uses each day’s salary', () => {
    const tl = [
      { from: '2024-01-01', salary: 25000 },
      { from: '2026-09-16', salary: 30000 },
    ];
    expect(salaryOn('2026-09-10', tl, 30000)).toBe(25000);
    expect(salaryOn('2026-09-20', tl, 30000)).toBe(30000);
  });

  it('OT proposals: above full day on working days, all hours on weekly off, rounded down', () => {
    const days = septemberDays();
    days[9].attendance = { status: 'present', checkIn: true, checkOut: true, workedMinutes: 8 * 60 + 100 }; // 10 Sep +1h40
    days[5].attendance = { status: 'present', checkIn: true, checkOut: true, workedMinutes: 200 }; // Sun 6 Sep 3h20
    const p = proposeOt(days, () => true, 8, 1, 'THIRTY');
    expect(p).toEqual([
      { date: '2026-09-06', day_type: 'WEEKLY_OFF', worked_hours: 3.33, proposed_hours: 3 },
      { date: '2026-09-10', day_type: 'WORKING_DAY', worked_hours: 9.67, proposed_hours: 1.5 },
    ]);
  });

  it('slip number and amount in words', () => {
    expect(slipNumber(2026, 9, 14, 0)).toBe('SS/2026/09/0014');
    expect(slipNumber(2026, 9, 14, 1)).toBe('SS/2026/09/0014-R1');
    expect(rupeesInWords(28150)).toBe('Rupees Twenty-Eight Thousand One Hundred Fifty Only');
  });
});
