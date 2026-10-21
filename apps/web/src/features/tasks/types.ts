import type {
  TaskBoardCardDtoStage,
  TaskBoardCardDtoPriority,
  TaskBoardCardDtoSource,
  TaskBoardResultDto,
  TaskBoardCardDto,
  TaskSummaryDto,
  TaskDetailDto,
  TasksControllerGetBoardParams,
  CreateTaskDto,
  CreateSubTaskDto,
} from '@vernoxy-pulse/api-client';

export type TaskStage = TaskBoardCardDtoStage;
export type TaskPriority = TaskBoardCardDtoPriority;
export type TaskSource = TaskBoardCardDtoSource;
export type TaskBoardQueryDto = TasksControllerGetBoardParams;

export type {
  TaskBoardResultDto,
  TaskBoardCardDto,
  TaskSummaryDto,
  TaskDetailDto,
  CreateTaskDto,
  CreateSubTaskDto,
};

