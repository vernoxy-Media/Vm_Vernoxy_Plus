import { DocumentLayout, parseHexColor, sectionOf, textOption, visibleFields } from '../../layout';
import { orDash } from '../../formatters';
import { ViewContext } from '../view-context';
import { QUOTATION_TILE_ICONS } from './quotation.catalog';
import { QuotationData, buildOfferNumber } from './quotation.data';

/** Layout + quotation details -> the plain values the cover page prints (the template has no logic). */

export interface QuotationView {
  logo_url: string;
  has_logo: boolean;
  photo_url: string;
  has_photo: boolean;
  tagline: string;
  heading: { line1: string; line2: string; for_label: string; service: string };
  services: { show: boolean; tiles: Array<{ title: string; icon: string; color: string }> };
  attention: { attn_label: string; name: string; company_prefix: string; company: string; location: string };
  offer: { rows: Array<{ label: string; value: string; icon: string; wide: boolean }> };
  prepared_by: { show: boolean; title: string; headers: string[]; values: string[] };
  footer: { show: boolean; website: string; email: string; phones: string };
}

/** "2026-09-17" -> "17-09-2026" (as on the cover design). */
const ddmmyyyy = (ymd: string) => (/^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd.split('-').reverse().join('-') : '—');

export function buildQuotationView(layout: DocumentLayout, d: QuotationData, ctx: ViewContext): QuotationView {
  const logoUrl = ctx.images?.logo ?? '';
  const photoUrl = ctx.images?.cover_photo ?? '';

  const services = sectionOf(layout, 'services');
  const tiles = [1, 2, 3, 4]
    .map((n) => {
      const iconRaw = textOption(services, `tile${n}_icon`).trim().toLowerCase();
      const icon = QUOTATION_TILE_ICONS.includes(iconRaw) ? iconRaw : 'layers';
      const fallbackColor = icon === 'users' ? '#38bdf8' : icon === 'chart' ? '#16a34a' : '#1d4ed8';
      return {
        title: textOption(services, `tile${n}_title`),
        icon,
        color: parseHexColor(textOption(services, `tile${n}_color`), fallbackColor),
      };
    })
    .filter((t) => t.title);

  const offerSection = sectionOf(layout, 'offer');
  const offerNumber = d.offer_number || buildOfferNumber(textOption(offerSection, 'offer_prefix'), d);
  const offerValues: Record<string, { value: string; icon: string; wide: boolean }> = {
    offer_number: { value: offerNumber, icon: 'document', wide: true },
    date: { value: ddmmyyyy(d.date), icon: 'calendar', wide: false },
    revision: { value: orDash(d.revision), icon: 'layers', wide: false },
  };

  const prepared = sectionOf(layout, 'prepared_by');
  const preparedFields = visibleFields(prepared);
  const preparedValues: Record<string, string> = {
    name: d.prepared_by.name,
    date: ddmmyyyy(d.prepared_by.date),
    email: d.prepared_by.email,
    contact: d.prepared_by.contact,
  };

  const footer = sectionOf(layout, 'footer');

  return {
    logo_url: logoUrl,
    has_logo: Boolean(logoUrl),
    photo_url: photoUrl,
    has_photo: Boolean(photoUrl),
    tagline: textOption(sectionOf(layout, 'branding'), 'tagline'),
    heading: {
      line1: textOption(sectionOf(layout, 'heading'), 'line1'),
      line2: layout.title,
      for_label: textOption(sectionOf(layout, 'heading'), 'for_label'),
      service: d.service_name || '[Service]',
    },
    services: { show: Boolean(services?.visible) && tiles.length > 0, tiles },
    attention: {
      attn_label: textOption(sectionOf(layout, 'attention'), 'attn_label'),
      name: d.attention_name || '[Person Name]',
      company_prefix: textOption(sectionOf(layout, 'attention'), 'company_prefix'),
      company: d.client_company || '[Client Company Name]',
      location: d.location || '[Location]',
    },
    offer: {
      rows: visibleFields(offerSection).map((f) => ({ label: f.label, ...offerValues[f.key] })),
    },
    prepared_by: {
      show: Boolean(prepared?.visible) && preparedFields.length > 0,
      title: prepared?.title ?? '',
      headers: preparedFields.map((f) => f.label),
      values: preparedFields.map((f) => preparedValues[f.key] ?? ''),
    },
    footer: {
      show: Boolean(footer?.visible),
      website: textOption(footer, 'website'),
      email: textOption(footer, 'email'),
      phones: textOption(footer, 'phones'),
    },
  };
}
