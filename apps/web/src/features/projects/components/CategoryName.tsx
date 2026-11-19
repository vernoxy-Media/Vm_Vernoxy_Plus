import React from 'react';
import { useProjectCategories } from '../hooks/use-project-categories';

/** The name of a project's category (its Service Fit in Master Data). */
export const CategoryName: React.FC<{ code?: string | null; other?: string | null }> = ({ code, other }) => {
  const { labelOf } = useProjectCategories();
  return <>{labelOf(code, other)}</>;
};
