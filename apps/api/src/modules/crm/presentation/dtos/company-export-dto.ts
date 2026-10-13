import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsInt, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CompanyExportQueryDto {
  @ApiProperty({ type: String, enum: ['xlsx', 'csv'], default: 'xlsx' })
  @IsIn(['xlsx', 'csv'])
  format: 'xlsx' | 'csv' = 'xlsx';

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  customer_type_id?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  industry_id?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  owner_id?: number;

  @ApiPropertyOptional({ type: String, enum: ['unassigned'] })
  @IsOptional()
  @IsIn(['unassigned'])
  owner?: 'unassigned';

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  is_active?: boolean;
}

export class PagedQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ type: Number, default: 50 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 50))
  @IsInt()
  limit?: number;
}
