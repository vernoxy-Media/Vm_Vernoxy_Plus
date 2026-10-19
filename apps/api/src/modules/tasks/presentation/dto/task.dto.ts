import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskPriority, TaskStage } from '../../domain/entities/task.entity';

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

  @ApiPropertyOptional({ type: String, example: 'Feature', nullable: true })
  task_type_label!: string | null;

  @ApiPropertyOptional({ type: String, example: '2026-10-25', nullable: true })
  due_date!: string | null;

  @ApiPropertyOptional({ type: Number, example: 180, nullable: true })
  allocated_minutes!: number | null;

  @ApiProperty({ enum: ['assigned', 'in_progress', 'requested', 'completed'], example: 'assigned' })
  stage!: TaskStage;

  @ApiProperty({ type: Boolean, example: false })
  is_overdue!: boolean;

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
  requested!: number;

  @ApiProperty({ type: Number, example: 10 })
  completed!: number;

  @ApiProperty({ type: Number, example: 17 })
  total!: number;
}

export class TaskBoardResultDto {
  @ApiProperty({ type: () => TaskBoardColumnsDto })
  columns!: TaskBoardColumnsDto;

  @ApiProperty({ type: () => TaskBoardCountsDto })
  counts!: TaskBoardCountsDto;
}

export class TaskSummaryDto {
  @ApiProperty({ type: Number, example: 17 })
  total!: number;

  @ApiProperty({ type: Number, example: 4 })
  assigned!: number;

  @ApiProperty({ type: Number, example: 2 })
  in_progress!: number;

  @ApiProperty({ type: Number, example: 1 })
  requested!: number;

  @ApiProperty({ type: Number, example: 0 })
  overdue!: number;

  @ApiProperty({ type: Number, example: 3 })
  completed_today!: number;

  @ApiProperty({ type: Number, example: 10 })
  completed_this_month!: number;
}

export class TaskHistoryItemDto {
  @ApiProperty({ type: String, example: '10' })
  history_id!: string;

  @ApiProperty({ type: Number, example: 1 })
  task_id!: number;

  @ApiProperty({ type: String, example: 'created' })
  event_type!: string;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  actor_id!: number | null;

  @ApiPropertyOptional({ type: String, example: 'Admin User', nullable: true })
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

  @ApiProperty({ type: String, example: 'Build Clean UI' })
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

  @ApiProperty({ enum: ['assigned', 'in_progress', 'requested', 'completed'] })
  stage!: TaskStage;

  @ApiPropertyOptional({ type: String, nullable: true })
  review_note!: string | null;

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

  @ApiProperty({ type: [Number], example: [1, 2], description: 'List of 1 to 50 active employee IDs' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  assignee_ids!: number[];
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
}

export class MoveTaskStageDto {
  @ApiProperty({ enum: ['assigned', 'in_progress', 'requested', 'completed'], example: 'in_progress' })
  @IsEnum(['assigned', 'in_progress', 'requested', 'completed'])
  @IsNotEmpty()
  target_stage!: TaskStage;

  @ApiPropertyOptional({ type: String, maxLength: 500, description: 'Optional approval/rejection note' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
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
