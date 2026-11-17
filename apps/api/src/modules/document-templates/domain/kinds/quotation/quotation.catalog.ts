import { LayoutCatalog } from '../../layout';

/** document_templates.document_type of the quotation cover page. */
export const QUOTATION_KIND = 'sales_quotation';

/** Icons a service tile can use (drawn by the template). */
export const QUOTATION_TILE_ICONS = ['code', 'layers', 'users', 'chart', 'cog', 'cloud', 'shield', 'mobile', 'cart', 'globe'];

/** Colours the editor offers for a tile icon (any other #hex is still allowed). */
export const QUOTATION_ICON_SWATCHES = ['#1d4ed8', '#38bdf8', '#16a34a', '#4338ca', '#ea580c', '#e11d48', '#334155'];

const tile = (n: number, title: string, icon: string, color: string) => [
  { key: `tile${n}_title`, label: 'Title (empty = no tile)', type: 'text' as const, default: title, group: `Tile ${n}` },
  { key: `tile${n}_icon`, label: 'Icon', type: 'choice' as const, default: icon, suggestions: QUOTATION_TILE_ICONS, group: `Tile ${n}` },
  { key: `tile${n}_color`, label: 'Colour', type: 'color' as const, default: color, suggestions: QUOTATION_ICON_SWATCHES, group: `Tile ${n}` },
];

/**
 * The quotation cover page. Everything printed is editable: the design texts here (by the Admin, in
 * the template), the quotation details in the data (per quotation). Images: the company logo and the
 * cover photo, both replaceable. Decorative shapes are drawn by the template itself.
 */
export const QUOTATION_CATALOG: LayoutCatalog = {
  kind: QUOTATION_KIND,
  default_title: 'QUOTATION',
  images: [
    { key: 'logo', label: 'Company logo', kind: 'logo', bundled: 'company-logo', hint: 'PNG with a transparent background works best.' },
    { key: 'cover_photo', label: 'Cover photo', kind: 'photo', bundled: 'quotation-cover-photo', hint: 'JPG or PNG. Zoom and drag to place the subject in the printed panel.' },
  ],
  sections: [
    {
      key: 'branding',
      title: 'Logo and tagline',
      has_title: false,
      can_hide: false,
      fields: [],
      options: [{ key: 'tagline', label: 'Tagline under the logo', type: 'text', default: 'IDEA • EXECUTION • RESULT' }],
    },
    {
      key: 'heading',
      title: 'Heading',
      has_title: false,
      can_hide: false,
      fields: [],
      options: [
        { key: 'line1', label: 'First line', type: 'text', default: 'BUDGETARY' },
        { key: 'for_label', label: 'Word before the service', type: 'text', default: 'FOR' },
      ],
    },
    {
      key: 'services',
      title: 'Service tiles',
      has_title: false,
      can_hide: true,
      fields: [],
      options: [
        ...tile(1, 'ERP / CRM Solutions', 'code', '#1d4ed8'),
        ...tile(2, 'Web & App Development', 'layers', '#1d4ed8'),
        ...tile(3, 'System Integration', 'users', '#38bdf8'),
        ...tile(4, 'Business Optimization', 'chart', '#16a34a'),
      ],
    },
    {
      key: 'attention',
      title: 'Client band',
      has_title: false,
      can_hide: false,
      fields: [],
      options: [
        { key: 'attn_label', label: 'Before the person', type: 'text', default: 'Kind Attn-' },
        { key: 'company_prefix', label: 'Before the company', type: 'text', default: 'M/s' },
      ],
    },
    {
      key: 'offer',
      title: 'Offer details',
      has_title: false,
      can_hide: false,
      fields: [
        { key: 'offer_number', label: 'OFFER NUMBER', visible: true, required: true },
        { key: 'date', label: 'DATE', visible: true },
        { key: 'revision', label: 'REVISION', visible: true },
      ],
      options: [{ key: 'offer_prefix', label: 'Offer number starts with', type: 'text', default: 'Vernoxy Media' }],
    },
    {
      key: 'prepared_by',
      title: 'Prepared By',
      has_title: true,
      can_hide: true,
      fields: [
        { key: 'name', label: 'Name', visible: true },
        { key: 'date', label: 'Date', visible: true },
        { key: 'email', label: 'Email Address', visible: true },
        { key: 'contact', label: 'Contact Number', visible: true },
      ],
      options: [],
    },
    {
      key: 'footer',
      title: 'Contact line',
      has_title: false,
      can_hide: true,
      fields: [],
      options: [
        { key: 'website', label: 'Website', type: 'text', default: 'www.vernoxy.com' },
        { key: 'email', label: 'Email', type: 'text', default: 'vernoxymedia@gmail.com' },
        { key: 'phones', label: 'Phone numbers', type: 'text', default: '+91 9624150967 | +91 9054682018' },
      ],
    },
  ],
};
