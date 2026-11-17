import { defaultLayout, normalizeLayout } from './layout';
import { amountInWords, formatAmount } from './formatters';
import { nextVersion, templateCode } from './template-rules';
import { SALARY_SLIP_CATALOG } from './kinds/salary-slip/salary-slip.catalog';
import { QUOTATION_CATALOG } from './kinds/quotation/quotation.catalog';
import { sampleSalarySlipData } from './kinds/salary-slip/salary-slip.data';
import { buildSalarySlipView } from './kinds/salary-slip/salary-slip.view';

const ctx = { letterheadUrl: '', signatureUrl: '' };

describe('layout colour and choice options', () => {
  it('lowercases a known choice and rejects an unknown one', () => {
    const layout = normalizeLayout(QUOTATION_CATALOG, {
      sections: [{ key: 'services', options: { tile1_icon: 'CLOUD', tile2_icon: 'nope' } }],
    });
    const opts = layout.sections.find((s) => s.key === 'services')!.options;
    expect(opts.tile1_icon).toBe('cloud');
    expect(opts.tile2_icon).toBe('layers');
  });

  it('keeps a hex colour and falls back when the value is not a colour', () => {
    const layout = normalizeLayout(QUOTATION_CATALOG, {
      sections: [{ key: 'services', options: { tile4_color: '#EA580C', tile1_color: 'blue' } }],
    });
    const opts = layout.sections.find((s) => s.key === 'services')!.options;
    expect(opts.tile4_color).toBe('#ea580c');
    expect(opts.tile1_color).toBe('#1d4ed8');
  });
});

describe('layout normalisation', () => {
  it('fills a missing layout with every catalog section and field', () => {
    const layout = normalizeLayout(SALARY_SLIP_CATALOG, undefined);
    expect(layout).toEqual(defaultLayout(SALARY_SLIP_CATALOG));
    expect(layout.sections.map((s) => s.key)).toEqual(SALARY_SLIP_CATALOG.sections.map((s) => s.key));
  });

  it('drops unknown keys, keeps the given field order and appends missing fields', () => {
    const layout = normalizeLayout(SALARY_SLIP_CATALOG, {
      sections: [
        { key: 'hack', title: 'X', fields: [] },
        { key: 'employee', fields: [{ key: 'designation', label: 'Role', visible: true }, { key: 'pan', label: 'PAN', visible: true }] },
      ],
    });
    expect(layout.sections.some((s) => s.key === 'hack')).toBe(false);
    const emp = layout.sections.find((s) => s.key === 'employee')!;
    expect(emp.fields[0]).toEqual({ key: 'designation', label: 'Role', visible: true });
    expect(emp.fields.some((f) => f.key === 'pan')).toBe(false);
    expect(emp.fields.map((f) => f.key).sort()).toEqual(['department', 'designation', 'employee_id', 'employee_name', 'uan']);
  });

  it('never hides required fields or sections that cannot be hidden', () => {
    const layout = normalizeLayout(SALARY_SLIP_CATALOG, {
      sections: [
        { key: 'earnings', visible: false, fields: [{ key: 'basic', label: 'Basic', visible: false }] },
        { key: 'employee', fields: [{ key: 'uan', label: 'UAN', visible: false }] },
      ],
    });
    const earnings = layout.sections.find((s) => s.key === 'earnings')!;
    expect(earnings.visible).toBe(true);
    expect(earnings.fields.find((f) => f.key === 'basic')!.visible).toBe(true);
    expect(layout.sections.find((s) => s.key === 'employee')!.fields.find((f) => f.key === 'uan')!.visible).toBe(false);
  });

  it('trims texts and falls back to the default label when empty', () => {
    const layout = normalizeLayout(SALARY_SLIP_CATALOG, {
      title: '   ',
      sections: [{ key: 'employee', title: '  Staff   details ', fields: [{ key: 'employee_name', label: '', visible: true }] }],
    });
    expect(layout.title).toBe('SALARY SLIP');
    const emp = layout.sections.find((s) => s.key === 'employee')!;
    expect(emp.title).toBe('Staff details');
    expect(emp.fields[0].label).toBe('Employee Name');
  });
});

