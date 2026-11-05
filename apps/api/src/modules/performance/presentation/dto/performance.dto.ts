import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  ValidateNested,
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

/** Screen 2: Admin only chooses the type and the period; the system fills the rest. */
export class CreatePerfCycleDto {
  @IsEnum(PerfCycleType, { message: 'Please select the Cycle Type.' })
  cycle_type!: PerfCycleType;

  @Type(() => Number)
  @IsInt({ message: 'Please select the Year.' })
  @Min(2020, { message: 'Please select the Year.' })
  @Max(2100, { message: 'Please select the Year.' })
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
}

export class UpdatePerfCycleDto {
  @IsOptional()
  @IsEnum(PerfCycleType, { message: 'Please select the Cycle Type.' })
  cycle_type?: PerfCycleType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

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
}

export class CyclePreviewQueryDto {
  @IsEnum(PerfCycleType, { message: 'Please select the Cycle Type.' })
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

export class QueryPerfFormsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cycle_id?: number;

  @IsOptional()
  @IsString()
  cycle_type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_id?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

/** Screen 4: Form name, Cycle type + Cycle, Form is for, questions. */
export class CreatePerfFormDto {
  @IsString({ message: 'Please enter the Form name.' })
  @IsNotEmpty({ message: 'Please enter the Form name.' })
  @MaxLength(150)
  form_name!: string;

  @Type(() => Number)
  @IsInt({ message: 'Please select the Cycle.' })
  cycle_id!: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  department_ids?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  questions?: any[];
}

export class UpdatePerfFormDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Please enter the Form name.' })
  @MaxLength(150)
  form_name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cycle_id?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  department_ids?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  questions?: any[];
}

export class SubmitReviewRatingsDto {
  @IsOptional()
  @IsObject()
  ratings?: Record<string, number>;

  @IsOptional()
  @IsObject()
  answers?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string;

  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;
}

export type ReviewPart = 'SELF' | 'MANAGER' | 'ADMIN';

export class ReopenReviewDto {
  @IsIn(['SELF', 'MANAGER', 'ADMIN'], { message: 'Please choose which review to open again.' })
  part!: ReviewPart;

  @IsString()
  @IsNotEmpty({ message: 'Please enter the reason.' })
  @MaxLength(500)
  reason!: string;
}

export class TeamReviewsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cycle_id?: number;

  @IsOptional()
  @IsIn(['MANAGER', 'ADMIN'])
  as?: 'MANAGER' | 'ADMIN';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_id?: number;
}

export class SummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cycle_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  department_id?: number;
}

export class ProjectRatingItemDto {
  @Type(() => Number)
  @IsInt()
  emp_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Ratings must be whole stars from 1 to 5.' })
  @Min(0)
  @Max(5, { message: 'Ratings must be whole stars from 1 to 5.' })
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class SubmitBulkProjectRatingsDto {
  @Type(() => Number)
  @IsInt({ message: 'Please select the Project.' })
  project_id!: number;

  @Type(() => Number)
  @IsInt({ message: 'Please select the Cycle.' })
  cycle_id!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectRatingItemDto)
  ratings!: ProjectRatingItemDto[];

  @IsOptional()
  @IsBoolean()
  is_draft?: boolean;
}
