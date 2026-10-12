import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ListIndustriesQueryDto {
  @ApiPropertyOptional({ type: String, description: 'Search term by name' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ type: Number, description: 'Filter by parent industry ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parent_id?: number;

  @ApiPropertyOptional({ type: String, enum: ['top', 'sub'], description: 'Filter by level: top or sub' })
  @IsOptional()
  @IsIn(['top', 'sub'])
  level?: 'top' | 'sub';

  @ApiPropertyOptional({ type: Boolean, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: Number, description: 'Pagination limit (1-100)', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ type: Number, description: 'Keyset pagination cursor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cursor?: number;
}

export class IndustryOptionsQueryDto {
  @ApiPropertyOptional({ type: Number, description: 'Parent industry ID to fetch sub-industries for' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parent_id?: number;
}

export class CreateIndustryDto {
  @ApiProperty({ type: String, description: 'Industry name', example: 'Renewable Energy' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ type: Number, description: 'Parent industry ID if this is a sub-industry', example: 1 })
  @IsOptional()
  @IsInt()
  parent_id?: number;
}

export class UpdateIndustryDto {
  @ApiPropertyOptional({ type: String, description: 'Updated industry name', example: 'Clean Energy' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'Active status', example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class IndustryParentDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'Manufacturing' })
  name!: string;
}

export class IndustryListItemDto {
  @ApiProperty({ example: 1, type: Number })
  industry_id!: number;

  @ApiProperty({ example: 'Textile and Apparel', type: String })
  name!: string;

  @ApiProperty({ nullable: true, type: () => IndustryParentDto })
  parent!: IndustryParentDto | null;

  @ApiProperty({ example: 5, type: Number })
  sub_count!: number;

  @ApiProperty({ example: 12, type: Number })
  company_count!: number;

  @ApiProperty({ example: true, type: Boolean })
  is_active!: boolean;

  @ApiProperty({ example: false, type: Boolean })
  is_default!: boolean;
}

export class ListIndustriesResponseDto {
  @ApiProperty({ type: () => [IndustryListItemDto] })
  items!: IndustryListItemDto[];

  @ApiPropertyOptional({ example: 10, nullable: true, type: Number })
  next_cursor!: number | null;
}

export class IndustryOptionDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'Manufacturing' })
  name!: string;

  @ApiProperty({ type: Boolean, example: false })
  is_default!: boolean;
}

export class IndustryDetailResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  industry_id!: number;

  @ApiProperty({ type: String, example: 'Manufacturing' })
  name!: string;

  @ApiPropertyOptional({ type: Number, example: null, nullable: true })
  parent_id!: number | null;

  @ApiProperty({ type: Boolean, example: true })
  is_active!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  is_default!: boolean;
}
