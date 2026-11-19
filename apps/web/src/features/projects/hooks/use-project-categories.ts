import { useMemo } from 'react';
import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { categoryLabel, categoryOptions, type CategoryOption } from '../components/dashboard/project-categories';

/** The project categories (Service Fits from Master Data), plus any category the given projects still carry. */
export function useProjectCategories(projects: Array<{ category?: string | null }> = []): { options: CategoryOption[]; labelOf: (code: string | null | undefined, other?: string | null) => string } {
  const { data: lookups } = useLookupsQuery('service_fit');
  return useMemo(() => {
    const options = categoryOptions(lookups ?? [], projects);
    return { options, labelOf: (code, other) => categoryLabel(code, options, other) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookups, projects.map((p) => p.category).join('|')]);
}
