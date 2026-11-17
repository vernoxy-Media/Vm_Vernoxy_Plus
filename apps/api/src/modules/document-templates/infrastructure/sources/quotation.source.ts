/**
 * Quotation cover page: plain HTML + CSS with Mustache placeholders, no logic (the view builder in
 * domain/kinds/quotation decides every value). One full A4 page, no letterhead: the logo and the
 * cover photo are replaceable images; the diagonal shapes, bands and icons are drawn here, so they
 * stay sharp at any size and can be recoloured in one place. Typeface: DM Sans (as the letterhead).
 *
 * A self-contained fragment (its own <style>, classes prefixed "q-").
 */

/** Stroke is black so the glyph can be a CSS mask; colour comes from `color` / currentColor. */
const svgMask = (body: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E${body}%3C/svg%3E")`;

/** Icon name -> SVG body. Tile icons are the names in QUOTATION_TILE_ICONS. */
const ICONS: Record<string, string> = {
  code: `%3Cpath d='M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16'/%3E`,
  layers: `%3Cpath d='M12 3l9 5-9 5-9-5 9-5zM3 12.5l9 5 9-5M3 16.5l9 5 9-5'/%3E`,
  users: `%3Ccircle cx='9' cy='8' r='3.5'/%3E%3Ccircle cx='16.5' cy='8.5' r='3'/%3E%3Cpath d='M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6M14 14.3c3.3-.6 7.5 1.2 7.5 5.7'/%3E`,
  chart: `%3Cpath d='M4 20v-6M9 20v-9M14 20v-7M19 20V7M3 10l6-4 5 3 7-5'/%3E`,
  cog: `%3Ccircle cx='12' cy='12' r='3'/%3E%3Cpath d='M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1'/%3E`,
  cloud: `%3Cpath d='M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.5 3.5 0 0 0 7 18z'/%3E`,
  shield: `%3Cpath d='M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z'/%3E`,
  mobile: `%3Crect x='7' y='2' width='10' height='20' rx='2'/%3E%3Cpath d='M11 18h2'/%3E`,
  cart: `%3Ccircle cx='9' cy='20' r='1.5'/%3E%3Ccircle cx='18' cy='20' r='1.5'/%3E%3Cpath d='M2 3h3l2.5 12h12l2-8H6'/%3E`,
  globe: `%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'/%3E`,
  document: `%3Cpath d='M6 2h8l5 5v15H6z'/%3E%3Cpath d='M14 2v5h5M9 12h7M9 16h7'/%3E`,
  calendar: `%3Crect x='3' y='5' width='18' height='16' rx='2'/%3E%3Cpath d='M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2'/%3E`,
  user_white: `%3Ccircle cx='12' cy='12' r='10'/%3E%3Ccircle cx='12' cy='9.5' r='3.2'/%3E%3Cpath d='M6.5 18.5c1.2-2.6 3.2-3.8 5.5-3.8s4.3 1.2 5.5 3.8'/%3E`,
  globe_footer: `%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'/%3E`,
  mail: `%3Crect x='3' y='5' width='18' height='14' rx='2'/%3E%3Cpath d='M3 7l9 6 9-6'/%3E`,
  phone: `%3Cpath d='M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'/%3E`,
};

const iconCss = Object.entries(ICONS)
  .map(([name, body]) => {
    const mask = svgMask(body);
    return `.q-cover .q-ic-${name}{-webkit-mask-image:${mask};mask-image:${mask};}`;
  })
  .join('\n');

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
@page { size: A4; margin: 0; }
.q-cover, .q-cover * { box-sizing: border-box; }
.q-cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif; color: #0f172a; }
.q-cover .q-page { position: relative; width: 210mm; height: 297mm; margin: 0 auto; background: #fff; overflow: hidden; }
.q-cover .q-abs { position: absolute; }
.q-cover .q-ic { display: inline-block; background-color: currentColor; color: #1d4ed8; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; -webkit-mask-size: contain; mask-size: contain; }
.q-cover .q-ic-user_white { color: #fff; }
.q-cover .q-offer .q-ic, .q-cover .q-footer .q-ic { color: #1d4ed8; }
${iconCss}

/* Cover photo, cut diagonally, with a light edge along the cut */
.q-cover .q-photo-edge { top: 0; right: 0; width: 56%; height: 77%; background: linear-gradient(160deg, #e0f2fe, #bfdbfe); clip-path: polygon(40% 0, 100% 0, 100% 100%, 0 42%); }
.q-cover .q-photo { top: 0; right: 0; width: 54%; height: 74%; clip-path: polygon(42% 0, 100% 0, 100% 100%, 3% 42%); overflow: hidden; }
.q-cover .q-photo img { width: 100%; height: 100%; object-fit: fill; display: block; }
.q-cover .q-photo-empty { width: 100%; height: 100%; background: linear-gradient(160deg, #dbeafe, #93c5fd); }

/* Blue parallelograms at the top */
.q-cover .q-deco-a { top: -2mm; left: 50%; width: 22mm; height: 30mm; background: linear-gradient(160deg, #bfdbfe, #93c5fd); transform: skewX(-38deg); opacity: 0.9; }
.q-cover .q-deco-b { top: -2mm; left: 60%; width: 40mm; height: 46mm; background: linear-gradient(160deg, #2563eb, #1e3a8a); transform: skewX(-38deg); }
.q-cover .q-deco-c { top: 20mm; left: 63%; width: 14mm; height: 26mm; background: linear-gradient(160deg, #60a5fa, #2563eb); transform: skewX(-38deg); opacity: 0.85; }

/* Logo and tagline */
.q-cover .q-logo { top: 10mm; left: 13mm; width: 88mm; text-align: center; }
.q-cover .q-logo img { max-width: 88mm; max-height: 20mm; display: block; margin: 0 auto; }
.q-cover .q-tagline { margin-top: 2.5mm; font-size: 11.5px; font-weight: 700; letter-spacing: 0.8px; color: #0f172a; }

/* Heading */
.q-cover .q-heading { top: 47mm; left: 13mm; width: 100mm; }
.q-cover .q-line1 { font-size: 34px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.05; color: #0b1220; }
.q-cover .q-line2 { font-size: 56px; font-weight: 800; line-height: 1.02; letter-spacing: 0.5px; color: #1d3fd1; }
.q-cover .q-accent { margin-top: 5mm; width: 25mm; height: 1.4mm; border-radius: 1mm; background: linear-gradient(90deg, #1d4ed8, #38bdf8); }
.q-cover .q-for { margin-top: 6mm; font-size: 20px; font-weight: 700; line-height: 1.35; color: #111827; }

/* Service tiles */
.q-cover .q-tiles { top: 124mm; left: 10mm; width: 116mm; display: flex; }
.q-cover .q-tile { flex: 1; text-align: center; padding: 1mm 2mm; border-left: 1px solid #d6dde8; }
.q-cover .q-tile:first-child { border-left: 0; }
.q-cover .q-tile .q-ic { width: 13mm; height: 13mm; }
.q-cover .q-tile-title { margin-top: 2mm; font-size: 12.5px; font-weight: 700; line-height: 1.3; color: #111827; }

/* Client band */
.q-cover .q-band { top: 163mm; left: 0; width: 68%; height: 31mm; background: linear-gradient(90deg, #0a2463, #1e40af); clip-path: polygon(0 0, 100% 0, 87% 100%, 0 100%); }
.q-cover .q-band-stripe { top: 163mm; left: 4mm; width: 4mm; height: 31mm; background: #38bdf8; transform: skewX(-18deg); }
.q-cover .q-band-icon { top: 171mm; left: 17mm; width: 15mm; height: 15mm; }
.q-cover .q-band-text { top: 166.5mm; left: 37mm; width: 100mm; color: #fff; }
.q-cover .q-band-attn { font-size: 15px; color: #dbeafe; }
.q-cover .q-band-company { margin-top: 1mm; font-size: 20px; font-weight: 700; line-height: 1.2; }
.q-cover .q-band-location { margin-top: 1mm; font-size: 15px; color: #dbeafe; }

/* Offer details */
.q-cover .q-offer { top: 203mm; left: 11mm; right: 11mm; height: 30mm; background: #fff; border: 1px solid #dbe3ef; border-radius: 3mm; box-shadow: 0 1mm 3mm rgba(15, 23, 42, 0.06); display: flex; align-items: center; padding: 0 5mm; }
.q-cover .q-offer-cell { display: flex; align-items: flex-start; padding: 0 4mm; border-left: 1px solid #dbe3ef; }
.q-cover .q-offer-cell:first-child { border-left: 0; padding-left: 0; }
.q-cover .q-offer-cell.q-wide { flex: 1; }
.q-cover .q-offer-cell .q-ic { flex: none; width: 9mm; height: 9mm; margin-right: 3mm; }
.q-cover .q-offer-label { font-size: 14px; font-weight: 800; color: #1d3fd1; letter-spacing: 0.2px; }
.q-cover .q-offer-value { margin-top: 1mm; font-size: 12.5px; color: #111827; line-height: 1.35; word-break: break-word; }
.q-cover .q-offer-cell:not(.q-wide) .q-offer-value { font-size: 15px; font-weight: 500; }

/* Prepared By */
.q-cover .q-prep-title { top: 238mm; left: 11mm; font-size: 19px; font-weight: 700; color: #1d3fd1; }
.q-cover .q-prep { top: 246mm; left: 11mm; right: 11mm; border: 1px solid #dbe3ef; border-radius: 3mm; overflow: hidden; }
.q-cover .q-prep table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.q-cover .q-prep th { background: linear-gradient(90deg, #1e40af, #1d4ed8); color: #fff; font-size: 13px; font-weight: 700; padding: 3mm 3mm; text-align: center; border-left: 1px solid rgba(255, 255, 255, 0.25); }
.q-cover .q-prep td { font-size: 12.5px; padding: 4.5mm 3mm; text-align: center; border-left: 1px solid #dbe3ef; color: #111827; }
.q-cover .q-prep th:first-child, .q-cover .q-prep td:first-child { border-left: 0; }

/* Contact line and bottom band */
.q-cover .q-footer { top: 277mm; left: 11mm; right: 11mm; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #111827; }
.q-cover .q-footer-item { display: flex; align-items: center; }
.q-cover .q-footer-item .q-ic { width: 6mm; height: 6mm; margin-right: 2.5mm; }
.q-cover .q-footer-sep { width: 1px; height: 6mm; background: #cbd5e1; }
.q-cover .q-bottom { bottom: 0; left: 0; right: 0; height: 7mm; background: linear-gradient(90deg, #0a2463, #1d4ed8 45%, #38bdf8); }
.q-cover .q-bottom-gap { bottom: -1mm; width: 5mm; height: 9mm; background: #fff; transform: skewX(-38deg); }

@media print {
  html, body { margin: 0 !important; padding: 0 !important; }
  .q-cover .q-page { margin: 0; }
}
`;

export const QUOTATION_SOURCE = `<div class="q-cover">
<style>${STYLES}</style>
<div class="q-page">
  <div class="q-abs q-photo-edge"></div>
  <div class="q-abs q-photo">{{#has_photo}}<img src="{{photo_url}}" alt="">{{/has_photo}}{{^has_photo}}<div class="q-photo-empty"></div>{{/has_photo}}</div>
  <div class="q-abs q-deco-a"></div>
  <div class="q-abs q-deco-b"></div>
  <div class="q-abs q-deco-c"></div>

  <div class="q-abs q-logo">
    {{#has_logo}}<img src="{{logo_url}}" alt="Logo">{{/has_logo}}
    {{#tagline}}<div class="q-tagline">{{tagline}}</div>{{/tagline}}
  </div>

  <div class="q-abs q-heading">
    {{#heading.line1}}<div class="q-line1">{{heading.line1}}</div>{{/heading.line1}}
    <div class="q-line2">{{heading.line2}}</div>
    <div class="q-accent"></div>
    <div class="q-for">{{#heading.for_label}}{{heading.for_label}}<br>{{/heading.for_label}}{{heading.service}}</div>
  </div>

  {{#services.show}}
  <div class="q-abs q-tiles">
    {{#services.tiles}}<div class="q-tile"><span class="q-ic q-ic-{{icon}}" style="color:{{color}}"></span><div class="q-tile-title">{{title}}</div></div>{{/services.tiles}}
  </div>
  {{/services.show}}

  <div class="q-abs q-band"></div>
  <div class="q-abs q-band-stripe"></div>
  <span class="q-abs q-ic q-ic-user_white q-band-icon"></span>
  <div class="q-abs q-band-text">
    <div class="q-band-attn">{{attention.attn_label}} {{attention.name}}</div>
    <div class="q-band-company">{{attention.company_prefix}} {{attention.company}}</div>
    <div class="q-band-location">{{attention.location}}</div>
  </div>

  <div class="q-abs q-offer">
    {{#offer.rows}}
    <div class="q-offer-cell{{#wide}} q-wide{{/wide}}">
      <span class="q-ic q-ic-{{icon}}"></span>
      <div><div class="q-offer-label">{{label}}</div><div class="q-offer-value">{{value}}</div></div>
    </div>
    {{/offer.rows}}
  </div>

  {{#prepared_by.show}}
  {{#prepared_by.title}}<div class="q-abs q-prep-title">{{prepared_by.title}}</div>{{/prepared_by.title}}
  <div class="q-abs q-prep"><table>
    <thead><tr>{{#prepared_by.headers}}<th>{{.}}</th>{{/prepared_by.headers}}</tr></thead>
    <tbody><tr>{{#prepared_by.values}}<td>{{.}}&nbsp;</td>{{/prepared_by.values}}</tr></tbody>
  </table></div>
  {{/prepared_by.show}}

  {{#footer.show}}
  <div class="q-abs q-footer">
    {{#footer.website}}<div class="q-footer-item"><span class="q-ic q-ic-globe_footer"></span>{{footer.website}}</div><div class="q-footer-sep"></div>{{/footer.website}}
    {{#footer.email}}<div class="q-footer-item"><span class="q-ic q-ic-mail"></span>{{footer.email}}</div><div class="q-footer-sep"></div>{{/footer.email}}
    {{#footer.phones}}<div class="q-footer-item"><span class="q-ic q-ic-phone"></span>{{footer.phones}}</div>{{/footer.phones}}
  </div>
  {{/footer.show}}

  <div class="q-abs q-bottom"></div>
  <div class="q-abs q-bottom-gap" style="left: 34%"></div>
  <div class="q-abs q-bottom-gap" style="left: 38%"></div>
  <div class="q-abs q-bottom-gap" style="left: 78%"></div>
</div>
</div>`;
