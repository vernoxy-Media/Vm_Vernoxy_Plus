import {
  TaskEntity,
  TaskHistoryEntity,
  TaskPriority,
  TaskSource,
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
  source: TaskSource;
  hold_reason: string | null;
  has_sub_tasks: boolean;
  sub_tasks_count: number;
  lead_employee_id: number | null;
  lead_employee_name: string | null;
  other_task_type: string | null;
  parent_task_id: number | null;
  parent_task_code?: string | null;
  parent_task_title?: string | null;
  is_overdue: boolean;
  started_at?: Date | null;
  actual_minutes?: number;
  is_timer_running?: boolean;
  timer_started_at?: Date | null;
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
    hold: TaskBoardCard[];
    requested: TaskBoardCard[];
    completed: TaskBoardCard[];
  };
  counts: {
    assigned: number;
    in_progress: number;
    hold: number;
    requested: number;
    completed: number;
    total: number;
  };
}

export interface TaskSummaryResult {
  total: number;
  todo_or_in_progress: number;
  on_hold: number;
  submitted: number;
  approved: number;
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
  stage?: TaskStage;
  source?: TaskSource;
  overdue_only?: boolean;
}

export interface CreateSubTaskRepoInput {
  title: string;
  allocated_minutes?: number | null;
  assignee_ids: number[];
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
  source?: TaskSource;
  parent_task_id?: number | null;
  lead_employee_id?: number | null;
  has_sub_tasks?: boolean;
  other_task_type?: string | null;
  sub_tasks?: CreateSubTaskRepoInput[];
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
  lead_employee_id?: number | null;
  other_task_type?: string | null;
}

export interface MoveStageRepoInput {
  target_stage: TaskStage;
  actor_emp_id: number;
  note?: string | null;
  hold_reason?: string | null;
  self_approved?: boolean;
}

export interface TrackWorkSessionRepoInput {
  action: 'start' | 'pause' | 'finish';
  actor_emp_id: number;
  actor_name: string;
  note?: string | null;
}

export interface TaskRepositoryPort {
  getNextTaskCode(year: number): Promise<string>;
  createTask(input: CreateTaskRepoInput): Promise<TaskEntity>;
  findById(taskId: number): Promise<TaskEntity | null>;
  findByCode(taskCode: string): Promise<TaskEntity | null>;
  updateTask(taskId: number, input: UpdateTaskRepoInput): Promise<TaskEntity>;
  moveStage(taskId: number, input: MoveStageRepoInput): Promise<TaskEntity>;
  trackWorkSession(taskId: number, input: TrackWorkSessionRepoInput): Promise<TaskEntity>;
  getBoard(filters?: TaskBoardFilters): Promise<TaskBoardResult>;
  getMyBoard(empId: number, filters?: TaskBoardFilters): Promise<TaskBoardResult>;
  getSummary(): Promise<TaskSummaryResult>;
  getMySummary(empId: number): Promise<TaskSummaryResult>;
  getPendingReviewCount(): Promise<number>;
  getHistory(taskId: number): Promise<TaskHistoryEntity[]>;
  getSubTasks(parentTaskId: number): Promise<TaskEntity[]>;
}
