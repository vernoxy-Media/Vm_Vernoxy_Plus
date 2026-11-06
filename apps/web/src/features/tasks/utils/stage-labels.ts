import type { TaskStage } from '../types';

/**
 * The five stages of a task, named the way a Jira board names them. The stages themselves are fixed by the
 * task workflow, so every screen (board, list, filters, issue view) uses these names and they always agree.
 */
export const STAGE_NAME: Record<TaskStage, string> = {
  assigned: 'To Do',
  in_progress: 'In Progress',
  hold: 'On Hold',
  requested: 'In Review',
  completed: 'Done',
};

/** Status lozenge colours, as in Jira: small uppercase pills. */
export const STAGE_LOZENGE: Record<TaskStage, string> = {
  assigned: 'bg-[#DFE1E6] text-[#42526E]',
  in_progress: 'bg-[#DEEBFF] text-[#0747A6]',
  hold: 'bg-[#FFF0B3] text-[#172B4D]',
  requested: 'bg-[#EAE6FF] text-[#403294]',
  completed: 'bg-[#E3FCEF] text-[#006644]',
};

export const stageName = (stage: string): string => STAGE_NAME[stage as TaskStage] ?? stage;
