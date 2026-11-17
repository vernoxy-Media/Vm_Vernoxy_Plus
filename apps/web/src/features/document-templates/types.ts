/**
 * Template Management types. They mirror the API contract (document-templates module, layout
 * schema_version 1); the web never renders documents itself, it edits the layout and shows the
 * HTML the API returns.
 */

export type TemplateKind = 'payroll_salary_slip' | 'sales_quotation';

export interface LayoutField {
  key: string;
  label: string;
  visible: boolean;
}

export interface LayoutSection {
  key: string;
  title: string;
  visible: boolean;
  fields: LayoutField[];
  options: Record<string, boolean | string>;
}

export interface DocumentLayout {
  schema_version: 1;
  title: string;
  letterhead_asset_id: number | null;
  signature_asset_id: number | null;
  /** Images of the kind's own image slots (catalog.images), by slot key. */
  images: Record<string, number | null>;
  sections: LayoutSection[];
}

export interface CatalogField {
  key: string;
  label: string;
  visible: boolean;
  required?: boolean;
  label_editable?: boolean;
}

export interface CatalogOption {
  key: string;
  label: string;
  type: 'boolean' | 'text' | 'choice' | 'color';
  default: boolean | string;
  suggestions?: string[];
  group?: string;
}

/** Images a template carries (uploaded in Settings); each kind is prepared differently by the API. */
export type TemplateImageKind = 'letterhead' | 'signature' | 'logo' | 'photo';

/** Quotation cover details typed in for test documents (later they come from the quotation itself). */
export interface QuotationTestValues {
  service_name: string;
  attention_name: string;
  client_company: string;
  location: string;
  qt_number: string;
  revision: string;
  date: string;
  /** Empty = made from client, service, month-year, number and revision. */
  offer_number: string;
  prepared_by: { name: string; date: string; email: string; contact: string };
}

export interface CatalogSection {
  key: string;
  title: string;
  has_title: boolean;
  can_hide: boolean;
  fields: CatalogField[];
  options: CatalogOption[];
}

export interface CatalogImage {
  key: string;
  label: string;
  kind: TemplateImageKind;
  hint?: string;
}

export interface LayoutCatalog {
  kind: string;
  default_title: string;
  sections: CatalogSection[];
  images?: CatalogImage[];
  uses_letterhead?: boolean;
}

export interface TemplateVersionInfo {
  template_id: number;
  version: number;
  status: 'DRAFT' | 'APPROVED' | 'RETIRED';
  updated_at: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
}

export interface TemplateEditorState {
  kind: TemplateKind;
  name: string;
  catalog: LayoutCatalog;
  layout: DocumentLayout;
  draft: TemplateVersionInfo | null;
  approved: TemplateVersionInfo | null;
  legacy_in_use: boolean;
}

/** Salary Slip test data: a real employee's payroll of a month. */
export interface SalarySlipSubject {
  year: number;
  month: number;
  emp_id: number;
}

export interface PreviewResult {
  html: string;
  sample_data: boolean;
}
