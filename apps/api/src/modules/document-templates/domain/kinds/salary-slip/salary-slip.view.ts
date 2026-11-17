import { DocumentLayout, LayoutField, boolOption, sectionOf, textOption, visibleFields } from '../../layout';
import { amountInWords, formatAmount, formatCount, formatDate, orDash } from '../../formatters';
import { SalarySlipData } from './salary-slip.data';
import { ViewContext } from '../view-context';

/**
 * Layout + data -> the plain values the Salary Slip template prints. Everything is decided and
 * formatted here; the template itself has no logic (Mustache), so it can be rendered by any stack.
 */

export interface LabelValue {
  label: string;
  value: string;
}

export interface MoneyRow {
  label: string;
  amount: string;
  /** Empty filler so the Earnings and Deductions columns have the same number of rows. */
  blank: boolean;
}

export interface SalarySlipView {
  title: string;
  letterhead_url: string;
  has_letterhead: boolean;
  /** Many earning/deduction rows: tighter spacing so the slip still fits the letterhead's middle area. */
  compact: boolean;
  header: { rows: LabelValue[] };
  employee: { title: string; rows: LabelValue[] };
  /** Card beside Employee Summary: the net pay with day counts under it. */
  net_pay_card: { title: string; amount: string; rows: LabelValue[] };
  /** Earnings and Deductions side by side in one table, row by row, with their totals. */
  money: {
    earnings_title: string;
    deductions_title: string;
    pairs: Array<{ earning: MoneyRow; deduction: MoneyRow }>;
    earnings_total: LabelValue;
    deductions_total: LabelValue;
  };
  net_payable: { title: string; subtitle: string; amount: string; show_words: boolean; words_label: string; words: string };
  signature: { show: boolean; image_url: string; name: string; designation: string; caption: string };
  footer: { show: boolean; note: string; thanks: string };
}

export type { ViewContext } from '../view-context';

/** Up to this many rows per amounts column the slip uses its normal spacing. */
const COMPACT_AFTER_ROWS = 3;

const label = (fields: LayoutField[], key: string, fallback: string) => fields.find((f) => f.key === key)?.label ?? fallback;
const rupees = (n: number) => `₹${formatAmount(n)}`;
const money = (label: string, amount: number): MoneyRow => ({ label, amount: rupees(amount), blank: false });
const BLANK: MoneyRow = { label: '', amount: '', blank: true };

export function buildSalarySlipView(layout: DocumentLayout, d: SalarySlipData, ctx: ViewContext): SalarySlipView {
  // Header
  const headerValues: Record<string, string> = {
    pay_month: d.pay_month,
    pay_date: formatDate(d.pay_date),
    slip_no: d.slip_number ?? '—',
  };
  const header = { rows: visibleFields(sectionOf(layout, 'header')).map((f) => ({ label: f.label, value: headerValues[f.key] ?? '—' })) };

  // Employee Summary
  const empSection = sectionOf(layout, 'employee');
  const empValues: Record<string, string> = {
    employee_name: orDash(d.employee.name),
    employee_id: orDash(d.employee.code),
    department: orDash(d.employee.department),
    designation: orDash(d.employee.designation),
    uan: d.employee.pf_applicable ? orDash(d.employee.uan) : 'N/A',
  };
  const employee = {
    title: empSection?.title ?? '',
    rows: visibleFields(empSection).map((f) => ({ label: f.label, value: empValues[f.key] ?? '—' })),
  };

  // Net Pay card (the day counts the Admin chose to show)
  const cardSection = sectionOf(layout, 'net_pay_card');
  const dayCounts: Record<string, number> = { ...d.attendance, paid_days: d.salary.paid_days };
  const netPayCard = {
    title: cardSection?.title ?? '',
    amount: rupees(d.net_pay),
    rows: visibleFields(cardSection).map((f) => ({ label: f.label, value: formatCount(dayCounts[f.key] ?? 0) })),
  };

  // Earnings (amount rows are never hidden by choice; only ₹0 rows when the Admin asks)
  const earnSection = sectionOf(layout, 'earnings');
  const earnFields = visibleFields(earnSection);
  const earnHideZero = boolOption(earnSection, 'hide_zero_rows');
  const earningRows: MoneyRow[] = [];
  for (const f of earnFields) {
    if (f.key === 'basic') earningRows.push(money(f.label, d.salary.basic));
    else if (f.key === 'overtime' && (d.overtime.amount !== 0 || !earnHideZero)) earningRows.push(money(f.label, d.overtime.amount));
    else if (f.key === 'additions') for (const a of d.additions) if (a.amount !== 0 || !earnHideZero) earningRows.push(money(a.label, a.amount));
  }

  // Deductions
  const dedSection = sectionOf(layout, 'deductions');
  const dedFields = visibleFields(dedSection);
  const dedHideZero = boolOption(dedSection, 'hide_zero_rows');
  const deductionRows: MoneyRow[] = [];
  for (const f of dedFields) {
    if (f.key === 'provident_fund' && (d.provident_fund !== 0 || !dedHideZero)) deductionRows.push(money(f.label, d.provident_fund));
    else if (f.key === 'deductions') for (const x of d.deductions) if (x.amount !== 0 || !dedHideZero) deductionRows.push(money(x.label, x.amount));
  }
  if (!deductionRows.length) deductionRows.push(money('No deductions', 0));

  const height = Math.max(earningRows.length, deductionRows.length);
  while (earningRows.length < height) earningRows.push(BLANK);
  while (deductionRows.length < height) deductionRows.push(BLANK);

  // Total Net Payable
  const netSection = sectionOf(layout, 'net_payable');

  // Signature: printed when there is something to sign with (an image or a name).
  const signSection = sectionOf(layout, 'signature');
  const signName = textOption(signSection, 'name');
  const signature = {
    show: Boolean(signSection?.visible) && Boolean(ctx.signatureUrl || signName),
    image_url: ctx.signatureUrl,
    name: signName,
    designation: textOption(signSection, 'designation'),
    caption: textOption(signSection, 'caption'),
  };

  const footerSection = sectionOf(layout, 'footer');

  return {
    title: layout.title,
    letterhead_url: ctx.letterheadUrl,
    has_letterhead: Boolean(ctx.letterheadUrl),
    compact: height > COMPACT_AFTER_ROWS,
    header,
    employee,
    net_pay_card: netPayCard,
    money: {
      earnings_title: earnSection?.title ?? '',
      deductions_title: dedSection?.title ?? '',
      pairs: earningRows.map((earning, i) => ({ earning, deduction: deductionRows[i] })),
      earnings_total: { label: label(earnFields, 'total', 'Gross Earnings'), value: rupees(d.gross) },
      deductions_total: { label: label(dedFields, 'total', 'Total Deductions'), value: rupees(d.total_deductions) },
    },
    net_payable: {
      title: netSection?.title ?? '',
      subtitle: textOption(netSection, 'subtitle'),
      amount: rupees(d.net_pay),
      show_words: boolOption(netSection, 'show_words'),
      words_label: textOption(netSection, 'words_label'),
      words: amountInWords(d.net_pay),
    },
    signature,
    footer: {
      show: Boolean(footerSection?.visible),
      note: textOption(footerSection, 'note'),
      thanks: textOption(footerSection, 'thanks'),
    },
  };
}
