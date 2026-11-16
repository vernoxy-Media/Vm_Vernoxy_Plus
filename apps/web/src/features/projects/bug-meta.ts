import type React from 'react';
import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, Equal } from 'lucide-react';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';

export interface PriorityMeta {
  label: string;
  icon: React.ElementType;
  color: string;
}

/** Colours / icons for the codes that ship with the app. New codes added in Settings get one by their position. */
const KNOWN: Record<string, { icon: React.ElementType; color: string }> = {
  critical: { icon: ChevronsUp, color: 'text-[#CD1317]' },
  high: { icon: ChevronUp, color: 'text-[#E9494A]' },
  medium: { icon: Equal, color: 'text-[#E97F33]' },
  low: { icon: ChevronDown, color: 'text-[#2D8738]' },
};

const prettify = (code: string) =>
  code
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Bug priority and bug type come from Master Data (Settings > Projects > Bug Priorities / Bug Types).
 * Labels are read from there; the colour of a new priority follows where it sits in the list (first = most urgent).
 */
export function useBugMeta() {
  const { data: priorities = [] } = useLookupsQuery('bug_priority');
  const { data: types = [] } = useLookupsQuery('bug_type');

  const priority = (code?: string | null): PriorityMeta => {
    const c = String(code ?? '');
    const idx = priorities.findIndex((p) => p.code === c);
    const label = (idx >= 0 ? priorities[idx].label : null) ?? prettify(c || 'medium');
    const known = KNOWN[c];
    if (known) return { label, ...known };
    if (idx >= 0 && priorities.length > 1) {
      const ratio = idx / (priorities.length - 1);
      if (ratio <= 0.2) return { label, icon: ChevronsUp, color: KNOWN.critical.color };
      if (ratio <= 0.4) return { label, icon: ChevronUp, color: KNOWN.high.color };
      if (ratio < 0.8) return { label, icon: Equal, color: KNOWN.medium.color };
      if (ratio < 1) return { label, icon: ChevronDown, color: KNOWN.low.color };
      return { label, icon: ChevronsDown, color: KNOWN.low.color };
    }
    return { label, icon: Equal, color: KNOWN.medium.color };
  };

  const typeLabel = (code?: string | null): string => {
    const c = String(code ?? '');
    return types.find((t) => t.code === c)?.label ?? prettify(c);
  };

  return { priorities, types, priority, typeLabel };
}
