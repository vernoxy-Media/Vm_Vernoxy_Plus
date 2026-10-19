import type {
  TaskBoardCardDtoStage,
  TaskBoardCardDtoPriority,
  TaskBoardResultDto,
  TaskBoardCardDto,
  TaskSummaryDto,
  TaskDetailDto,
  TasksControllerGetBoardParams,
} from '@vernoxy-pulse/api-client';

export type TaskStage = TaskBoardCardDtoStage;
export type TaskPriority = TaskBoardCardDtoPriority;
export type TaskBoardQueryDto = TasksControllerGetBoardParams;

export type {
  TaskBoardResultDto,
  TaskBoardCardDto,
  TaskSummaryDto,
  TaskDetailDto,
};
