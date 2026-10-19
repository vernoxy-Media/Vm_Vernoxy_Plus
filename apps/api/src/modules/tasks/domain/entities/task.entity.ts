export type TaskStage = 'assigned' | 'in_progress' | 'requested' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskEventType =
  | 'created'
  | 'edited'
  | 'assignee_added'
  | 'assignee_removed'
  | 'stage_changed'
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
