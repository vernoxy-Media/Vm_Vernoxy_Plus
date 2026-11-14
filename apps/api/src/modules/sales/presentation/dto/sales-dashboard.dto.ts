import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Matches } from 'class-validator';

const csv = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? undefined
    : (Array.isArray(value) ? value : String(value).split(',')).map((v) => String(v).trim()).filter(Boolean);

const csvInt = ({ value }: { value: unknown }) =>
  csv({ value })?.map(Number).filter((n) => !Number.isNaN(n));

export class SalesDashboardQueryDto {
  @ApiPropertyOptional({ description: 'Global search keyword (Lead ID, Company ID, Company Name, Contact Person, Lead By, City)' })
  @IsOptional() @IsString() q?: string;

  @ApiPropertyOptional({ type: String, description: 'Comma-separated Lead Sources' })
  @IsOptional() @Type(() => String) lead_source?: string | string[];

  @ApiPropertyOptional({ description: '"me", "all" or employee id' })
  @IsOptional() @IsString() lead_by?: string;

  @ApiPropertyOptional({ type: String, description: 'Comma-separated Service Fits' })
  @IsOptional() @Type(() => String) service_fit?: string | string[];

  @ApiPropertyOptional({ type: String, description: 'Comma-separated Statuses' })
  @IsOptional() @Type(() => String) status?: string | string[];

  @ApiPropertyOptional({ type: String, description: 'Comma-separated Cities' })
  @IsOptional() @Type(() => String) city?: string | string[];

  @ApiPropertyOptional({ type: String, description: 'Comma-separated Industry IDs' })
  @IsOptional() industry_ids?: string | number[];

  @ApiPropertyOptional({ enum: ['all_time', 'today', 'last_7_days', 'last_30_days', 'this_month', 'last_6_months', 'this_year', 'custom'], default: 'this_month' })
  @IsOptional() @IsString() date_range?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be YYYY-MM-DD' }) from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be YYYY-MM-DD' }) to?: string;

  // Chart-specific controls
  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'week' })
  @IsOptional() @IsIn(['day', 'week', 'month']) us03_group_by?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({ enum: ['source', 'owner'], default: 'source' })
  @IsOptional() @IsIn(['source', 'owner']) us08_compare_by?: 'source' | 'owner';

  @ApiPropertyOptional({ enum: ['day', 'week', 'month'], default: 'week' })
  @IsOptional() @IsIn(['day', 'week', 'month']) us09_group_by?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({ example: '2026-11-13', description: 'Selected date for daily activity counters (US12)' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'us12_date must be YYYY-MM-DD' }) us12_date?: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) us12_follow_up_from?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) us12_follow_up_to?: string;
}

export class UpdateDashboardDefaultsDto {
  @IsOptional() @IsString() date_range?: string;
  @IsOptional() @IsArray() lead_source?: string[];
  @IsOptional() @IsString() lead_by?: string;
  @IsOptional() @IsArray() service_fit?: string[];
  @IsOptional() @IsArray() status?: string[];
  @IsOptional() @IsArray() city?: string[];
  @IsOptional() @IsArray() industry_ids?: number[];
}

export class UpdateUserChartPermissionsDto {
  @IsObject() permissions!: Record<string, boolean>;
}
