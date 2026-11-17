import { MustacheTemplateEngine } from '../engines/mustache.engine';
import { QUOTATION_SOURCE } from './quotation.source';
import { defaultLayout } from '../../domain/layout';
import { QUOTATION_CATALOG } from '../../domain/kinds/quotation/quotation.catalog';
import { sampleQuotationData } from '../../domain/kinds/quotation/quotation.data';
import { buildQuotationView } from '../../domain/kinds/quotation/quotation.view';

const engine = new MustacheTemplateEngine();
/** Mustache escapes "/" and "=" as entities; the browser shows them as the characters again. */
const decode = (html: string) => html.replace(/&#x2F;/g, '/').replace(/&#x3D;/g, '=');
const render = (images: Record<string, string>) =>
  decode(
    engine.render(QUOTATION_SOURCE, buildQuotationView(defaultLayout(QUOTATION_CATALOG), sampleQuotationData(), { letterheadUrl: '', signatureUrl: '', images })),
  );

describe('Quotation cover template source', () => {
  it('fills every placeholder and places both images', () => {
    const html = render({ logo: 'https://x/logo.png', cover_photo: 'https://x/photo.jpg' });
    expect(html).not.toMatch(/\{\{|\}\}/);
    for (const text of [
      'src="https://x/logo.png"', 'src="https://x/photo.jpg"', 'IDEA • EXECUTION • RESULT', 'BUDGETARY', 'QUOTATION', 'ERP / CRM',
      'Web &amp; App Development', 'Kind Attn- Mr. Rajesh Patel', 'M/s Acme Industries Pvt. Ltd.', 'Ahmedabad, Gujarat',
      'OFFER NUMBER', '17-09-2026', 'Prepared By', 'Email Address', 'www.vernoxy.com',
      'q-ic-code', 'style="color:#1d4ed8"', 'q-ic-chart', 'style="color:#16a34a"',
    ]) {
      expect(html).toContain(text);
    }
  });

  it('draws a plain panel when there is no cover photo, and no logo image without a logo', () => {
    const html = render({});
    expect(html).toContain('q-photo-empty');
    expect(html).not.toContain('alt="Logo"');
  });
});
