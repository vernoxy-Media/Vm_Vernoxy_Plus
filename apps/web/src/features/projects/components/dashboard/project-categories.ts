/**
 * Project categories are the Service Fits of Master Data (Settings > Sales > Service Fits): one list for leads and projects.
 * These helpers turn that list into the choices, labels and chart colours the project screens use.
 */

export interface CategoryOption {
  key: string;
  label: string;
  color: string;
}

const PALETTE = ['#6366f1', '#8b5cf6', '#3b82f6', '#14b8a6', '#06b6d4', '#ec4899', '#f59e0b', '#22c55e', '#f97316', '#64748b'];

/** "ecom_website" -> "Ecom website": a readable name for a code whose Service Fit is no longer in the list. */
export const prettyCode = (code: string): string => {
  const text = (code || '').replace(/_/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'General';
};

/**
 * The categories to show: every active Service Fit, then any category a project still has that is no longer in the
 * list (renamed away or switched off), so no project drops out of a chart or a filter.
 */
export function categoryOptions(lookups: Array<{ code: string; label: string }>, projects: Array<{ category?: string | null }> = []): CategoryOption[] {
  const seen = new Set<string>();
  const out: CategoryOption[] = [];
  const add = (key: string, label: string) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ key, label, color: PALETTE[out.length % PALETTE.length] });
  };
  lookups.forEach((l) => add(l.code, l.label));
  projects.forEach((p) => p.category && add(p.category, prettyCode(p.category)));
  return out;
}

/** The name to show for a project's category; a project of the "other" category shows what was typed for it. */
export function categoryLabel(code: string | null | undefined, options: CategoryOption[], other?: string | null): string {
  const hit = options.find((o) => o.key === code);
  if (code === 'other' && other?.trim()) return other.trim();
  return hit?.label ?? (code ? prettyCode(code) : 'General');
}
