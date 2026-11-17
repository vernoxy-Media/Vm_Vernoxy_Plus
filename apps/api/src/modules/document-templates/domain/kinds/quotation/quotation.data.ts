/**
 * The details of one quotation, printed on its cover page. Today they are typed in (Template
 * Management test values); later the quotations module fills them from the lead / company, the
 * logged-in employee and its own offer numbering. Every value stays editable.
 */
export interface QuotationData {
  /** e.g. "ERP / CRM". */
  service_name: string;
  /** "Kind Attn-" person. */
  attention_name: string;
  client_company: string;
  location: string;
  /** Running number of the quotation, e.g. "012". */
  qt_number: string;
  /** "00", "01", ... */
  revision: string;
  /** "YYYY-MM-DD"; today when not given. */
  date: string;
  /** Typed offer number; empty = made from the other details (see buildOfferNumber). */
  offer_number: string;
  prepared_by: { name: string; date: string; email: string; contact: string };
}

const MAX = 150;

const str = (v: unknown, max = MAX) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Today in India, "YYYY-MM-DD". */
export const todayIST = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

const isoDate = (v: unknown, fallback: string) => {
  const s = str(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : fallback;
};

/** Any input (the test values form today, the quotations module later) -> clean QuotationData. */
export function quotationDataFrom(input: Record<string, unknown> | null | undefined, now = new Date()): QuotationData {
  const raw = input ?? {};
  const prep = (raw.prepared_by && typeof raw.prepared_by === 'object' ? raw.prepared_by : {}) as Record<string, unknown>;
  const today = todayIST(now);
  const date = isoDate(raw.date, today);
  return {
    service_name: str(raw.service_name),
    attention_name: str(raw.attention_name),
    client_company: str(raw.client_company),
    location: str(raw.location),
    qt_number: str(raw.qt_number, 20) || '001',
    revision: str(raw.revision, 10) || '00',
    date,
    offer_number: str(raw.offer_number, 200),
    prepared_by: {
      name: str(prep.name),
      date: isoDate(prep.date, date),
      email: str(prep.email),
      contact: str(prep.contact, 40),
    },
  };
}

/**
 * Offer number: "<prefix>/<client>/<service>/<MMYY>/QT-<number>/R<revision>",
 * e.g. "Vernoxy Media/Acme Industries/ERP-CRM/0926/QT-012/R00". Slashes inside a part become "-".
 */
export function buildOfferNumber(prefix: string, d: QuotationData): string {
  const part = (s: string) => s.replace(/\//g, '-').replace(/\s*-\s*/g, '-').trim();
  const [y, m] = d.date.split('-');
  const parts = [prefix, d.client_company, d.service_name].map(part).filter(Boolean);
  return [...parts, `${m}${y.slice(2)}`, `QT-${part(d.qt_number)}`, `R${part(d.revision)}`].join('/');
}

/** Placeholder details for a template that has no quotation yet (shaped like the design). */
export function sampleQuotationData(): QuotationData {
  return quotationDataFrom({
    service_name: 'ERP / CRM',
    attention_name: 'Mr. Rajesh Patel',
    client_company: 'Acme Industries Pvt. Ltd.',
    location: 'Ahmedabad, Gujarat',
    qt_number: '012',
    revision: '00',
    date: '2026-09-17',
    prepared_by: { name: 'Krishna', date: '2026-09-17', email: 'vernoxymedia@gmail.com', contact: '+91 90546 82018' },
  });
}
