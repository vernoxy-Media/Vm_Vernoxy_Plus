/**
 * Salary & Payroll BFD 1.0, Section 5: the salary of one employee for one month.
 * Pure functions (no database), so the formulas can be checked with the worked
 * example of Section 11.
 */

export type PaidAs = 'FULL' | 'HALF' | 'UNPAID' | 'NOT_APPLICABLE';
export type DayType = 'WORKING_DAY' | 'WEEKLY_OFF' | 'HOLIDAY' | 'NOT_EMPLOYED';
export type IssueLevel = 'ERROR' | 'WARNING' | 'INFO';
export type Flag = 'NONE' | 'ERROR' | 'WARNING' | 'JOINED_IN_MONTH' | 'LEFT_IN_MONTH' | 'ADJUSTED';

export interface Issue {
  level: IssueLevel;
  code: string;
  message: string;
}

export interface DayInput {
  date: string; // YYYY-MM-DD
  /** Weekly Off of the shift that applied that day. */
  weeklyOff: boolean;
  holidayName: string | null;
  /** False when no shift applies to the day (BFD 4 Part 2 "Shift" check). */
  hasShift: boolean;
  attendance: { status: string; checkIn: boolean; checkOut: boolean; workedMinutes: number } | null;
  /** Approved leave of the day from Leave Management. */
  leaves: Array<{ part: string; paid: boolean }>;
  /** Monthly Salary that applied on this day (Effective From). */
  monthlySalary: number;
}

export interface PayPolicyInput {
  pfApplicable: boolean;
  uan: string | null;
  employeePfPct: number;
  employerPfPct: number;
  otEligible: boolean;
  otPaidAs: 'SALARY' | 'COMP_OFF';
  otRateType: 'FIXED' | 'MULTIPLIER';
  otRate: number;
  otMultiplier: number;
  paymentMode: string;
  bankName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
}

export interface SettingsInput {
  missingPunch: 'UNPAID' | 'FULL';
  applyPfWageLimit: boolean;
  pfWageLimit: number;
  rounding: 'NEAREST_RUPEE' | 'NONE';
}

export interface OtEntryInput {
  date: string;
  approvedHours: number;
  status: 'PENDING' | 'APPROVED' | 'REDUCED' | 'REJECTED';
}

export interface CalcInput {
  monthStart: string;
  monthEnd: string;
  employeeStatus: string; // Active | Onboarding | Inactive
  joining: string | null;
  termination: string | null;
  days: DayInput[];
  pay: PayPolicyInput;
  settings: SettingsInput;
  fullDayHours: number;
  dayAdjustments: Record<string, 'FULL' | 'HALF' | 'UNPAID'>;
  additions: number;
  deductions: number;
  hasAmountAdjustments: boolean;
  otEntries: OtEntryInput[];
}

export interface DayResult {
  date: string;
  attendance_code: string;
  day_type: DayType;
  is_working_day: boolean;
  holiday_name: string | null;
  paid_as: PaidAs;
  original_paid_as: PaidAs | null;
  is_adjusted: boolean;
  daily_rate: number;
  calculated_amount: number;
}

