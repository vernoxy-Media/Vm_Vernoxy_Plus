/**
 * The editable layout of a document template, stored as JSON in document_templates.layout_json.
 *
 * Pure TypeScript (no framework, no database), so any backend can read the same JSON:
 *   - a layout is a list of sections; each section has a title, an on/off switch, a list of fields and
 *     a few options (switches and texts);
 *   - which sections, fields and options exist is fixed per document kind by its catalog: the Admin
 *     can show, hide, rename and reorder them, but cannot invent data the system does not have.
 *
 * normalizeLayout() is the only way a layout from outside (the editor, the database) becomes trusted:
 * unknown keys are dropped, missing ones come back with their defaults, and texts are trimmed and capped.
 */

export const LAYOUT_SCHEMA_VERSION = 1;

export const MAX_TITLE_LENGTH = 60;
export const MAX_LABEL_LENGTH = 60;
export const MAX_TEXT_LENGTH = 300;

export interface LayoutField {
  key: string;
  label: string;
  visible: boolean;
}

export type LayoutOptionValue = boolean | string;

export interface LayoutSection {
  key: string;
  title: string;
  visible: boolean;
  fields: LayoutField[];
  options: Record<string, LayoutOptionValue>;
}

export interface DocumentLayout {
  schema_version: typeof LAYOUT_SCHEMA_VERSION;
  /** Heading printed on the document, e.g. "SALARY SLIP". */
  title: string;
  /** Uploaded letterhead image (document_template_assets), drawn behind every page. */
  letterhead_asset_id: number | null;
  /** Uploaded signature image (document_template_assets), printed in the signature block. */
  signature_asset_id: number | null;
  /** Images of the kind's own image slots (catalog.images), by slot key, e.g. { logo: 12, cover_photo: 14 }. */
  images: Record<string, number | null>;
  sections: LayoutSection[];
}

/** How an uploaded image is prepared before it is stored. */
export type TemplateImageKind = 'letterhead' | 'signature' | 'logo' | 'photo';

/** Images that ship with the code and are used until the Admin uploads their own. */
export type BundledImageName = 'company-letterhead' | 'company-logo' | 'quotation-cover-photo';

/** An image a document kind places itself (a logo, a cover photo), replaceable by the Admin. */
export interface CatalogImage {
  key: string;
  label: string;
  kind: TemplateImageKind;
  /** Used by a new template until the Admin uploads another image. */
  bundled?: BundledImageName;
  /** Shown under the upload button. */
  hint?: string;
}

/** One option of a section in the catalog: a switch, a short text, a closed list, or a colour. */
export interface CatalogOption {
  key: string;
  label: string;
  type: 'boolean' | 'text' | 'choice' | 'color';
  default: LayoutOptionValue;
  /** Text: offered values (any other text is allowed). Choice: the allowed values. Colour: hex swatches. */
  suggestions?: string[];
  /** Consecutive options with the same group print as one block in the editor (e.g. one service tile). */
  group?: string;
}

export interface CatalogField {
  key: string;
  label: string;
  /** Shown when the Admin has not chosen yet. */
  visible: boolean;
  /**
   * Always shown (it can still be renamed and moved). Used for amounts that make up a total: hiding one
   * would make the printed rows stop adding up to the printed total.
   */
  required?: boolean;
  /** False when the label is never printed (e.g. rows that print each category's own name). */
  label_editable?: boolean;
}

export interface CatalogSection {
  key: string;
  title: string;
  /** False when the section has no heading of its own (the header block, the footer). */
  has_title: boolean;
  /** False for sections that must always print (e.g. the header with month and slip number). */
  can_hide: boolean;
  fields: CatalogField[];
  options: CatalogOption[];
}

/** Everything a document kind offers. Sections print in this order (the page is a fixed grid). */
export interface LayoutCatalog {
  kind: string;
  default_title: string;
  sections: CatalogSection[];
  /** Replaceable images this kind places itself (none for the Salary Slip, which uses its letterhead). */
  images?: CatalogImage[];
  /** Printed on the company letterhead (a new template starts with it). False for full-page designs. */
  uses_letterhead?: boolean;
}

const text = (value: unknown, max: number, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const t = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return t || fallback;
};

