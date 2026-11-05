import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LEAD_STATUSES } from '../../domain/entities/sales-lead';

const csv = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? undefined
    : (Array.isArray(value) ? value : String(value).split(',')).map((v) => String(v).trim()).filter(Boolean);
const csvInt = ({ value }: { value: unknown }) => csv({ value })?.map(Number);
const bool = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : value === true || value === 'true';

/** Filters shared by the Leads List and the Kanban board (BFD section 6, Part 5). */
export class LeadFiltersQueryDto {
  @ApiPropertyOptional({ description: 'Company name, Lead ID, contact or mobile' })
  @IsOptional() @IsString() q?: string;

  @ApiPropertyOptional({
    enum: ['open', 'all', ...LEAD_STATUSES],
    description: 'Open = New + Contacted + Qualified + On Hold. Default: open (list), all (board).',
  })
  @IsOptional() @IsIn(['open', 'all', ...LEAD_STATUSES]) status?: string;

  @ApiPropertyOptional({
    description: '"me", "all" or an employee id. Sales users always see only their own leads; Admin may narrow.',
    example: 'me',
  })
  @IsOptional() @Matches(/^(me|all|\d+)$/, { message: 'lead_by must be "me", "all" or an employee id' }) lead_by?: string;

  @ApiPropertyOptional({ type: String, description: 'Comma separated cities' })
  @IsOptional() @Transform(csv) city?: string[];
  @ApiPropertyOptional({ type: String, description: 'Comma separated industry ids' })
  @IsOptional() @Transform(csvInt) industry_ids?: number[];
  @ApiPropertyOptional({ type: String, description: 'Comma separated Lead Source labels' })
  @IsOptional() @Transform(csv) lead_source?: string[];
  @ApiPropertyOptional({ type: String, description: 'Comma separated Service Fit labels' })
  @IsOptional() @Transform(csv) service_fit?: string[];

  @ApiPropertyOptional({ enum: ['today', 'overdue', 'this_week', 'none'] })
  @IsOptional() @IsIn(['today', 'overdue', 'this_week', 'none']) follow_up?: 'today' | 'overdue' | 'this_week' | 'none';

  @ApiPropertyOptional({ enum: ['today', 'this_week', 'this_month'] })
  @IsOptional() @IsIn(['today', 'this_week', 'this_month']) date_added?: 'today' | 'this_week' | 'this_month';
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @IsOptional() @Type(() => Date) added_from?: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @IsOptional() @Type(() => Date) added_to?: Date;

  @ApiPropertyOptional({ type: String }) @IsOptional() @Transform(csv) nature_of_business?: string[];
  @ApiPropertyOptional({ type: Boolean }) @IsOptional() @Transform(bool) @IsBoolean() is_gidc?: boolean;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Transform(csv) gidc_name?: string[];
  @ApiPropertyOptional({ type: String }) @IsOptional() @Transform(csv) website_quality?: string[];
  @ApiPropertyOptional({ type: String }) @IsOptional() @Transform(csv) state?: string[];

  @ApiPropertyOptional({ enum: [7, 15, 30], description: 'No conversation in the last N days' })
  @IsOptional() @Type(() => Number) @IsIn([7, 15, 30]) no_conversation_days?: 7 | 15 | 30;

  @ApiPropertyOptional({ description: 'Meaningful when status is Lost' })
  @IsOptional() @IsString() lost_reason?: string;

  @ApiPropertyOptional({ enum: ['next_follow_up', 'company', 'city', 'date_added', 'status'], default: 'next_follow_up' })
  @IsOptional() @IsIn(['next_follow_up', 'company', 'city', 'date_added', 'status']) sort?: 'next_follow_up' | 'company' | 'city' | 'date_added' | 'status';
  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
}

export class ListLeadsQueryDto extends LeadFiltersQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 10, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class LeadBoardQueryDto extends LeadFiltersQueryDto {
  @ApiPropertyOptional({ default: 20, maximum: 100, description: 'Cards loaded per column; use the list endpoint with status=<column> for more.' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) per_column?: number;
}

export class ConvertToLeadBodyDto {
  @ApiPropertyOptional({ description: 'Lead Source master label. Starts as "Cold calling"; forced to "Existing client" for a client.' })
  @IsOptional() @IsString() lead_source?: string;

  @ApiPropertyOptional({ description: 'Employee id. Defaults to the user who is converting; that user is told when it is someone else.' })
  @IsOptional() @Type(() => Number) @IsInt() lead_by_id?: number;

  @ApiProperty({ type: [String], description: 'One or many Service Fit labels (required). A single string is accepted too.' })
  @IsOptional() // requiredness is checked by the domain validator so the message is the BFD one
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  service_fit?: string[];

  @ApiPropertyOptional({ description: 'Saved as a Requirement note on the lead' })
  @IsOptional() @IsString() first_note?: string;
}
