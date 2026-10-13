import { CrmNormalizationService } from './crm-normalization.service';

export interface ClosestMatchItem {
  id: number;
  name: string;
  code?: string;
}

export class CompanyImportValidatorService {
  /**
   * Levenshtein distance for fuzzy matching error hints.
   */
  static levenshtein(a: string, b: string): number {
    const s1 = a.toLowerCase();
    const s2 = b.toLowerCase();
    const costs: number[] = [];

    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  /**
   * Returns up to 3 closest valid names from the active master data list as a hint.
   */
  static getClosestHints(input: string, items: ClosestMatchItem[]): string {
    if (!input || items.length === 0) return '';
    const scored = items.map((item) => {
      const dist = this.levenshtein(input, item.name);
      return { name: item.name, dist };
    });
    scored.sort((a, b) => a.dist - b.dist);
    const top3 = scored.slice(0, 3).filter((s) => s.dist <= 10);
    if (top3.length === 0) return '';
    return `Did you mean: ${top3.map((t) => `'${t.name}'`).join(', ')}?`;
  }

  /**
   * Status accepts active/inactive/yes/no/true/false/1/0 (blank = active)
   */
  static parseStatus(statusVal?: string | null): { isActive: boolean; valid: boolean } {
    if (!statusVal || statusVal.trim() === '') {
      return { isActive: true, valid: true };
    }
    const clean = statusVal.trim().toLowerCase();
    if (['active', 'yes', 'true', '1'].includes(clean)) {
      return { isActive: true, valid: true };
    }
    if (['inactive', 'no', 'false', '0'].includes(clean)) {
      return { isActive: false, valid: true };
    }
    return { isActive: true, valid: false };
  }

  /**
   * Normalizes channel value using exact CreateCompany domain rules.
   */
  static normalizeChannel(type: string, value: string): { normalized: string; error?: string } {
    try {
      const norm = CrmNormalizationService.normalizeChannelValue(type, value);
      return { normalized: norm };
    } catch (err: any) {
      return { normalized: value, error: err.message || 'INVALID_FORMAT' };
    }
  }

  /**
   * Normalized channel value for duplicate comparison:
   * - email: lowercased
   * - phone/whatsapp: digits only
   * - website/social: host without 'www.' and scheme
   */
  static getChannelDuplicateKey(type: string, value: string): string {
    const raw = (value || '').trim().toLowerCase();
    if (type === 'email') {
      return raw;
    }
    if (type === 'phone' || type === 'whatsapp') {
      return raw.replace(/\D/g, '');
    }
    if (type === 'website') {
      try {
        const urlStr = raw.startsWith('http') ? raw : `https://${raw}`;
        const parsed = new URL(urlStr);
        let host = parsed.hostname.toLowerCase();
        if (host.startsWith('www.')) host = host.slice(4);
        return host;
      } catch {
        return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      }
    }
    return raw;
  }

  /**
   * Topological sort of companies so parents appear before children.
   * Detects cycles and returns cycle errors.
   */
  static orderCompaniesByParentHierarchy<T extends { company_ref?: string; parent_company_ref?: string }>(
    companies: T[],
  ): { ordered: T[]; cyclicRefs: Set<string> } {
    const byRef = new Map<string, T>();
    companies.forEach((c) => {
      if (c.company_ref) {
        byRef.set(c.company_ref.toLowerCase(), c);
      }
    });

    const inDegree = new Map<string, number>();
    const childrenOf = new Map<string, string[]>();

    companies.forEach((c) => {
      const ref = c.company_ref ? c.company_ref.toLowerCase() : '';
      if (ref) {
        inDegree.set(ref, 0);
        childrenOf.set(ref, []);
      }
    });

    companies.forEach((c) => {
      const childRef = c.company_ref ? c.company_ref.toLowerCase() : '';
      const parentRef = c.parent_company_ref ? c.parent_company_ref.toLowerCase() : '';

      if (childRef && parentRef && byRef.has(parentRef)) {
        if (childRef !== parentRef) {
          childrenOf.get(parentRef)?.push(childRef);
          inDegree.set(childRef, (inDegree.get(childRef) || 0) + 1);
        }
      }
    });

    const queue: string[] = [];
    inDegree.forEach((deg, ref) => {
      if (deg === 0) queue.push(ref);
    });

    const sortedRefs: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sortedRefs.push(current);

      const children = childrenOf.get(current) || [];
      for (const child of children) {
        const remaining = (inDegree.get(child) || 1) - 1;
        inDegree.set(child, remaining);
        if (remaining === 0) {
          queue.push(child);
        }
      }
    }

    const cyclicRefs = new Set<string>();
    inDegree.forEach((deg, ref) => {
      if (deg > 0) cyclicRefs.add(ref);
    });

    const ordered: T[] = [];
    const addedRefs = new Set<string>();

    for (const ref of sortedRefs) {
      const item = byRef.get(ref);
      if (item) {
        ordered.push(item);
        addedRefs.add(ref);
      }
    }

    // Append any companies without ref or that weren't in sorted
    for (const c of companies) {
      const ref = c.company_ref ? c.company_ref.toLowerCase() : '';
      if (!ref || !addedRefs.has(ref)) {
        ordered.push(c);
      }
    }

    return { ordered, cyclicRefs };
  }
}
