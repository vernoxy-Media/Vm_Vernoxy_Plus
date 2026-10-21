import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TaskPriority, TaskSource, TaskStage } from '../../domain/entities/task.entity';

export class TaskWorkLogItemDto {
  @ApiProperty({ type: String, example: 'log_12345' })
  log_id!: string;

  @ApiProperty({ type: Number, example: 1 })
  employee_id!: number;

  @ApiProperty({ type: String, example: 'Admin User' })
  employee_name!: string;

  @ApiProperty({ enum: ['start', 'pause', 'resume', 'finish'], example: 'start' })
  action!: 'start' | 'pause' | 'resume' | 'finish';

  @ApiProperty({ type: String, example: '2026-10-21T10:00:00.000Z' })
  timestamp!: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  duration_seconds?: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  note?: string | null;
}

export class TaskAssigneeSummaryDto {
  @ApiProperty({ type: Number, example: 5 })
  employee_id!: number;

  @ApiProperty({ type: String, example: 'John Doe' })
  name!: string;

  @ApiProperty({ type: String, example: 'john@vernoxy.com' })
  email!: string;

  @ApiPropertyOptional({ type: String, example: 'https://...', nullable: true })
  avatar_url!: string | null;
}

export class TaskBoardCardDto {
  @ApiProperty({ type: Number, example: 1 })
  task_id!: number;

  @ApiProperty({ type: String, example: 'TSK-2026-0001' })
  task_code!: string;

  @ApiProperty({ type: String, example: 'Implement Authentication' })
  title!: string;

  @ApiPropertyOptional({ type: String, example: 'Setup JWT and argon2', nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ['low', 'medium', 'high', 'critical'], example: 'high' })
  priority!: TaskPriority;

  @ApiPropertyOptional({ type: Number, example: 2, nullable: true })
  task_type_id!: number | null;

  @ApiPropertyOptional({ type: String, example: 'Development', nullable: true })
  task_type_label!: string | null;

  @ApiPropertyOptional({ type: String, example: '2026-10-25', nullable: true })
  due_date!: string | null;

  @ApiPropertyOptional({ type: Number, example: 180, nullable: true })
  allocated_minutes!: number | null;

  @ApiProperty({ enum: ['assigned', 'in_progress', 'hold', 'requested', 'completed'], example: 'assigned' })
  stage!: TaskStage;

  @ApiProperty({ enum: ['personal', 'project', 'quick'], example: 'personal' })
  source!: TaskSource;

  @ApiPropertyOptional({ type: String, example: 'Awaiting client approval', nullable: true })
  hold_reason!: string | null;

  @ApiProperty({ type: Boolean, example: false })
  has_sub_tasks!: boolean;

  @ApiProperty({ type: Number, example: 0 })
  sub_tasks_count!: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  lead_employee_id!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  lead_employee_name!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  other_task_type!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  parent_task_id!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  parent_task_code?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  parent_task_title?: string | null;

  @ApiProperty({ type: Boolean, example: false })
  is_overdue!: boolean;

  @ApiPropertyOptional({ type: Date, nullable: true })
  started_at?: Date | null;

  @ApiPropertyOptional({ type: Number, example: 0 })
  actual_minutes?: number;

  @ApiPropertyOptional({ type: Boolean, example: false })
  is_timer_running?: boolean;

  @ApiPropertyOptional({ type: Date, nullable: true })
  timer_started_at?: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  requested_at!: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  completed_at!: Date | null;

  @ApiProperty({ type: Date })
  created_at!: Date;

  @ApiProperty({ type: [TaskAssigneeSummaryDto] })
  assignees!: TaskAssigneeSummaryDto[];
}

export class TaskBoardColumnsDto {
  @ApiProperty({ type: () => [TaskBoardCardDto] })
  assigned!: TaskBoardCardDto[];

  @ApiProperty({ type: () => [TaskBoardCardDto] })
  in_progress!: TaskBoardCardDto[];

  @ApiProperty({ type: () => [TaskBoardCardDto] })
  hold!: TaskBoardCardDto[];

  @ApiProperty({ type: () => [TaskBoardCardDto] })
  requested!: TaskBoardCardDto[];

  @ApiProperty({ type: () => [TaskBoardCardDto] })
  completed!: TaskBoardCardDto[];
}

export class TaskBoardCountsDto {
  @ApiProperty({ type: Number, example: 4 })
  assigned!: number;

  @ApiProperty({ type: Number, example: 2 })
  in_progress!: number;

