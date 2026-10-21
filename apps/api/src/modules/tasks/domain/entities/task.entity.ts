export type TaskStage = 'assigned' | 'in_progress' | 'hold' | 'requested' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskSource = 'personal' | 'project' | 'quick';

export type TaskEventType =
  | 'created'
  | 'edited'
  | 'assignee_added'
  | 'assignee_removed'
  | 'stage_changed'
  | 'hold'
  | 'requested'
  | 'withdrawn'
  | 'approved'
  | 'rejected'
  | 'reopened';

export interface TaskAssigneeEntity {
  task_assignee_id: number;
  task_id: number;
  employee_id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface TaskWorkLogItem {
  log_id: string;
  employee_id: number;
  employee_name: string;
  action: 'start' | 'pause' | 'resume' | 'finish';
  timestamp: string;
  duration_seconds?: number;
  note?: string | null;
}

export interface TaskEntity {
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
  review_note: string | null;
  hold_reason: string | null;
  source: TaskSource;
  parent_task_id: number | null;
  parent_task_code?: string | null;
  parent_task_title?: string | null;
  lead_employee_id: number | null;
  lead_employee_name?: string | null;
  has_sub_tasks: boolean;
  other_task_type: string | null;
  sub_tasks_count?: number;
  sub_tasks?: TaskEntity[];
  started_at: Date | null;
  actual_minutes: number;
  is_timer_running: boolean;
  timer_started_at: Date | null;
  work_logs: TaskWorkLogItem[];
  requested_at: Date | null;
  completed_at: Date | null;
  completed_by: number | null;
  completed_by_name: string | null;
  self_approved: boolean;
  row_version: number;
  created_at: Date;
  created_by: number | null;
  created_by_name: string | null;
  assignees: TaskAssigneeEntity[];
}

export interface TaskHistoryEntity {
  history_id: string;
  task_id: number;
  event_type: TaskEventType;
  actor_id: number | null;
  actor_name: string | null;
  from_stage: TaskStage | null;
  to_stage: TaskStage | null;
  note: string | null;
  changes: Record<string, unknown> | null;
  created_at: Date;
}
