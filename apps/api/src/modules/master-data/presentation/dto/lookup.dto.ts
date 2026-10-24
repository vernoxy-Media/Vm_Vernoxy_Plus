import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export const ALLOWED_LOOKUP_TYPES = [
  'task_type',
  'break_type',
  'project_category',
  'project_status',
  'project_type',
  'lead_source',
  'lost_reason',
  'person_department',
];

export class LookupOptionsQueryDto {
  @ApiProperty({
    type: String,
    description: `Lookup type. Allowed: ${ALLOWED_LOOKUP_TYPES.join(', ')}`,
    example: 'task_type',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;
}

export class LookupOptionDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'engineering' })
  code!: string;

  @ApiProperty({ type: String, example: 'Engineering' })
  label!: string;
}

// ---- Full Lookup Item DTO (for CRUD management) ----

export class MasterLookupItemDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'task_type' })
  lookup_type!: string;

  @ApiProperty({ type: String, example: 'bug_fix' })
  code!: string;

  @ApiProperty({ type: String, example: 'Bug Fix' })
  label!: string;

  @ApiProperty({ type: Number, example: 10 })
  sort_order!: number;

  @ApiProperty({ type: Boolean, example: true })
  is_active!: boolean;

  @ApiProperty({ type: String, example: '2024-01-01T00:00:00.000Z' })
  created_at!: string;
}

// ---- List Query ----

export class ListLookupsQueryDto {
  @ApiProperty({
    type: String,
    description: `Lookup type to list. Allowed: ${ALLOWED_LOOKUP_TYPES.join(', ')}`,
    example: 'task_type',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(ALLOWED_LOOKUP_TYPES, { message: `type must be one of: ${ALLOWED_LOOKUP_TYPES.join(', ')}` })
  type!: string;
}

// ---- Create DTO ----

export class CreateLookupDto {
  @ApiProperty({ type: String, description: 'Display label', example: 'Bug Fix' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiPropertyOptional({ type: String, description: 'Unique code (auto-generated if not provided)', example: 'bug_fix' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiPropertyOptional({ type: Number, description: 'Sort order', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ type: Boolean, description: 'Active status', default: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  is_active?: boolean;
}

// ---- Update DTO ----

export class UpdateLookupDto {
  @ApiPropertyOptional({ type: String, description: 'Display label', example: 'Critical Bug Fix' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @ApiPropertyOptional({ type: String, description: 'Code', example: 'critical_bug_fix' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiPropertyOptional({ type: Number, description: 'Sort order', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ type: Boolean, description: 'Active status' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  is_active?: boolean;
}
