import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttachmentInputDto {
  @IsString()
  @IsNotEmpty()
  file_name!: string;

  @IsString()
  @IsNotEmpty()
  file_url!: string;

  @IsNumber()
  @Min(0)
  file_size_bytes!: number;

  @IsString()
  @IsNotEmpty()
  mime_type!: string;
}

export class CreateKbArticleDto {
  @IsString()
  @IsIn(['INTERNAL', 'CLIENT'])
  space!: string;

  @IsInt()
  @Type(() => Number)
  category_id!: number;

  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  summary!: string;

  @IsString()
  @IsIn(['WRITTEN', 'DOCUMENT', 'VIDEO'])
  @IsOptional()
  content_type?: string = 'WRITTEN';

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  owner_emp_id?: number;

  @IsString()
  @IsOptional()
  effective_from?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  review_cycle_months?: number;

  @IsBoolean()
  @IsOptional()
  ack_required?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  ack_due_days?: number;

  @IsString()
  @IsIn(['ALL', 'CUSTOM'])
  @IsOptional()
  audience_scope?: string = 'ALL';

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  audience_departments?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  audience_roles?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  audience_employees?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  audience_companies?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  audience_projects?: number[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  related_article_ids?: number[];

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  video_url?: string;

  @IsArray()
  @IsOptional()
  attachments?: AttachmentInputDto[];
}

export class UpdateKbArticleDraftDto {
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @IsOptional()
  summary?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  category_id?: number;

  @IsString()
  @IsIn(['WRITTEN', 'DOCUMENT', 'VIDEO'])
  @IsOptional()
  content_type?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  owner_emp_id?: number;

  @IsString()
  @IsOptional()
  effective_from?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  review_cycle_months?: number;

  @IsBoolean()
  @IsOptional()
  ack_required?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  ack_due_days?: number;

  @IsString()
  @IsIn(['ALL', 'CUSTOM'])
  @IsOptional()
  audience_scope?: string;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  audience_departments?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  audience_roles?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  audience_employees?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  audience_companies?: number[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  audience_projects?: number[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  related_article_ids?: number[];

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  video_url?: string;

  @IsArray()
  @IsOptional()
  attachments?: AttachmentInputDto[];
}

export class SubmitKbArticleDto {
  @IsString()
  @IsIn(['MAJOR', 'MINOR'])
  change_type!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  change_summary!: string;
}

export class ReviewKbArticleDto {
  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}

export class DirectPublishKbArticleDto {
  @IsString()
  @IsIn(['MAJOR', 'MINOR'])
  @IsOptional()
  change_type?: string = 'MINOR';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  change_summary?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class KbFeedbackDto {
  @IsBoolean()
  is_helpful!: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}

export class ArchiveKbArticleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  archive_reason!: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  replacement_article_id?: number;
}

export class QueryKbArticlesDto {
  @IsString()
  @IsIn(['INTERNAL', 'CLIENT'])
  @IsOptional()
  space?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  category_id?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  mine?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  ack_only?: boolean;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
