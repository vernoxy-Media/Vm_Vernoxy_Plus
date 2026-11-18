import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CALL_STATUSES, OUTCOMES } from '../../domain/services/activity-validator.service';
import { CALLING_FILTERS, CAMPAIGN_LEAD_FILTERS, CAMPAIGN_STATUSES, CAMPAIGN_TYPES } from '../../domain/services/campaign.service';

const csv = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? undefined
    : (Array.isArray(value) ? value : String(value).split(',')).map((v) => String(v).trim()).filter(Boolean);
const csvInt = ({ value }: { value: unknown }) => csv({ value })?.map(Number);
const bool = ({ value }: { value: unknown }) => (value === undefined || value === '' ? undefined : value === true || value === 'true');

// Shape only; the business rules and their messages live in the domain validators.

export class ListCampaignsQueryDto {
  @ApiPropertyOptional({ description: 'Campaign name' }) @IsOptional() @IsString() @MaxLength(200) q?: string;
  @ApiPropertyOptional({ enum: CAMPAIGN_TYPES }) @IsOptional() @IsIn([...CAMPAIGN_TYPES]) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional({ description: 'Employee id: campaigns that employee has companies in' }) @IsOptional() @Type(() => Number) @IsInt() emp_id?: number;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD. Campaigns starting on or after this day.' }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use the format YYYY-MM-DD.' }) start_from?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD. Campaigns ending on or before this day.' }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use the format YYYY-MM-DD.' }) end_to?: string;
  @ApiPropertyOptional({ enum: CAMPAIGN_STATUSES }) @IsOptional() @IsIn([...CAMPAIGN_STATUSES]) status?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 10, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class CampaignBodyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ enum: CAMPAIGN_TYPES }) @IsOptional() @IsString() campaign_type?: string;
  @ApiPropertyOptional({ type: [String], description: 'City or cities targeted' }) @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) target_cities?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() target_state?: string | null;
  @ApiPropertyOptional({ description: 'industry_id from the masters' }) @IsOptional() @Type(() => Number) @IsInt() industry_id?: number | null;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD' }) @IsOptional() @IsString() start_date?: string;
  @ApiPropertyOptional({ description: 'YYYY-MM-DD' }) @IsOptional() @IsString() end_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() objective?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string | null;
  @ApiPropertyOptional({ enum: CAMPAIGN_STATUSES }) @IsOptional() @IsString() status?: string;
}

/** The filters for choosing companies, sent as a query string by the search and as a JSON object by "add all filtered". */
export class CompanyFilterDto {
  @ApiPropertyOptional({ description: 'Company name or company code' }) @IsOptional() @IsString() @MaxLength(200) q?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) cities?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) state?: string;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @ArrayMaxSize(100) @Type(() => Number) @IsInt({ each: true }) industry_ids?: number[];
  @ApiPropertyOptional({ description: 'Company category (customer type)' }) @IsOptional() @Type(() => Number) @IsInt() customer_type_id?: number;
  @ApiPropertyOptional({ enum: CAMPAIGN_LEAD_FILTERS }) @IsOptional() @IsIn([...CAMPAIGN_LEAD_FILTERS]) lead_status?: string;
  @ApiPropertyOptional({ enum: ['yes', 'no'], description: 'Previously contacted or not' }) @IsOptional() @IsIn(['yes', 'no']) contacted?: 'yes' | 'no';
}

