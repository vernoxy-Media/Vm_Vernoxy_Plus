/**
 * The data a Salary Slip is made from. Payroll fills it from the Employee record and that month's
 * Payroll; this module only formats and lays it out. Amounts are plain numbers in rupees; dates are
 * "YYYY-MM-DD"; nothing here is pre-formatted.
 */
export interface SalarySlipData {
  /** e.g. "November 2026". */
  pay_month: string;
  /** Payment date of the run ("YYYY-MM-DD"), null until it is paid. */
  pay_date: string | null;
  /** null only in a preview before the slip is made. */
  slip_number: string | null;
  employee: {
    name: string;
    code: string;
    department: string | null;
    designation: string | null;
    uan: string | null;
    pf_applicable: boolean;
  };
  /** Basic = paid days at the daily rate (Daily Rate = Monthly Salary ÷ Total Working Days). */
  salary: { paid_days: number; basic: number };
  overtime: { amount: number };
  /** One row per Addition category of the month. */
  additions: Array<{ label: string; amount: number }>;
  /** Employee PF (the employer's share is not deducted from the salary). */
  provident_fund: number;
  /** One row per Deduction category of the month. */
  deductions: Array<{ label: string; amount: number }>;
  attendance: {
    total_working_days: number;
    present_days: number;
    half_days: number;
    paid_leave_days: number;
    unpaid_leave_days: number;
    lop_days: number;
  };
  gross: number;
  total_deductions: number;
  net_pay: number;
}

/**
 * Made-up data for test slips before any payroll exists. The numbers follow the payroll rules
 * (₹30,000 a month, 26 working days, 24 full days and 1 half day), so the sample adds up.
 */
export function sampleSalarySlipData(): SalarySlipData {
  return {
    pay_month: 'November 2026',
    pay_date: '2026-11-30',
    slip_number: 'SS/2026/11/0001',
    employee: {
      name: 'Rahul Sharma',
      code: 'EMP-0001',
      department: 'Engineering',
      designation: 'Software Engineer',
      uan: '101234567890',
      pf_applicable: true,
    },
    salary: { paid_days: 24.5, basic: 28269.33 },
    overtime: { amount: 865.4 },
    additions: [{ label: 'Performance Bonus', amount: 2000 }],
    provident_fund: 1800,
    deductions: [{ label: 'Professional Tax', amount: 200 }],
    attendance: { total_working_days: 26, present_days: 23.5, half_days: 1, paid_leave_days: 1, unpaid_leave_days: 0, lop_days: 1.5 },
    gross: 31134.73,
    total_deductions: 2000,
    net_pay: 29135,
  };
}
