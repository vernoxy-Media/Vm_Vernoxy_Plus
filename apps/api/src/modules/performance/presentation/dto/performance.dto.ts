import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PerfCycleType {
  YEARLY = 'YEARLY',
  QUARTERLY = 'QUARTERLY',
  MONTHLY = 'MONTHLY',
}

export enum PerfCycleStatus {
  UPCOMING = 'UPCOMING',
  REVIEW_OPEN = 'REVIEW_OPEN',
  CLOSED = 'CLOSED',
}

export class CreatePerfCycleDto {
  @IsEnum(PerfCycleType)
  cycle_type!: PerfCycleType;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  quarter?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsString()
  cycle_name?: string;

  @IsOptional()
  @IsDateString()
  review_start_date?: string;

  @IsOptional()
  @IsDateString()
  review_end_date?: string;
}

export class UpdatePerfCycleDto {
  @IsOptional()
  @IsString()
  cycle_name?: string;

  @IsOptional()
  @IsDateString()
  review_start_date?: string;

  @IsOptional()
  @IsDateString()
  review_end_date?: string;

  @IsOptional()
  @IsEnum(PerfCycleStatus)
  status?: PerfCycleStatus;
}

export class QueryPerfCyclesDto {
  @IsOptional()
  @IsString()
  cycle_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreatePerfFormDto {
  @Type(() => Number)
  @IsInt()
  cycle_id!: number;

  @IsString()
  @IsNotEmpty()
  form_name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  department_ids?: number[];

  @IsOptional()
  @IsArray()
  questions?: any[];

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

export class UpdatePerfFormDto {
  @IsOptional()
  @IsString()
  form_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  department_ids?: number[];

  @IsOptional()
  @IsArray()
  questions?: any[];

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

export class SubmitReviewRatingsDto {
  @IsOptional()
  ratings?: Record<string, number>;

  @IsOptional()
  answers?: Record<string, any>;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  admin_comments?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  final_rating?: number;

  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;
}

export class ReopenReviewDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class SubmitProjectRatingDto {
  @Type(() => Number)
  @IsInt()
  cycle_id!: number;

  @Type(() => Number)
  @IsInt()
  project_id!: number;

  @Type(() => Number)
  @IsInt()
  emp_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class ProjectRatingItemDto {
  @Type(() => Number)
  @IsInt()
  emp_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class SubmitBulkProjectRatingsDto {
  @Type(() => Number)
  @IsInt()
  project_id!: number;

  @Type(() => Number)
  @IsInt()
  cycle_id!: number;

  @IsArray()
  ratings!: ProjectRatingItemDto[];
}

