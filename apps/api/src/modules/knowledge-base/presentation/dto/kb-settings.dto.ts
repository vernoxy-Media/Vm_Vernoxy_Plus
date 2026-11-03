import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsIn, IsArray, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateKbCategoryDto {
  @ApiProperty({ enum: ['INTERNAL', 'CLIENT'], example: 'INTERNAL' })
  @IsString()
  @IsIn(['INTERNAL', 'CLIENT'])
  space!: 'INTERNAL' | 'CLIENT';

  @ApiProperty({ example: 'HR Policies' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Code of conduct, attendance, and workplace policies' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ example: 'Users' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  default_owner_id?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  default_approver_id?: number;

  @ApiPropertyOptional({ enum: [3, 6, 12, 24], example: 12 })
  @IsOptional()
  @IsInt()
  @IsIn([3, 6, 12, 24])
  default_review_cycle_months?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  default_ack_required?: boolean;

  @ApiPropertyOptional({ enum: ['ALL', 'CUSTOM'], default: 'ALL' })
  @IsOptional()
  @IsString()
  @IsIn(['ALL', 'CUSTOM'])
  default_audience_scope?: 'ALL' | 'CUSTOM';

  @ApiPropertyOptional({ type: [Number], example: [1, 2] })
  @IsOptional()
  @IsArray()
  default_audience_departments?: number[];

  @ApiPropertyOptional({ type: [Number], example: [1] })
  @IsOptional()
  @IsArray()
  default_audience_roles?: number[];

  @ApiPropertyOptional({ type: [Number], example: [] })
  @IsOptional()
  @IsArray()
  default_audience_employees?: number[];

  @ApiPropertyOptional({ type: [Number], example: [] })
  @IsOptional()
  @IsArray()
  default_audience_companies?: number[];

  @ApiPropertyOptional({ type: [Number], example: [] })
  @IsOptional()
  @IsArray()
  default_audience_projects?: number[];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateKbCategoryDto {
  @ApiPropertyOptional({ example: 'HR Policies' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ example: 'Users' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  default_owner_id?: number | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  default_approver_id?: number | null;

  @ApiPropertyOptional({ enum: [3, 6, 12, 24], example: 12 })
  @IsOptional()
  @IsInt()
  default_review_cycle_months?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  default_ack_required?: boolean;

  @ApiPropertyOptional({ enum: ['ALL', 'CUSTOM'], default: 'ALL' })
  @IsOptional()
  @IsString()
  @IsIn(['ALL', 'CUSTOM'])
  default_audience_scope?: 'ALL' | 'CUSTOM';

  @ApiPropertyOptional({ type: [Number], example: [1, 2] })
  @IsOptional()
  @IsArray()
  default_audience_departments?: number[];

  @ApiPropertyOptional({ type: [Number], example: [1] })
  @IsOptional()
  @IsArray()
  default_audience_roles?: number[];

  @ApiPropertyOptional({ type: [Number], example: [] })
  @IsOptional()
  @IsArray()
  default_audience_employees?: number[];

  @ApiPropertyOptional({ type: [Number], example: [] })
  @IsOptional()
  @IsArray()
  default_audience_companies?: number[];

  @ApiPropertyOptional({ type: [Number], example: [] })
  @IsOptional()
  @IsArray()
  default_audience_projects?: number[];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
