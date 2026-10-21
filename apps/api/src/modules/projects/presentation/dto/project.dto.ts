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
} from 'class-validator';
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

  @ApiProperty({ enum: ['client', 'internal', 'product', 'maintenance'] })
  @IsEnum(['client', 'internal', 'product', 'maintenance'])
  project_type!: 'client' | 'internal' | 'product' | 'maintenance';

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

export class CreateProjectTaskDto {
  @ApiProperty({ example: 'Design Homepage UI' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'], default: 'medium' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sprint_id?: number;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @IsInt()
  allocated_minutes?: number;

  @ApiProperty({ type: [Number], example: [1, 2] })
  @IsArray()
  @IsInt({ each: true })
  assignee_ids!: number[];
}
