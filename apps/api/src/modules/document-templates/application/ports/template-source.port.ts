/**
 * The current template source of a document kind (the HTML/CSS skeleton the layout is poured into).
 * Saving a draft copies it into that version, so an approved version keeps the source it was approved
 * with even after the skeleton in the code changes.
 */
export interface TemplateSourcePort {
  sourceFor(kind: string): string | null;
}