const positiveIntOrNull = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** The layout a new template starts from: every section and field with the catalog's defaults. */
export function defaultLayout(catalog: LayoutCatalog): DocumentLayout {
  return {
    schema_version: LAYOUT_SCHEMA_VERSION,
    title: catalog.default_title,
    letterhead_asset_id: null,
    signature_asset_id: null,
    images: Object.fromEntries((catalog.images ?? []).map((i) => [i.key, null])),
    sections: catalog.sections.map((s) => ({
      key: s.key,
      title: s.title,
      visible: true,
      fields: s.fields.map((f) => ({ key: f.key, label: f.label, visible: f.required ? true : f.visible })),
      options: Object.fromEntries(s.options.map((o) => [o.key, o.default])),
    })),
  };
}

/**
 * Turn any input into a valid layout for this catalog.
 * Sections keep the catalog order; fields keep the input order (unknown ones dropped, missing ones
 * appended with their defaults); empty labels fall back to the catalog label.
 */
export function normalizeLayout(catalog: LayoutCatalog, input: unknown): DocumentLayout {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const rawSections: any[] = Array.isArray(raw.sections) ? raw.sections : [];
  const bySectionKey = new Map<string, any>();
  for (const s of rawSections) if (s && typeof s.key === 'string' && !bySectionKey.has(s.key)) bySectionKey.set(s.key, s);

  const sections = catalog.sections.map((cs): LayoutSection => {
    const given = bySectionKey.get(cs.key) ?? {};
    const givenFields: any[] = Array.isArray(given.fields) ? given.fields : [];
    const catalogFields = new Map(cs.fields.map((f) => [f.key, f]));
    const seen = new Set<string>();
    const fields: LayoutField[] = [];
    for (const f of givenFields) {
      const def = f && typeof f.key === 'string' ? catalogFields.get(f.key) : undefined;
      if (!def || seen.has(def.key)) continue;
      seen.add(def.key);
      fields.push({
        key: def.key,
        label: def.label_editable === false ? def.label : text(f.label, MAX_LABEL_LENGTH, def.label),
        visible: def.required ? true : typeof f.visible === 'boolean' ? f.visible : def.visible,
      });
    }
    for (const def of cs.fields) if (!seen.has(def.key)) fields.push({ key: def.key, label: def.label, visible: def.required ? true : def.visible });

    const givenOptions = given.options && typeof given.options === 'object' ? given.options : {};
    const options: Record<string, LayoutOptionValue> = {};
    for (const o of cs.options) {
      options[o.key] = optionValue(o, givenOptions[o.key]);
    }

    return {
      key: cs.key,
      title: cs.has_title ? text(given.title, MAX_TITLE_LENGTH, cs.title) : cs.title,
      visible: cs.can_hide ? (typeof given.visible === 'boolean' ? given.visible : true) : true,
      fields,
      options,
    };
  });

  return {
    schema_version: LAYOUT_SCHEMA_VERSION,
    title: text(raw.title, MAX_TITLE_LENGTH, catalog.default_title),
    letterhead_asset_id: positiveIntOrNull(raw.letterhead_asset_id),
    signature_asset_id: positiveIntOrNull(raw.signature_asset_id),
    images: Object.fromEntries(
      (catalog.images ?? []).map((i) => [i.key, positiveIntOrNull(raw.images && typeof raw.images === 'object' ? raw.images[i.key] : null)]),
    ),
    sections,
  };
}

/** Lookup helpers used by the view builders. */
export function sectionOf(layout: DocumentLayout, key: string): LayoutSection | undefined {
  return layout.sections.find((s) => s.key === key);
}

export function visibleFields(section: LayoutSection | undefined): LayoutField[] {
  return section && section.visible ? section.fields.filter((f) => f.visible) : [];
}

export function boolOption(section: LayoutSection | undefined, key: string): boolean {
  return Boolean(section?.options[key]);
}

export function textOption(section: LayoutSection | undefined, key: string): string {
  const v = section?.options[key];
  return typeof v === 'string' ? v : '';
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Six-digit lowercase hex, or the fallback when the value is not a colour. */
export function parseHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !HEX_COLOR.test(value.trim())) return fallback;
  const t = value.trim();
  if (t.length === 4) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return t.toLowerCase();
}

function optionValue(o: CatalogOption, v: unknown): LayoutOptionValue {
  if (o.type === 'boolean') return typeof v === 'boolean' ? v : o.default;
  if (o.type === 'choice') {
    if (typeof v !== 'string' || !o.suggestions?.length) return o.default;
    const t = v.trim().toLowerCase();
    return o.suggestions.includes(t) ? t : o.default;
  }
  if (o.type === 'color') return parseHexColor(v, typeof o.default === 'string' ? o.default : '#1d4ed8');
  return typeof v === 'string' ? v.trim().slice(0, MAX_TEXT_LENGTH) : o.default;
}