export class CompanySearchQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) q?: string;
  @ApiPropertyOptional({ type: String, description: 'Comma separated cities' }) @IsOptional() @Transform(csv) cities?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) state?: string;
  @ApiPropertyOptional({ type: String, description: 'Comma separated industry ids' }) @IsOptional() @Transform(csvInt) industry_ids?: number[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() customer_type_id?: number;
  @ApiPropertyOptional({ enum: CAMPAIGN_LEAD_FILTERS }) @IsOptional() @IsIn([...CAMPAIGN_LEAD_FILTERS]) lead_status?: string;
  @ApiPropertyOptional({ enum: ['yes', 'no'] }) @IsOptional() @IsIn(['yes', 'no']) contacted?: 'yes' | 'no';
  @ApiPropertyOptional({ description: 'Leave out the companies already in the campaign' }) @IsOptional() @Transform(bool) hide_added?: boolean;
  @ApiPropertyOptional({ description: 'Marks which companies are already in this campaign' }) @IsOptional() @Type(() => Number) @IsInt() campaign_id?: number;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class AddCompaniesBodyDto {
  @ApiPropertyOptional({ type: [Number], description: 'Ticked companies' }) @IsOptional() @IsArray() @ArrayMaxSize(5000) @Type(() => Number) @IsInt({ each: true }) company_ids?: number[];
  @ApiPropertyOptional({ type: CompanyFilterDto, description: '"Select all filtered": every company that matches (up to 5000)' })
  @IsOptional() @ValidateNested() @Type(() => CompanyFilterDto) filter?: CompanyFilterDto;
}

export class RemoveCompaniesBodyDto {
  @ApiProperty({ type: [Number] }) @IsArray() @ArrayMaxSize(5000) @Type(() => Number) @IsInt({ each: true }) campaign_company_ids!: number[];
}

export class ListCampaignCompaniesQueryDto {
  @ApiPropertyOptional({ description: '"me", "unassigned" or an employee id (Admin only; a Sales user always sees their own)' })
  @IsOptional() @Matches(/^(me|unassigned|\d+)$/, { message: 'assigned_to must be "me", "unassigned" or an employee id' }) assigned_to?: string;
  @ApiPropertyOptional({ enum: CALLING_FILTERS }) @IsOptional() @IsString() calling?: string;
  @ApiPropertyOptional({ description: 'Company name, company code or phone' }) @IsOptional() @IsString() @MaxLength(200) q?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class AssignBodyDto {
  @ApiProperty({ enum: ['manual', 'equal'], description: 'manual: the chosen companies go to one employee (or back to unassigned). equal: shared evenly between the chosen employees.' })
  @IsIn(['manual', 'equal']) mode!: 'manual' | 'equal';
  @ApiPropertyOptional({ type: [Number], description: 'manual: required. equal: leave out to share every unassigned company.' })
  @IsOptional() @IsArray() @ArrayMaxSize(5000) @Type(() => Number) @IsInt({ each: true }) campaign_company_ids?: number[];
  @ApiPropertyOptional({ description: 'manual: the employee; null puts the companies back to unassigned' }) @IsOptional() @Type(() => Number) @IsInt() emp_id?: number | null;
  @ApiPropertyOptional({ type: [Number], description: 'equal: the employees to share between' }) @IsOptional() @IsArray() @ArrayMaxSize(200) @Type(() => Number) @IsInt({ each: true }) emp_ids?: number[];
}

export class TargetItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() emp_id!: number;
  @ApiProperty({ description: 'Calls per day, 0 to 1000' }) @Type(() => Number) @IsInt() @Min(0) @Max(1000) daily_target!: number;
}

export class TargetsBodyDto {
  @ApiProperty({ type: [TargetItemDto] }) @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => TargetItemDto) targets!: TargetItemDto[];
}

export class LogCampaignCallBodyDto {
  @ApiProperty({ enum: CALL_STATUSES }) @IsString() call_status!: string;
  @ApiPropertyOptional({ description: 'Required when the call was not received' }) @IsOptional() @IsString() @MaxLength(150) not_received_reason?: string;
  @ApiPropertyOptional({ enum: OUTCOMES, description: 'Required when the call was received' }) @IsOptional() @IsString() outcome?: string;
  @ApiPropertyOptional({ description: 'What was discussed. Required when the call was received.' }) @IsOptional() @IsString() what_discussed?: string;
  @ApiPropertyOptional({ description: 'Seconds, for a call that was received' }) @IsOptional() @Type(() => Number) @IsInt() call_duration_seconds?: number;
  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'When to call next' }) @IsOptional() @Type(() => Date) next_follow_up_on?: Date;
}
