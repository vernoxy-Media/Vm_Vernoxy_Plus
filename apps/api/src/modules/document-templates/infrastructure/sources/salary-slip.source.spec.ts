import { MustacheTemplateEngine } from '../engines/mustache.engine';
import { SALARY_SLIP_SOURCE } from './salary-slip.source';
import { defaultLayout, normalizeLayout } from '../../domain/layout';
import { SALARY_SLIP_CATALOG } from '../../domain/kinds/salary-slip/salary-slip.catalog';
import { sampleSalarySlipData } from '../../domain/kinds/salary-slip/salary-slip.data';
import { ViewContext, buildSalarySlipView } from '../../domain/kinds/salary-slip/salary-slip.view';

const engine = new MustacheTemplateEngine();
/** Mustache escapes "/", "=" and "`" as entities; the browser shows them as the characters again. */
const decode = (html: string) => html.replace(/&#x2F;/g, '/').replace(/&#x3D;/g, '=').replace(/&#x60;/g, '`');
const NO_IMAGES: ViewContext = { letterheadUrl: '', signatureUrl: '' };
const render = (layout = defaultLayout(SALARY_SLIP_CATALOG), ctx: Partial<ViewContext> = {}, data = sampleSalarySlipData()) =>
  decode(engine.render(SALARY_SLIP_SOURCE, buildSalarySlipView(layout, data, { ...NO_IMAGES, ...ctx })));

describe('Salary Slip template source', () => {
  it('fills every placeholder', () => {
    const html = render();
    expect(html).not.toMatch(/\{\{|\}\}/);
    for (const text of [
      'SALARY SLIP', 'EMPLOYEE SUMMARY', 'Rahul Sharma', 'EMP-0001', '₹29,135.00', 'Total Net Pay', 'Paid Days', 'LOP Days',
      'Basic Salary', '₹28,269.33', 'Performance Bonus', 'Gross Earnings', '₹31,134.73', 'Total Deductions', '₹2,000.00',
      'TOTAL NET PAYABLE', 'Gross Earnings - Total Deductions', 'Rupees Twenty-Nine Thousand One Hundred Thirty-Five Only',
      'Thank you for your contribution!',
    ]) {
      expect(html).toContain(text);
    }
  });

  it('prints amounts without day-wise working', () => {
    const html = render();
    expect(html).not.toContain('/day');
    expect(html).not.toContain('/hr');
    expect(html).not.toContain('₹₹');
  });

  it('has no watermark and draws the letterhead only when there is one', () => {
    expect(render()).not.toContain('SAMPLE');
    expect(render()).not.toContain('vx-letterhead"');
    expect(render(undefined, { letterheadUrl: 'https://pulse.example/api/v1/document-templates/assets/7' })).toContain(
      'src="https://pulse.example/api/v1/document-templates/assets/7"',
    );
  });

  it('prints the signature block with the image, signer and caption', () => {
    expect(render()).not.toContain('class="vx-sign"');
    const layout = normalizeLayout(SALARY_SLIP_CATALOG, {
      sections: [{ key: 'signature', options: { caption: 'Approved by', name: 'Priya Mehta', designation: 'HR Manager' } }],
    });
    const html = render(layout, { signatureUrl: 'https://pulse.example/api/v1/document-templates/assets/9' });
    expect(html).toContain('src="https://pulse.example/api/v1/document-templates/assets/9"');
    for (const text of ['Priya Mehta', 'HR Manager', 'Approved by']) expect(html).toContain(text);
  });

  it('uses the Admin labels', () => {
    const layout = normalizeLayout(SALARY_SLIP_CATALOG, { sections: [{ key: 'employee', fields: [{ key: 'designation', label: 'Role', visible: true }] }] });
    expect(render(layout)).toContain('>Role<');
  });

  it('escapes data so a name cannot inject HTML', () => {
    const data = sampleSalarySlipData();
    data.employee.name = '<script>x</script>';
    const html = render(undefined, {}, data);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
