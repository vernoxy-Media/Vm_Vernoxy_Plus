import { useLookupsQuery } from '@/features/organization/hooks/use-master-data';
import { stageName } from '../utils/stage-labels';

/**
 * The names of a task's stage, priority and source. Master data (Settings > Tasks) wins; the built-in name only
 * fills in while master data has no row for that code, so a screen never shows a bare code.
 */
export function useTaskLabels() {
  const { data: stages = [] } = useLookupsQuery('task_stage');
  const { data: priorities = [] } = useLookupsQuery('task_priority');
  const { data: sources = [] } = useLookupsQuery('task_source');

  const find = (rows: { code: string; label: string }[], code?: string | null) =>
    code ? rows.find((r) => r.code === code)?.label : undefined;

  return {
    stageLabel: (code: string) => find(stages, code) ?? stageName(code),
    priorityLabel: (code: string | null | undefined, fallback: string) => find(priorities, code) ?? fallback,
    sourceLabel: (code?: string | null) => find(sources, code) ?? code ?? '-',
  };
}
