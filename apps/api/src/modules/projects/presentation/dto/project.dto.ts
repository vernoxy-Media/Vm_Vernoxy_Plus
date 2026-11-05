import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  IsArray,
  MaxLength,
  ValidateNested,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { CreateSubTaskDto } from '../../../tasks/presentation/dto/task.dto';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeploymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vercel_account?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vercel_link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domain_link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storage_account?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deployment_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  go_live_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  deployment_done_by?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  admin_login_link?: string;
}

export class CreateCredentialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  admin_label?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  admin_id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  admin_password!: string;
}

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  project_name!: string;

  @ApiProperty({ description: 'Project type (client, internal, product, maintenance, or custom lookup code)' })
  @IsString()
  @IsNotEmpty()
  project_type!: string;

  @ApiProperty({
    enum: [
      'ecom_website',
      'portfolio_website',
      'seo',
      'social_media',
      'crm',
      'erp',
      'brochure',
      'other',
    ],
  })
  @IsEnum([
    'ecom_website',
    'portfolio_website',
    'seo',
    'social_media',
    'crm',
    'erp',
    'brochure',
    'other',
  ])
  category!:
    | 'ecom_website'
    | 'portfolio_website'
    | 'seo'
    | 'social_media'
    | 'crm'
    | 'erp'
    | 'brochure'
    | 'other';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  other_category?: string;

  @ApiProperty()
  @IsDateString()
  start_date!: string;

  @ApiProperty()
  @IsDateString()
  deadline!: string;

  @ApiProperty()
  @IsInt()
  project_manager_id!: number;

  @ApiPropertyOptional({
    enum: [
      'new',
      'planning',
      'in_progress',
      'pending',
      'review',
      'delivered',
      'on_hold',
      'cancelled',
    ],
  })
  @IsOptional()
  @IsEnum([
    'new',
    'planning',
    'in_progress',
    'pending',
    'review',
    'delivered',
    'on_hold',
    'cancelled',
  ])
  project_status?:
    | 'new'
    | 'planning'
    | 'in_progress'
    | 'pending'
    | 'review'
    | 'delivered'
    | 'on_hold'
    | 'cancelled';

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  member_ids!: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  client_name?: string;

  @ApiPropertyOptional({ description: 'Detailed project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lead_received_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  project_approved_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tech_frontend?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tech_backend?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tech_cloud?: string;

  @ApiPropertyOptional({ type: CreateDeploymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDeploymentDto)
  deployment?: CreateDeploymentDto;

  @ApiPropertyOptional({ type: [CreateCredentialDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCredentialDto)
  credentials?: CreateCredentialDto[];
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  project_name?: string;

  @ApiPropertyOptional({ description: 'Project type (client, internal, product, maintenance, or custom lookup code)' })
  @IsOptional()
  @IsString()
  project_type?: string;

  @ApiPropertyOptional({
    enum: [
      'ecom_website',
      'portfolio_website',
      'seo',
      'social_media',
      'crm',
      'erp',
      'brochure',
      'other',
    ],
  })
  @IsOptional()
  @IsEnum([
    'ecom_website',
    'portfolio_website',
    'seo',
    'social_media',
    'crm',
    'erp',
    'brochure',
    'other',
  ])
  category?:
    | 'ecom_website'
    | 'portfolio_website'
    | 'seo'
    | 'social_media'
    | 'crm'
    | 'erp'
    | 'brochure'
    | 'other';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  other_category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  project_manager_id?: number;

  @ApiPropertyOptional({
    enum: [
      'new',
      'planning',
      'in_progress',
      'pending',
      'review',
      'delivered',
      'on_hold',
      'cancelled',
    ],
  })
  @IsOptional()
  @IsEnum([
    'new',
    'planning',
    'in_progress',
    'pending',
    'review',
    'delivered',
    'on_hold',
    'cancelled',
  ])
  project_status?:
    | 'new'
    | 'planning'
    | 'in_progress'
    | 'pending'
    | 'review'
    | 'delivered'
    | 'on_hold'
    | 'cancelled';

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  member_ids?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  client_name?: string;

  @ApiPropertyOptional({ description: 'Detailed project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lead_received_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  project_approved_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tech_frontend?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tech_backend?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tech_cloud?: string;

  @ApiPropertyOptional({ type: CreateDeploymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDeploymentDto)
  deployment?: CreateDeploymentDto;

  @ApiPropertyOptional({ type: [CreateCredentialDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCredentialDto)
  credentials?: CreateCredentialDto[];
}

export class UpdateProjectStatusDto {
  @ApiProperty({
    enum: [
      'new',
      'planning',
      'in_progress',
      'pending',
      'review',
      'delivered',
      'on_hold',
      'cancelled',
    ],
  })
  @IsEnum([
    'new',
    'planning',
    'in_progress',
    'pending',
    'review',
    'delivered',
    'on_hold',
    'cancelled',
  ])
  status!:
    | 'new'
    | 'planning'
    | 'in_progress'
    | 'pending'
    | 'review'
    | 'delivered'
    | 'on_hold'
    | 'cancelled';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ProjectsFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project_manager_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  end_date?: string;
}

export class CreateSprintDto {
  @ApiProperty({ example: 'Sprint 1 - Foundation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sprint_name!: string;

  @ApiProperty({ example: '2026-10-21' })
  @IsDateString()
  start_date!: string;

  @ApiProperty({ example: '2026-11-04' })
  @IsDateString()
  end_date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprint_goal?: string;

  @ApiPropertyOptional({ enum: ['planned', 'active', 'completed'], default: 'planned' })
  @IsOptional()
  @IsEnum(['planned', 'active', 'completed'])
  status?: 'planned' | 'active' | 'completed';
}

export class UpdateSprintDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sprint_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprint_goal?: string;

  @ApiPropertyOptional({ enum: ['planned', 'active', 'completed'] })
  @IsOptional()
  @IsEnum(['planned', 'active', 'completed'])
  status?: 'planned' | 'active' | 'completed';
}

/** Same fields and rules as Create Task in the Task Module, plus Sprint (Project BFD 2.7). */
export class CreateProjectTaskDto {
  @ApiProperty({ example: 'Design Homepage UI' })
  @IsString({ message: 'Please enter the Task Name.' })
  @IsNotEmpty({ message: 'Please enter the Task Name.' })
  @MaxLength(150, { message: 'Task Name cannot be longer than 150 characters.' })
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiProperty({ example: 180 })
  @Type(() => Number)
  @IsInt({ message: 'Allocated Time is mandatory and must be greater than zero.' })
  @Min(1, { message: 'Allocated Time is mandatory and must be greater than zero.' })
  @Max(14400)
  allocated_minutes!: number;

  @ApiProperty({ type: [Number], example: [1] })
  @IsArray()
  @IsInt({ each: true })
  assignee_ids!: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  has_sub_tasks?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lead_employee_id?: number;

  @ApiPropertyOptional({ type: [CreateSubTaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubTaskDto)
  sub_tasks?: CreateSubTaskDto[];

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'], default: 'medium' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'], { message: 'Please select the Priority: High, Medium or Low.' })
  priority?: 'low' | 'medium' | 'high';

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Please select the Task Type.' })
  task_type_id!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Other Task Type cannot be longer than 100 characters.' })
  other_task_type?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sprint_id?: number;
}

export class CreateDiscussionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  attachments?: string[];

  @ApiPropertyOptional({ type: [Number], description: 'Employee IDs tagged with @ in the message' })
  @IsOptional()
  @IsArray()
  tagged_employee_ids?: number[];
}

/** Project BFD 3.5 Create Bug. Status is system-set (New). */
export class CreateBugDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  task_id?: number;

  @ApiProperty()
  @IsString({ message: 'Please enter the Title.' })
  @IsNotEmpty({ message: 'Please enter the Title.' })
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString({ message: 'Please enter the Description.' })
  @IsNotEmpty({ message: 'Please enter the Description.' })
  @MaxLength(5000)
  description!: string;

  @ApiProperty()
  @IsString({ message: 'Please enter the Steps to Reproduce.' })
  @IsNotEmpty({ message: 'Please enter the Steps to Reproduce.' })
  @MaxLength(5000)
  steps_to_reproduce!: string;

  @ApiProperty()
  @IsString({ message: 'Please enter the Expected Result.' })
  @IsNotEmpty({ message: 'Please enter the Expected Result.' })
  @MaxLength(5000)
  expected_result!: string;

  @ApiProperty()
  @IsString({ message: 'Please enter the Actual Result.' })
  @IsNotEmpty({ message: 'Please enter the Actual Result.' })
  @MaxLength(5000)
  actual_result!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt({ message: 'Please select the employee in Assigned To.' })
  assigned_to!: number;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'], default: 'low' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'], { message: 'Please select the Priority.' })
  priority?: 'low' | 'medium' | 'high';

  @ApiProperty({ enum: ['frontend', 'backend', 'ui', 'database', 'other'] })
  @IsEnum(['frontend', 'backend', 'ui', 'database', 'other'], { message: 'Please select the Bug Type.' })
  bug_type!: 'frontend' | 'backend' | 'ui' | 'database' | 'other';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  other_bug_type?: string;

  @ApiPropertyOptional({ description: 'Storage key or URL of the uploaded file (max 5 MB)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  attachment_url?: string;
}

export class UpdateBugStatusDto {
  @ApiProperty({
    enum: [
      'new',
      'open',
      'ready_for_dev',
      'dev_in_progress',
      'ready_for_qa',
      'qa_in_progress',
      'done',
      'not_a_bug',
    ],
  })
  @IsEnum([
    'new',
    'open',
    'ready_for_dev',
    'dev_in_progress',
    'ready_for_qa',
    'qa_in_progress',
    'done',
    'not_a_bug',
  ])
  @IsNotEmpty()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class AddBugCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comment!: string;
}

