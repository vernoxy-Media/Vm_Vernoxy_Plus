export class TaskDomainError extends Error {
  constructor(message: string, public readonly code: string = 'TASK_ERROR') {
    super(message);
    this.name = 'TaskDomainError';
  }
}

export class TaskNotFoundError extends TaskDomainError {
  constructor(idOrCode: number | string) {
    super(`Task ${idOrCode} not found`, 'TASK_NOT_FOUND');
    this.name = 'TaskNotFoundError';
  }
}

export class InvalidStageTransitionError extends TaskDomainError {
  constructor(message: string) {
    super(message, 'INVALID_STAGE_TRANSITION');
    this.name = 'InvalidStageTransitionError';
  }
}

export class TaskCompletedLockedError extends TaskDomainError {
  constructor(taskId: number) {
    super(`Task #${taskId} is completed and locked for edits`, 'TASK_COMPLETED_LOCKED');
    this.name = 'TaskCompletedLockedError';
  }
}

export class AssigneeValidationError extends TaskDomainError {
  constructor(message: string) {
    super(message, 'ASSIGNEE_VALIDATION_ERROR');
    this.name = 'AssigneeValidationError';
  }
}

export class TaskPermissionDeniedError extends TaskDomainError {
  constructor(message: string = 'Permission denied for task operation') {
    super(message, 'TASK_PERMISSION_DENIED');
    this.name = 'TaskPermissionDeniedError';
  }
}