  @ApiProperty({ type: Number, example: 1 })
  hold!: number;

  @ApiProperty({ type: Number, example: 1 })
  requested!: number;

  @ApiProperty({ type: Number, example: 5 })
  completed!: number;

  @ApiProperty({ type: Number, example: 13 })
  total!: number;
}

export class TaskBoardResultDto {
  @ApiProperty({ type: () => TaskBoardColumnsDto })
  columns!: TaskBoardColumnsDto;

  @ApiProperty({ type: () => TaskBoardCountsDto })
  counts!: TaskBoardCountsDto;
}

export class TaskSummaryDto {
  @ApiProperty({ type: Number, example: 13 })
  total!: number;

  @ApiProperty({ type: Number, example: 6 })
  todo_or_in_progress!: number;

  @ApiProperty({ type: Number, example: 1 })
  on_hold!: number;

  @ApiProperty({ type: Number, example: 1 })
  submitted!: number;

  @ApiProperty({ type: Number, example: 5 })
  approved!: number;

  @ApiProperty({ type: Number, example: 4 })
  assigned!: number;

  @ApiProperty({ type: Number, example: 2 })
  in_progress!: number;

  @ApiProperty({ type: Number, example: 1 })
  requested!: number;

  @ApiProperty({ type: Number, example: 0 })
  overdue!: number;

  @ApiProperty({ type: Number, example: 1 })
  completed_today!: number;

  @ApiProperty({ type: Number, example: 5 })
  completed_this_month!: number;
}

export class TaskHistoryItemDto {
  @ApiProperty({ type: String, example: '1' })
  history_id!: string;

  @ApiProperty({ type: Number, example: 1 })
  task_id!: number;

  @ApiProperty({ type: String, example: 'stage_changed' })
  event_type!: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  actor_id!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  actor_name!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  from_stage!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  to_stage!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  note!: string | null;

  @ApiProperty({ type: Date })
  created_at!: Date;
}

export class TaskDetailDto {
  @ApiProperty({ type: Number, example: 1 })
  task_id!: number;

  @ApiProperty({ type: String, example: 'TSK-2026-0001' })
  task_code!: string;

  @ApiProperty({ type: String, example: 'Implement Authentication' })
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ['low', 'medium', 'high', 'critical'] })
  priority!: TaskPriority;

  @ApiPropertyOptional({ type: Number, nullable: true })
  task_type_id!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  task_type_label!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  due_date!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  allocated_minutes!: number | null;

  @ApiProperty({ enum: ['assigned', 'in_progress', 'hold', 'requested', 'completed'] })
  stage!: TaskStage;

  @ApiProperty({ enum: ['personal', 'project', 'quick'] })
  source!: TaskSource;

  @ApiPropertyOptional({ type: String, nullable: true })
  review_note!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  hold_reason!: string | null;

  @ApiProperty({ type: Boolean, example: false })
  has_sub_tasks!: boolean;

  @ApiPropertyOptional({ type: Number, nullable: true })
  lead_employee_id!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  lead_employee_name!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  other_task_type!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  parent_task_id!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  parent_task_code?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  parent_task_title?: string | null;

  @ApiProperty({ type: Number, example: 0 })
  sub_tasks_count!: number;

  @ApiPropertyOptional({ type: () => [TaskDetailDto], nullable: true })
  sub_tasks?: TaskDetailDto[];

  @ApiPropertyOptional({ type: Date, nullable: true })
  started_at!: Date | null;

  @ApiProperty({ type: Number, example: 0 })
  actual_minutes!: number;

  @ApiProperty({ type: Boolean, example: false })
  is_timer_running!: boolean;

  @ApiPropertyOptional({ type: Date, nullable: true })
  timer_started_at!: Date | null;

  @ApiProperty({ type: [TaskWorkLogItemDto] })
  work_logs!: TaskWorkLogItemDto[];

  @ApiPropertyOptional({ type: Date, nullable: true })
  requested_at!: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  completed_at!: Date | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  completed_by!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  completed_by_name!: string | null;

  @ApiProperty({ type: Boolean, example: false })
  self_approved!: boolean;

  @ApiProperty({ type: Number, example: 1 })
  row_version!: number;

  @ApiProperty({ type: Date })
  created_at!: Date;

  @ApiPropertyOptional({ type: Number, nullable: true })
  created_by!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  created_by_name!: string | null;

  @ApiProperty({ type: [TaskAssigneeSummaryDto] })
  assignees!: TaskAssigneeSummaryDto[];

  @ApiProperty({ type: [TaskHistoryItemDto] })
  history!: TaskHistoryItemDto[];
}