describe('salary slip view', () => {
  const layout = defaultLayout(SALARY_SLIP_CATALOG);

  it('prints amounts only, without day-wise working', () => {
    const view = buildSalarySlipView(layout, sampleSalarySlipData(), ctx);
    expect(view.money.pairs[0].earning).toEqual({ label: 'Basic Salary', amount: '₹28,269.33', blank: false });
    expect(view.money.pairs[1].earning).toEqual({ label: 'Overtime', amount: '₹865.40', blank: false });
    expect(view.money.earnings_total).toEqual({ label: 'Gross Earnings', value: '₹31,134.73' });
    expect(view.money.deductions_total).toEqual({ label: 'Total Deductions', value: '₹2,000.00' });
  });

  it('hides ₹0 rows when asked and pads both columns to the same height', () => {
    const data = sampleSalarySlipData();
    data.overtime = { amount: 0 };
    data.deductions = [];
    const view = buildSalarySlipView(layout, data, ctx);
    expect(view.money.pairs.map((p) => p.earning.label)).toEqual(['Basic Salary', 'Performance Bonus']);
    expect(view.money.pairs.map((p) => p.deduction.label)).toEqual(['Provident Fund (PF)', '']);
    expect(view.money.pairs[1].deduction.blank).toBe(true);
  });

  it('prints the signature only when there is an image or a name', () => {
    const data = sampleSalarySlipData();
    expect(buildSalarySlipView(layout, data, ctx).signature.show).toBe(false);
    const withImage = buildSalarySlipView(layout, data, { ...ctx, signatureUrl: 'https://x/sign.png' });
    expect(withImage.signature).toMatchObject({ show: true, image_url: 'https://x/sign.png', caption: 'Authorised Signatory' });
    const named = normalizeLayout(SALARY_SLIP_CATALOG, {
      sections: [{ key: 'signature', options: { caption: 'Approved by', name: 'Priya Mehta', designation: 'HR Manager' } }],
    });
    expect(buildSalarySlipView(named, data, ctx).signature).toMatchObject({ show: true, name: 'Priya Mehta', designation: 'HR Manager', caption: 'Approved by' });
    const hidden = normalizeLayout(SALARY_SLIP_CATALOG, { sections: [{ key: 'signature', visible: false, options: { name: 'Priya Mehta' } }] });
    expect(buildSalarySlipView(hidden, data, ctx).signature.show).toBe(false);
  });

  it('shows the net pay card with the chosen day counts', () => {
    const view = buildSalarySlipView(layout, sampleSalarySlipData(), ctx);
    expect(view.net_pay_card.amount).toBe('₹29,135.00');
    expect(view.net_pay_card.rows).toEqual([
      { label: 'Paid Days', value: '24.5' },
      { label: 'LOP Days', value: '1.5' },
    ]);
  });

  it('pairs earning and deduction rows for the side-by-side table', () => {
    const view = buildSalarySlipView(layout, sampleSalarySlipData(), ctx);
    expect(view.money.pairs).toHaveLength(3);
    expect(view.money.pairs[0].earning.label).toBe('Basic Salary');
    expect(view.money.pairs[2].deduction.blank).toBe(true);
  });

  it('prints N/A as UAN when PF does not apply', () => {
    const data = sampleSalarySlipData();
    data.employee.pf_applicable = false;
    const view = buildSalarySlipView(layout, data, ctx);
    expect(view.employee.rows.find((r) => r.label === 'UAN Number')!.value).toBe('N/A');
  });
});

describe('formatters and rules', () => {
  it('formats rupees the Indian way and in words', () => {
    expect(formatAmount(110000)).toBe('1,10,000.00');
    expect(amountInWords(92200)).toBe('Rupees Ninety-Two Thousand Two Hundred Only');
  });

  it('numbers versions and codes', () => {
    expect(nextVersion([])).toBe(1);
    expect(nextVersion([1, 3, 2])).toBe(4);
    expect(templateCode('payroll_salary_slip', 3)).toBe('payroll_salary_slip_v3');
    expect(templateCode('x'.repeat(60), 12).length).toBe(50);
  });
});
