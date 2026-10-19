import {
  TaskEntity,
  TaskHistoryEntity,
  TaskPriority,
  TaskStage,
} from '../entities/task.entity';

export interface TaskBoardCard {
  task_id: number;
  task_code: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  task_type_id: number | null;
  task_type_label: string | null;
  due_date: string | null;
  allocated_minutes: number | null;
  stage: TaskStage;
  is_overdue: boolean;
  requested_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  assignees: {
    employee_id: number;
    name: string;
    email: string;
    avatar_url: string | null;
  }[];
}

export interface TaskBoardResult {
  columns: {
    assigned: TaskBoardCard[];
    in_progress: TaskBoardCard[];
    requested: TaskBoardCard[];
    completed: TaskBoardCard[];
  };
  counts: {
    assigned: number;
    in_progress: number;
    requested: number;
    completed: number;
    total: number;
  };
}

export interface TaskSummaryResult {
  total: number;
  assigned: number;
  in_progress: number;
  requested: number;
  overdue: number;
  completed_today: number;
  completed_this_month: number;
}

export interface TaskBoardFilters {
  search?: string;
  priority?: TaskPriority;
  task_type_id?: number;
  assignee_id?: number;
  overdue_only?: boolean;
}

export interface CreateTaskRepoInput {
  task_code: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  task_type_id?: number | null;
  due_date?: string | null;
  allocated_minutes?: number | null;
  assignee_ids: number[];
  created_by: number;
}

export interface UpdateTaskRepoInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  task_type_id?: number | null;
  due_date?: string | null;
  allocated_minutes?: number | null;
  assignee_ids?: number[];
  updated_by: number;
}

export interface MoveStageRepoInput {
  target_stage: TaskStage;
  actor_emp_id: number;
  note?: string | null;
}

export interface TaskRepositoryPort {
  getNextTaskCode(year: number): Promise<string>;
  createTask(input: CreateTaskRepoInput): Promise<TaskEntity>;
  findById(taskId: number): Promise<TaskEntity | null>;
  findByCode(taskCode: string): Promise<TaskEntity | null>;
  updateTask(taskId: number, input: UpdateTaskRepoInput): Promise<TaskEntity>;
  moveStage(taskId: number, input: MoveStageRepoInput): Promise<TaskEntity>;
  getBoard(filters?: TaskBoardFilters): Promise<TaskBoardResult>;
  getMyBoard(empId: number, filters?: TaskBoardFilters): Promise<TaskBoardResult>;
  getSummary(): Promise<TaskSummaryResult>;
  getMySummary(empId: number): Promise<TaskSummaryResult>;
  getHistory(taskId: number): Promise<TaskHistoryEntity[]>;
  getPendingReviewCount(): Promise<number>;
}
