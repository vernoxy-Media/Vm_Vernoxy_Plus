import { defaultLayout, normalizeLayout } from '../../layout';
import { QUOTATION_CATALOG } from './quotation.catalog';
import { buildOfferNumber, quotationDataFrom, sampleQuotationData } from './quotation.data';
import { buildQuotationView } from './quotation.view';

const ctx = { letterheadUrl: '', signatureUrl: '', images: { logo: 'https://x/logo.png', cover_photo: 'https://x/photo.jpg' } };

describe('quotation details', () => {
  it('cleans typed-in values and defaults the date, number and revision', () => {
    const d = quotationDataFrom({ client_company: '  Acme   Ltd ', date: 'not a date', prepared_by: { name: 'Krishna' } }, new Date('2026-09-17T06:00:00Z'));
    expect(d.client_company).toBe('Acme Ltd');
    expect(d.date).toBe('2026-09-17');
    expect(d.qt_number).toBe('001');
    expect(d.revision).toBe('00');
    expect(d.prepared_by).toEqual({ name: 'Krishna', date: '2026-09-17', email: '', contact: '' });
  });

  it('makes the offer number from client, service, month-year, number and revision', () => {
    const d = quotationDataFrom({ client_company: 'Acme Industries', service_name: 'ERP / CRM', qt_number: '012', revision: '01', date: '2026-09-17' });
    expect(buildOfferNumber('Vernoxy Media', d)).toBe('Vernoxy Media/Acme Industries/ERP-CRM/0926/QT-012/R01');
  });
});

describe('quotation cover view', () => {
  const layout = defaultLayout(QUOTATION_CATALOG);

  it('uses a typed offer number as it is, else the made one', () => {
    const typed = buildQuotationView(layout, { ...sampleQuotationData(), offer_number: 'VM/ACME/001' }, ctx);
    expect(typed.offer.rows[0]).toMatchObject({ label: 'OFFER NUMBER', value: 'VM/ACME/001' });
    const made = buildQuotationView(layout, sampleQuotationData(), ctx);
    expect(made.offer.rows[0].value).toBe('Vernoxy Media/Acme Industries Pvt. Ltd./ERP-CRM/0926/QT-012/R00');
    expect(made.offer.rows[1]).toMatchObject({ label: 'DATE', value: '17-09-2026' });
  });

  it('shows only tiles with a title and falls back to a known icon', () => {
    const custom = normalizeLayout(QUOTATION_CATALOG, {
      sections: [{ key: 'services', options: { tile1_title: 'Cloud', tile1_icon: 'cloud', tile2_title: '', tile3_title: 'Apps', tile3_icon: 'nope', tile4_title: '' } }],
    });
    expect(buildQuotationView(custom, sampleQuotationData(), ctx).services.tiles).toEqual([
      { title: 'Cloud', icon: 'cloud', color: '#1d4ed8' },
      { title: 'Apps', icon: 'users', color: '#38bdf8' },
    ]);
  });

  it('keeps a chosen tile icon colour', () => {
    const custom = normalizeLayout(QUOTATION_CATALOG, {
      sections: [{ key: 'services', options: { tile1_title: 'Apps', tile1_icon: 'CODE', tile1_color: '#ea580c', tile2_title: '', tile3_title: '', tile4_title: '' } }],
    });
    expect(buildQuotationView(custom, sampleQuotationData(), ctx).services.tiles).toEqual([
      { title: 'Apps', icon: 'code', color: '#ea580c' },
    ]);
  });

  it('prints placeholders for missing client details', () => {
    const view = buildQuotationView(layout, quotationDataFrom({}), ctx);
    expect(view.attention).toMatchObject({ name: '[Person Name]', company: '[Client Company Name]', location: '[Location]' });
  });
});
