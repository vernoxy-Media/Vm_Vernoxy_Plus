import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Length,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ComplaintPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent',
}

export class CreateComplaintTypeDto {
  @ApiProperty({ description: 'Complaint type name (unique)', example: 'IT & Equipment' })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiPropertyOptional({ description: 'Short unique code', example: 'IT_EQUIPMENT' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  code?: string;

  @ApiProperty({ description: 'One-line hint displayed under the field in Add form', example: 'Laptop, phone, network, software access, email' })
  @IsString()
  @Length(5, 500)
  description!: string;

  @ApiPropertyOptional({ description: 'Default assigned investigator employee ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  default_handler_id?: number;

  @ApiPropertyOptional({ description: 'Default department ID auto-filled in form', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  default_department_id?: number;

  @ApiProperty({ enum: ComplaintPriority, default: ComplaintPriority.MEDIUM })
  @IsEnum(ComplaintPriority)
  default_priority!: ComplaintPriority;

  @ApiPropertyOptional({ description: 'Lock confidentiality to true (e.g. Behaviour & Conduct)', default: false })
  @IsOptional()
  @IsBoolean()
  is_always_confidential?: boolean;

  @ApiPropertyOptional({ description: 'Display order in dropdowns', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  display_order?: number;

  @ApiPropertyOptional({ description: 'Whether active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateComplaintTypeDto {
  @ApiPropertyOptional({ description: 'Complaint type name', example: 'IT & Equipment' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Short unique code', example: 'IT_EQUIPMENT' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  code?: string;

  @ApiPropertyOptional({ description: 'One-line hint description', example: 'Laptop, phone, network, software access' })
  @IsOptional()
  @IsString()
  @Length(5, 500)
  description?: string;

  @ApiPropertyOptional({ description: 'Default handler employee ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  default_handler_id?: number | null;

  @ApiPropertyOptional({ description: 'Default department ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  default_department_id?: number | null;

  @ApiPropertyOptional({ enum: ComplaintPriority })
  @IsOptional()
  @IsEnum(ComplaintPriority)
  default_priority?: ComplaintPriority;

  @ApiPropertyOptional({ description: 'Lock confidentiality to true' })
  @IsOptional()
  @IsBoolean()
  is_always_confidential?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  display_order?: number;

  @ApiPropertyOptional({ description: 'Whether active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateComplaintSettingsDto {
  @ApiPropertyOptional({ description: 'Calendar days SLA for Low priority (1-90)', example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  target_days_low?: number;

  @ApiPropertyOptional({ description: 'Calendar days SLA for Medium priority (1-90)', example: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  target_days_medium?: number;

  @ApiPropertyOptional({ description: 'Calendar days SLA for High priority (1-90)', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  target_days_high?: number;

  @ApiPropertyOptional({ description: 'Calendar days SLA for Urgent priority (1-90)', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  target_days_urgent?: number;

  @ApiPropertyOptional({ description: 'Confirmation window in days (1-30)', example: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  confirmation_window_days?: number;

  @ApiPropertyOptional({ description: 'Days before target date to remind handler', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  @Type(() => Number)
  reminder_before_target_days?: number;

  @ApiPropertyOptional({ description: 'Hours a complaint may stay New before Admin reminder', example: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  @Type(() => Number)
  review_reminder_hours?: number;

  @ApiPropertyOptional({ description: 'Days after which complaint date shows warning', example: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  old_date_warning_days?: number;

  @ApiPropertyOptional({ description: 'Toggle duplicate check within 7 days', example: true })
  @IsOptional()
  @IsBoolean()
  duplicate_warning?: boolean;
}

