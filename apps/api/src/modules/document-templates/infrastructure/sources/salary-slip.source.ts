/**
 * Salary Slip template source: plain HTML + CSS with Mustache placeholders, no logic (the view
 * builder in domain/kinds/salary-slip decides every value). One A4 page on the company letterhead:
 * the letterhead is the page background and the slip sits in its empty middle area.
 *
 * Layout: title with month / date / slip number; Employee Summary beside a Net Pay card (net amount
 * with Paid Days and LOP Days); Earnings and Deductions side by side in one table; the Total Net
 * Payable bar with the amount in words; the signature (image, name, designation, caption); a
 * closing note. Typeface: DM Sans, matching the letterhead.
 *
 * A self-contained fragment (its own <style>, classes prefixed "vx-") so it can be shown in the app,
 * printed, and emailed without clashing with other styles.
 */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
@page { size: A4; margin: 0; }
.vx-slip, .vx-slip * { box-sizing: border-box; }
/* Keep the light fills (net pay card, totals) when printing, whatever the browser's print setting. */
.vx-slip { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 11.5px; line-height: 1.4; }
.vx-slip table { border-collapse: collapse; width: 100%; }
.vx-slip th, .vx-slip td { padding: 0; text-align: left; vertical-align: top; font-weight: 400; }
.vx-slip .vx-sheet { position: relative; width: 210mm; height: 297mm; margin: 0 auto; background: #fff; overflow: hidden; }
.vx-slip .vx-letterhead { position: absolute; inset: 0; width: 210mm; height: 297mm; z-index: 0; }
.vx-slip .vx-content { position: absolute; z-index: 2; top: 38mm; left: 15mm; right: 15mm; bottom: 28mm; }
.vx-slip .vx-content.vx-plain { top: 15mm; bottom: 15mm; }
.vx-slip .vx-r { text-align: right !important; white-space: nowrap; }

/* Title row */
.vx-slip .vx-top td { vertical-align: middle; }
.vx-slip .vx-title { font-size: 24px; font-weight: 700; color: #0b3a73; letter-spacing: 0.5px; }
.vx-slip .vx-meta-cell { width: 44%; }
.vx-slip .vx-meta th { font-weight: 600; padding: 2px 8px 2px 0; white-space: nowrap; width: 1%; color: #374151; }
.vx-slip .vx-meta td { padding: 2px 0; }
.vx-slip .vx-colon { width: 16px; text-align: center; color: #6b7280; }
.vx-slip .vx-rule { border: 0; border-top: 1px solid #d1d5db; margin: 5mm 0; }

/* Employee Summary + Net Pay card */
.vx-slip .vx-summary > tbody > tr > td { vertical-align: top; }
.vx-slip .vx-summary-left { padding-right: 6mm; }
.vx-slip .vx-summary-right { width: 40%; }
.vx-slip .vx-caption { font-size: 11px; font-weight: 600; color: #374151; letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 6px; }
.vx-slip .vx-kv td { padding: 5px 0; }
.vx-slip .vx-kv .vx-k { color: #6b7280; width: 38%; }
.vx-slip .vx-kv .vx-v { font-weight: 500; }
.vx-slip .vx-card { border: 1px solid #d1d5db; border-radius: 10px; overflow: hidden; background: #fff; }
.vx-slip .vx-card-top { background: #ecfdf3; padding: 12px 14px 12px 14px; }
.vx-slip .vx-card-amount { border-left: 3px solid #22c55e; padding-left: 10px; }
.vx-slip .vx-card-amount .vx-big { font-size: 24px; font-weight: 500; line-height: 1.2; }
.vx-slip .vx-card-amount .vx-sub { color: #4b5563; font-size: 11px; margin-top: 2px; }
.vx-slip .vx-card-rows { border-top: 1px dashed #c7cdd4; margin: 0 14px; padding: 8px 0 10px; }
.vx-slip .vx-card-rows td { padding: 4px 0; }
.vx-slip .vx-card-rows .vx-k { color: #4b5563; width: 55%; }
.vx-slip .vx-card-rows .vx-v { font-weight: 500; }

/* Earnings | Deductions */
.vx-slip .vx-money { margin-top: 7mm; border: 1px solid #d1d5db; border-radius: 10px; overflow: hidden; }
.vx-slip .vx-money th { font-size: 11px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; padding: 10px 12px 8px; }
.vx-slip .vx-money thead tr { border-bottom: 1px dashed #c7cdd4; }
.vx-slip .vx-money td { padding: 9px 12px; }
.vx-slip .vx-money td.vx-amt { font-weight: 600; }
.vx-slip .vx-money td.vx-gap { border-left: 0; padding-left: 18px; }
.vx-slip .vx-money tfoot td { background: #f7f7f9; font-weight: 600; }

/* Total Net Payable */
.vx-slip .vx-net { margin-top: 7mm; border: 1px solid #d1d5db; border-radius: 10px; overflow: hidden; }
.vx-slip .vx-net td { vertical-align: middle; }
.vx-slip .vx-net .vx-net-text { padding: 10px 14px; }
.vx-slip .vx-net .vx-net-title { font-weight: 700; font-size: 11.5px; letter-spacing: 0.3px; text-transform: uppercase; }
.vx-slip .vx-net .vx-net-sub { color: #6b7280; font-size: 10.5px; }
.vx-slip .vx-net .vx-net-amount { width: 30%; background: #ecfdf3; text-align: center; font-weight: 700; font-size: 15px; padding: 10px 14px; }
.vx-slip .vx-words { margin-top: 5mm; text-align: right; }
.vx-slip .vx-words .vx-k { color: #6b7280; }
.vx-slip .vx-words .vx-v { font-weight: 500; }

/* Signature (bottom right) */
.vx-slip .vx-sign { margin-top: 6mm; display: flex; justify-content: flex-end; }
.vx-slip .vx-sign-box { width: 60mm; text-align: center; }
.vx-slip .vx-sign-img { display: block; margin: 0 auto; max-width: 45mm; max-height: 18mm; object-fit: contain; }
.vx-slip .vx-sign-space { height: 14mm; }
.vx-slip .vx-sign-line { border-top: 1px solid #9ca3af; margin: 2px 6mm 4px; }
.vx-slip .vx-sign-name { font-weight: 600; }
.vx-slip .vx-sign-role { color: #4b5563; font-size: 10.5px; }
.vx-slip .vx-sign-caption { color: #6b7280; font-size: 10.5px; margin-bottom: 2px; }

/* Closing */
.vx-slip .vx-note { margin-top: 2mm; text-align: center; color: #6b7280; font-size: 10px; }
.vx-slip .vx-thanks { margin-top: 2mm; text-align: center; color: #1d6fb8; font-weight: 600; font-size: 12px; }

/* Many amount rows: tighter spacing so the slip stays inside the letterhead's middle area. */
.vx-slip .vx-compact .vx-money td { padding-top: 6px; padding-bottom: 6px; }
.vx-slip .vx-compact .vx-kv td { padding: 3px 0; }
.vx-slip .vx-compact .vx-money, .vx-slip .vx-compact .vx-net { margin-top: 5mm; }
.vx-slip .vx-compact .vx-sign { margin-top: 3mm; }

@media print {
  html, body { margin: 0 !important; padding: 0 !important; }
  .vx-slip .vx-sheet { margin: 0; }
}
`;

export const SALARY_SLIP_SOURCE = `<div class="vx-slip">
<style>${STYLES}</style>
<div class="vx-sheet">
  {{#has_letterhead}}<img class="vx-letterhead" src="{{letterhead_url}}" alt="">{{/has_letterhead}}
  <div class="vx-content{{^has_letterhead}} vx-plain{{/has_letterhead}}{{#compact}} vx-compact{{/compact}}">

    <table class="vx-top"><tr>
      <td><div class="vx-title">{{title}}</div></td>
      <td class="vx-meta-cell"><table class="vx-meta">
        {{#header.rows}}<tr><th>{{label}}</th><td class="vx-colon">:</td><td>{{value}}</td></tr>{{/header.rows}}
      </table></td>
    </tr></table>
    <hr class="vx-rule">

    <table class="vx-summary"><tbody><tr>
      <td class="vx-summary-left">
        <div class="vx-caption">{{employee.title}}</div>
        <table class="vx-kv">
          {{#employee.rows}}<tr><td class="vx-k">{{label}}</td><td class="vx-colon">:</td><td class="vx-v">{{value}}</td></tr>{{/employee.rows}}
        </table>
      </td>
      <td class="vx-summary-right">
        <div class="vx-card">
          <div class="vx-card-top"><div class="vx-card-amount">
            <div class="vx-big">{{net_pay_card.amount}}</div>
            <div class="vx-sub">{{net_pay_card.title}}</div>
          </div></div>
          {{#net_pay_card.rows.length}}
          <div class="vx-card-rows"><table>
            {{#net_pay_card.rows}}<tr><td class="vx-k">{{label}}</td><td class="vx-colon">:</td><td class="vx-v">{{value}}</td></tr>{{/net_pay_card.rows}}
          </table></div>
          {{/net_pay_card.rows.length}}
        </div>
      </td>
    </tr></tbody></table>

    <div class="vx-money"><table>
      <thead><tr>
        <th>{{money.earnings_title}}</th><th class="vx-r">AMOUNT</th>
        <th class="vx-gap">{{money.deductions_title}}</th><th class="vx-r">AMOUNT</th>
      </tr></thead>
      <tbody>
        {{#money.pairs}}<tr>
          {{#earning}}<td>{{label}}</td><td class="vx-r vx-amt">{{amount}}</td>{{/earning}}
          {{#deduction}}<td class="vx-gap">{{label}}</td><td class="vx-r vx-amt">{{amount}}</td>{{/deduction}}
        </tr>{{/money.pairs}}
      </tbody>
      <tfoot><tr>
        <td>{{money.earnings_total.label}}</td><td class="vx-r">{{money.earnings_total.value}}</td>
        <td class="vx-gap">{{money.deductions_total.label}}</td><td class="vx-r">{{money.deductions_total.value}}</td>
      </tr></tfoot>
    </table></div>

    <div class="vx-net"><table><tr>
      <td class="vx-net-text">
        <div class="vx-net-title">{{net_payable.title}}</div>
        {{#net_payable.subtitle}}<div class="vx-net-sub">{{net_payable.subtitle}}</div>{{/net_payable.subtitle}}
      </td>
      <td class="vx-net-amount">{{net_payable.amount}}</td>
    </tr></table></div>

    {{#net_payable.show_words}}
    <div class="vx-words"><span class="vx-k">{{net_payable.words_label}} : </span><span class="vx-v">{{net_payable.words}}</span></div>
    {{/net_payable.show_words}}

    {{#signature.show}}
    <div class="vx-sign">
      <div class="vx-sign-box">
        {{#signature.caption}}<div class="vx-sign-caption">{{signature.caption}}</div>{{/signature.caption}}
        {{#signature.image_url}}<img class="vx-sign-img" src="{{signature.image_url}}" alt="Signature">{{/signature.image_url}}
        {{^signature.image_url}}<div class="vx-sign-space"></div>{{/signature.image_url}}
        <div class="vx-sign-line"></div>
        {{#signature.name}}<div class="vx-sign-name">{{signature.name}}</div>{{/signature.name}}
        {{#signature.designation}}<div class="vx-sign-role">{{signature.designation}}</div>{{/signature.designation}}
      </div>
    </div>
    {{/signature.show}}

    {{#footer.show}}
    <hr class="vx-rule">
    {{#footer.note}}<div class="vx-note">{{footer.note}}</div>{{/footer.note}}
    {{#footer.thanks}}<div class="vx-thanks">{{footer.thanks}}</div>{{/footer.thanks}}
    {{/footer.show}}
  </div>
</div>
</div>`;