export interface CalcResult {
  monthly_salary: number;
  daily_rate: number;
  total_working_days: number;
  present_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  absent_days: number;
  missing_punch_days: number;
  not_employed_days: number;
  full_days: number;
  half_days: number;
  paid_days: number;
  lop_days: number;
  basic_salary: number;
  ot_hours: number;
  ot_rate: number;
  ot_amount: number;
  pf_wage: number;
  employee_pf: number;
  employer_pf: number;
  total_additions: number;
  total_deductions: number;
  gross_earnings: number;
  total_salary: number;
  flag: Flag;
  validation_message: string | null;
  issues: Issue[];
  days: DayResult[];
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const PRESENT = new Set(['present', 'completed', 'late']);

/** Attendance code and pay value of one working day in employment (BFD 5 Part 1). */
function codeForWorkingDay(day: DayInput, missingPunch: 'UNPAID' | 'FULL') {
  const out = { code: 'A', paidAs: 'UNPAID' as PaidAs, present: 0, paidLeave: 0, unpaidLeave: 0, absent: 0, mp: 0 };
  const att = day.attendance;
  const status = String(att?.status || '').toLowerCase();

  if (day.leaves.length) {
    const full = day.leaves.find((l) => l.part === 'FULL_DAY');
    if (full) {
      out.code = full.paid ? 'L' : 'LWP';
      out.paidAs = full.paid ? 'FULL' : 'UNPAID';
      if (full.paid) out.paidLeave = 1;
      else out.unpaidLeave = 1;
      return out;
    }
    // Half-day leave: the other half comes from attendance.
    let units = 0;
    for (const l of day.leaves) {
      if (l.paid) {
        units += 0.5;
        out.paidLeave += 0.5;
      } else out.unpaidLeave += 0.5;
    }
    const bothHalves = day.leaves.length >= 2;
    const worked = !bothHalves && Boolean(att?.checkIn) && (PRESENT.has(status) || status === 'half_day');
    if (worked) {
      units += 0.5;
      out.present = 0.5;
    } else if (!bothHalves) out.absent = 0.5;
    out.paidAs = units >= 1 ? 'FULL' : units >= 0.5 ? 'HALF' : 'UNPAID';
    out.code = units >= 1 ? (worked ? 'L+HD' : 'L') : worked ? 'HD' : 'L/A';
    return out;
  }

  if (!att || status === 'absent' || status === 'leave') {
    out.absent = 1;
    return out;
  }
  if (status === 'half_day') {
    out.code = 'HD';
    out.paidAs = 'HALF';
    return out;
  }
  if (status === 'incomplete' || (att.checkIn && !att.checkOut)) {
    out.code = 'MP';
    out.mp = 1;
    out.paidAs = missingPunch === 'FULL' ? 'FULL' : 'UNPAID';
    if (out.paidAs === 'UNPAID') out.absent = 1;
    return out;
  }
  if (PRESENT.has(status) || att.checkIn) {
    out.code = 'P';
    out.paidAs = 'FULL';
    out.present = 1;
    return out;
  }
  out.absent = 1;
  return out;
}

export function calculateSalary(input: CalcInput): CalcResult {
  const inEmployment = (d: string) => (!input.joining || d >= input.joining) && (!input.termination || d <= input.termination);
  const issues: Issue[] = [];
  const days: DayResult[] = [];
  let twd = 0;
  let notEmployed = 0;
  let present = 0;
  let paidLeave = 0;
  let unpaidLeave = 0;
  let absent = 0;
  let mp = 0;
  let noShiftDays = 0;
  let adjustedDays = 0;

  for (const day of input.days) {
    const nonWorking = day.weeklyOff || Boolean(day.holidayName);
    if (!inEmployment(day.date)) {
      // Total Working Days stays the full month's count; a Weekly Off or Holiday outside
      // employment is still not a working day.
      if (!nonWorking) {
        twd++;
        notEmployed++;
      }
      days.push({
        date: day.date,
        attendance_code: '—',
        day_type: 'NOT_EMPLOYED',
        is_working_day: !nonWorking,
        holiday_name: day.holidayName,
        paid_as: nonWorking ? 'NOT_APPLICABLE' : 'UNPAID',
        original_paid_as: null,
        is_adjusted: false,
        daily_rate: 0,
        calculated_amount: 0,
      });
      continue;
    }
    if (!day.hasShift) noShiftDays++;
    if (day.holidayName) {
      days.push(blankDay(day, 'H', 'HOLIDAY'));
      continue;
    }
    if (day.weeklyOff) {
      days.push(blankDay(day, 'WO', 'WEEKLY_OFF'));
      continue;
    }
    twd++;
    const c = codeForWorkingDay(day, input.settings.missingPunch);
    present += c.present;
    paidLeave += c.paidLeave;
    unpaidLeave += c.unpaidLeave;
    absent += c.absent;
    mp += c.mp;
    const adj = input.dayAdjustments[day.date];
    const adjusted = Boolean(adj) && adj !== c.paidAs;
    if (adjusted) adjustedDays++;
    days.push({
      date: day.date,
      attendance_code: c.code,
      day_type: 'WORKING_DAY',
      is_working_day: true,
      holiday_name: null,
      paid_as: adjusted ? adj : c.paidAs,
      original_paid_as: adjusted ? c.paidAs : null,
      is_adjusted: adjusted,
      daily_rate: 0,
      calculated_amount: 0,
    });
  }

  // Daily Rate = Monthly Salary ÷ Total Working Days, per day (salary may change in the month).
  const byDate = new Map(input.days.map((d) => [d.date, d]));
  let full = 0;
  let half = 0;
  let basicRaw = 0;
  let zeroSalaryPaidDays = 0;
  const rateOf = (date: string) => (twd > 0 ? round2((byDate.get(date)?.monthlySalary || 0) / twd) : 0);
  for (const d of days) {
    if (d.day_type !== 'WORKING_DAY') continue;
    d.daily_rate = rateOf(d.date);
    if (d.paid_as === 'FULL') {
      full++;
      d.calculated_amount = d.daily_rate;
    } else if (d.paid_as === 'HALF') {
      half++;
      d.calculated_amount = round2(d.daily_rate * 0.5);
    }
    if ((d.paid_as === 'FULL' || d.paid_as === 'HALF') && d.daily_rate <= 0) zeroSalaryPaidDays++;
    basicRaw += d.paid_as === 'FULL' ? d.daily_rate : d.paid_as === 'HALF' ? d.daily_rate * 0.5 : 0;
  }
  const basic = round2(basicRaw);
  const paidDays = round2(full + half * 0.5);
  const lopDays = Math.max(0, round2(twd - notEmployed - paidDays));
  const lastEmployed = [...input.days].reverse().find((d) => inEmployment(d.date));
  const monthlySalary = lastEmployed?.monthlySalary ?? input.days[input.days.length - 1]?.monthlySalary ?? 0;
  const dailyRate = twd > 0 ? round2(monthlySalary / twd) : 0;

  // OT Amount = OT Hours × OT Rate (BFD 5 Part 3). Each entry uses the Daily Rate of its day.
  let otHours = 0;
  let otAmount = 0;
  let otRate = 0;
  if (input.pay.otEligible && input.pay.otPaidAs === 'SALARY') {
    for (const e of input.otEntries) {
      if (e.status !== 'APPROVED' && e.status !== 'REDUCED') continue;
      const hours = Number(e.approvedHours) || 0;
      if (hours <= 0) continue;
      const rate =
        input.pay.otRateType === 'FIXED'
          ? Number(input.pay.otRate) || 0
          : input.fullDayHours > 0
            ? round2((rateOf(e.date) / input.fullDayHours) * (Number(input.pay.otMultiplier) || 1))
            : 0;
      otHours += hours;
      otAmount += round2(hours * rate);
      otRate = rate;
    }
    otHours = round2(otHours);
    otAmount = round2(otAmount);
    if (!otRate) {
      otRate =
        input.pay.otRateType === 'FIXED'
          ? Number(input.pay.otRate) || 0
          : input.fullDayHours > 0
            ? round2((dailyRate / input.fullDayHours) * (Number(input.pay.otMultiplier) || 1))
            : 0;
    }
  }

  // PF (BFD 5 Part 4).
  let pfWage = 0;
  let employeePf = 0;
  let employerPf = 0;
  if (input.pay.pfApplicable) {
    pfWage = round2(input.settings.applyPfWageLimit ? Math.min(basic, input.settings.pfWageLimit) : basic);
    employeePf = round2((pfWage * input.pay.employeePfPct) / 100);
    employerPf = round2((pfWage * input.pay.employerPfPct) / 100);
  }

  // Total Salary (BFD 5 Part 5).
  const additions = round2(input.additions);
  const deductions = round2(input.deductions);
  const gross = round2(basic + otAmount + additions);
  const raw = gross - (employeePf + deductions);
  const total = input.settings.rounding === 'NEAREST_RUPEE' ? Math.floor(raw + 0.5) : round2(raw);

  // Errors and warnings (BFD 4 Part 2, Section 16).
  const salaryMissing = monthlySalary <= 0 || zeroSalaryPaidDays > 0;
  if (salaryMissing) issues.push({ level: 'ERROR', code: 'NO_SALARY', message: 'Monthly Salary is not set in the Employee Master' });
  if (noShiftDays > 0) issues.push({ level: 'ERROR', code: 'NO_SHIFT', message: `No shift assigned for ${noShiftDays} day${noShiftDays === 1 ? '' : 's'}` });
  if (twd === 0) issues.push({ level: 'ERROR', code: 'NO_WORKING_DAYS', message: 'No working days in this month' });
  const unpaidDays = days.filter((d) => d.day_type === 'WORKING_DAY' && d.paid_as === 'UNPAID').length;
  if (twd > 0 && full + half + unpaidDays + notEmployed !== twd) {
    issues.push({ level: 'ERROR', code: 'DAY_COUNT', message: 'Full, Half, Unpaid and Not employed days do not add up to Total Working Days' });
  }
  if (total < 0) issues.push({ level: 'ERROR', code: 'BELOW_ZERO', message: 'Total Salary cannot be less than 0. Reduce the deduction.' });
  if (input.employeeStatus === 'Onboarding') {
    issues.push({ level: 'WARNING', code: 'ONBOARDING', message: 'Onboarding: not activated yet. Paid from the Joining Date.' });
  }
  if (input.pay.pfApplicable && !input.pay.uan) issues.push({ level: 'WARNING', code: 'NO_UAN', message: 'PF Applicable is Yes but UAN is empty' });
  if (input.pay.paymentMode === 'BANK_TRANSFER' && (!input.pay.bankName || !input.pay.accountNumber || !input.pay.ifsc)) {
    issues.push({ level: 'WARNING', code: 'BANK_DETAILS', message: 'Payment Mode is Bank transfer but bank name, account number or IFSC is empty' });
  }
  const joined = Boolean(input.joining && input.joining >= input.monthStart && input.joining <= input.monthEnd);
  const left = Boolean(input.termination && input.termination >= input.monthStart && input.termination <= input.monthEnd);
  if (joined) issues.push({ level: 'INFO', code: 'JOINED', message: `Joined ${fmtDayMonth(input.joining!)}` });
  if (left) issues.push({ level: 'INFO', code: 'LEFT', message: `Left ${fmtDayMonth(input.termination!)}` });

  const firstError = issues.find((i) => i.level === 'ERROR');
  const firstWarning = issues.find((i) => i.level === 'WARNING');
  let flag: Flag = 'NONE';
  let message: string | null = null;
  if (firstError) [flag, message] = ['ERROR', firstError.message];
  else if (firstWarning) [flag, message] = ['WARNING', firstWarning.message];
  else if (joined) [flag, message] = ['JOINED_IN_MONTH', `Joined ${fmtDayMonth(input.joining!)}`];
  else if (left) [flag, message] = ['LEFT_IN_MONTH', `Left ${fmtDayMonth(input.termination!)}`];
  else if (adjustedDays > 0 || input.hasAmountAdjustments) flag = 'ADJUSTED';

  return {
    monthly_salary: monthlySalary,
    daily_rate: dailyRate,
    total_working_days: twd,
    present_days: present,
    paid_leave_days: paidLeave,
    unpaid_leave_days: unpaidLeave,
    absent_days: absent,
    missing_punch_days: mp,
    not_employed_days: notEmployed,
    full_days: full,
    half_days: half,
    paid_days: paidDays,
    lop_days: lopDays,
    basic_salary: basic,
    ot_hours: otHours,
    ot_rate: otRate,
    ot_amount: otAmount,
    pf_wage: pfWage,
    employee_pf: employeePf,
    employer_pf: employerPf,
    total_additions: additions,
    total_deductions: deductions,
    gross_earnings: gross,
    total_salary: total,
    flag,
    validation_message: message,
    issues,
    days,
  };
}

function blankDay(day: DayInput, code: string, type: DayType): DayResult {
  return {
    date: day.date,
    attendance_code: code,
    day_type: type,
    is_working_day: false,
    holiday_name: day.holidayName,
    paid_as: 'NOT_APPLICABLE',
    original_paid_as: null,
    is_adjusted: false,
    daily_rate: 0,
    calculated_amount: 0,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDayMonth(ymd: string) {
  return `${Number(ymd.slice(8, 10))} ${MONTHS[Number(ymd.slice(5, 7)) - 1]}`;
}

// -----------------------------------------------------------------------------
// OT proposals (BFD Section 9, steps 1–2)
// -----------------------------------------------------------------------------

export interface OtProposal {
  date: string;
  day_type: 'WORKING_DAY' | 'WEEKLY_OFF' | 'HOLIDAY';
  worked_hours: number;
  proposed_hours: number;
}

/**
 * One OT entry per day: on a working day the hours above Full Day Hours; on a Weekly
 * Off or Holiday all working hours. Hours below "Minimum OT per day" are dropped and
 * hours are rounded down (none, 15 or 30 minutes).
 */
export function proposeOt(
  days: DayInput[],
  inEmployment: (date: string) => boolean,
  fullDayHours: number,
  minimumPerDay: number,
  rounding: 'NONE' | 'FIFTEEN' | 'THIRTY',
): OtProposal[] {
  const step = rounding === 'THIRTY' ? 0.5 : rounding === 'FIFTEEN' ? 0.25 : 0;
  const out: OtProposal[] = [];
  for (const d of days) {
    if (!inEmployment(d.date) || !d.attendance || !d.attendance.checkOut) continue;
    const worked = Math.max(0, (Number(d.attendance.workedMinutes) || 0) / 60);
    if (worked <= 0) continue;
    const type = d.holidayName ? 'HOLIDAY' : d.weeklyOff ? 'WEEKLY_OFF' : 'WORKING_DAY';
    let hours = type === 'WORKING_DAY' ? worked - fullDayHours : worked;
    if (hours <= 0) continue;
    hours = step ? Math.floor(hours / step + 1e-9) * step : round2(hours);
    if (hours <= 0 || hours < (Number(minimumPerDay) || 0)) continue;
    out.push({ date: d.date, day_type: type, worked_hours: round2(worked), proposed_hours: round2(hours) });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Words, slip numbers
// -----------------------------------------------------------------------------

export function slipNumber(year: number, month: number, empId: number, revision: number) {
  return `SS/${year}/${String(month).padStart(2, '0')}/${String(empId).padStart(4, '0')}${revision > 0 ? `-R${revision}` : ''}`;
}

export function rupeesInWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'Rupees Zero Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => (x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? `-${ones[x % 10]}` : ''}`);
  const three = (x: number) => (x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? ` ${two(x % 100)}` : ''}` : two(x));
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (rest) parts.push(three(rest));
  return `Rupees ${parts.join(' ')} Only`;
}

/** Day-by-day Monthly Salary from the salary timeline (HIRED / SALARY_REVISION events). */
export function salaryOn(date: string, timeline: Array<{ from: string; salary: number }>, current: number): number {
  // The Employee Master is the truth for the latest period; older periods use the logged values.
  let idx = -1;
  for (let i = 0; i < timeline.length; i++) if (timeline[i].from <= date) idx = i;
  if (idx === -1 || idx === timeline.length - 1) return current;
  return Number(timeline[idx].salary) || current;
}
