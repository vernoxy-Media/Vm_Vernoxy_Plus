export { TasksModule } from './tasks.module';
export { TASK_TOKENS } from './domain/ports/tokens';
export type {
  TaskEntity,
  TaskStage,
  TaskPriority,
  TaskAssigneeEntity,
  TaskHistoryEntity,
} from './domain/entities/task.entity';
export type {
  TaskRepositoryPort,
  TaskBoardCard,
  TaskBoardResult,
  TaskSummaryResult,
  TaskBoardFilters,
} from './domain/ports/task.repository.port';
export {
  TaskDomainError,
  TaskNotFoundError,
  InvalidStageTransitionError,
  TaskCompletedLockedError,
  AssigneeValidationError,
  TaskPermissionDeniedError,
} from './domain/errors/task.errors';
export {
  validateAssigneeIds,
  canTransitionStage,
  isOverdue,
  formatAllocatedMinutes,
  parseDurationToMinutes,
} from './domain/services/task-rules';
