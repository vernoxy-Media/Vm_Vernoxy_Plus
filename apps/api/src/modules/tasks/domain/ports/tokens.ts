export const TASK_TOKENS = {
  TaskRepository: Symbol('TaskRepositoryPort'),
  EmployeeDirectory: Symbol('EmployeeDirectoryPort'),
  ApproverResolver: Symbol('ApproverResolverPort'),
  Clock: Symbol('TaskClockPort'),
} as const;
