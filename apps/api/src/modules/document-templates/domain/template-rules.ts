/**
 * Template versions and their review flow, as rules with no framework or database:
 *
 *   DRAFT ──approve──► APPROVED ──(a newer version is approved)──► RETIRED
 *
 * - A document kind has at most one DRAFT (the one being edited and tested).
 * - Only an APPROVED template makes real documents; test documents may use the draft.
 * - Approved versions never change: a later edit starts a new draft with the next version number.
 */

export type TemplateStatus = 'DRAFT' | 'APPROVED' | 'RETIRED';

/** The version a new draft gets: one more than any version of this kind so far. */
export function nextVersion(existingVersions: number[]): number {
  return existingVersions.reduce((max, v) => (Number.isInteger(v) && v > max ? v : max), 0) + 1;
}

/** Unique template code (document_templates.code is varchar(50) and unique), e.g. "payroll_salary_slip_v3". */
export function templateCode(kind: string, version: number): string {
  const suffix = `_v${version}`;
  return `${kind.slice(0, 50 - suffix.length)}${suffix}`;
}