export class CreateSubTaskDto {
  @ApiProperty({ type: String, example: 'Frontend UI layout', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional({ type: Number, example: 60, description: 'Allocated minutes for sub task' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  allocated_minutes?: number;

  @ApiProperty({ type: [Number], example: [1] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  assignee_ids!: number[];
}

export class CreateTaskDto {
  @ApiProperty({ type: String, example: 'Fix production crash in auth', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional({ type: String, example: 'Stacktrace points to token refresh', maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'], default: 'medium' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: TaskPriority;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  task_type_id?: number;

  @ApiPropertyOptional({ type: String, example: '2026-10-31' })
  @IsOptional()
  @IsString()
  due_date?: string;

  @ApiPropertyOptional({ type: Number, example: 120, description: 'Allocated minutes (max 14400)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(14400)
  allocated_minutes?: number;

  @ApiPropertyOptional({ type: [Number], example: [1, 2], description: 'List of active employee IDs' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  assignee_ids?: number[];

  @ApiPropertyOptional({ enum: ['personal', 'project', 'quick'], default: 'personal' })
  @IsOptional()
  @IsEnum(['personal', 'project', 'quick'])
  source?: TaskSource;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  has_sub_tasks?: boolean;

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Lead employee ID if has_sub_tasks is true' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lead_employee_id?: number;

  @ApiPropertyOptional({ type: String, example: 'Security Audit', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  other_task_type?: string;

  @ApiPropertyOptional({ type: [CreateSubTaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubTaskDto)
  sub_tasks?: CreateSubTaskDto[];
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ type: String, maxLength: 150 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ type: String, maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: TaskPriority;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  task_type_id?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  due_date?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(14400)
  allocated_minutes?: number;

  @ApiPropertyOptional({ type: [Number], description: 'Optional new list of 1 to 50 active employee IDs' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  assignee_ids?: number[];

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lead_employee_id?: number;

  @ApiPropertyOptional({ type: String, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  other_task_type?: string;
}

export class MoveTaskStageDto {
  @ApiProperty({ enum: ['assigned', 'in_progress', 'hold', 'requested', 'completed'], example: 'in_progress' })
  @IsEnum(['assigned', 'in_progress', 'hold', 'requested', 'completed'])
  @IsNotEmpty()
  target_stage!: TaskStage;

  @ApiPropertyOptional({ type: String, maxLength: 500, description: 'Optional approval/rejection note' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ type: String, maxLength: 500, description: 'Mandatory reason when moving to hold' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  hold_reason?: string;
}

export class TaskBoardQueryDto {
  @ApiPropertyOptional({ type: String, description: 'Search title or task code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: TaskPriority;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  task_type_id?: number;

  @ApiPropertyOptional({ type: Number, description: 'Filter by assignee employee ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignee_id?: number;

  @ApiPropertyOptional({ enum: ['assigned', 'in_progress', 'hold', 'requested', 'completed'] })
  @IsOptional()
  @IsEnum(['assigned', 'in_progress', 'hold', 'requested', 'completed'])
  stage?: TaskStage;

  @ApiPropertyOptional({ enum: ['personal', 'project', 'quick'] })
  @IsOptional()
  @IsEnum(['personal', 'project', 'quick'])
  source?: TaskSource;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overdue_only?: boolean;
}

export class PendingReviewCountDto {
  @ApiProperty({ type: Number, example: 3 })
  pending_count!: number;
}

export class AssignableEmployeeDto {
  @ApiProperty({ type: Number, example: 1 })
  emp_id!: number;

  @ApiProperty({ type: String, example: 'Admin User' })
  name!: string;

  @ApiProperty({ type: String, example: 'admin@vernoxy.com' })
  email!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatar_url!: string | null;

  @ApiProperty({ type: String, example: 'Lead Developer' })
  role_name!: string;

  @ApiProperty({ type: String, example: 'Engineering' })
  department_name!: string;
}

export class TrackWorkSessionDto {
  @ApiProperty({ enum: ['start', 'pause', 'finish'], example: 'start' })
  @IsIn(['start', 'pause', 'finish'])
  @IsNotEmpty()
  action!: 'start' | 'pause' | 'finish';

  @ApiPropertyOptional({ type: String, example: 'Completed initial draft', nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}
