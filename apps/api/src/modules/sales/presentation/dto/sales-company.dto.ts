import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const csv = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? undefined
    : (Array.isArray(value) ? value : String(value).split(',')).map((v) => String(v).trim()).filter(Boolean);

const csvInt = ({ value }: { value: unknown }) => csv({ value })?.map(Number);

const bool = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : value === true || value === 'true';

// ------------------------------------------------------------------ list ----

export class ListSalesCompaniesQueryDto {
  @ApiPropertyOptional({ description: 'Company name, Company ID, contact person, mobile, email or city' })
  @IsOptional() @IsString() q?: string;

  @ApiPropertyOptional({ type: String, description: 'Comma separated cities (OR inside one filter)' })
  @IsOptional() @Transform(csv) city?: string[];

  @ApiPropertyOptional({ type: String, description: 'Comma separated industry ids' })
  @IsOptional() @Transform(csvInt) industry_ids?: number[];

  @ApiPropertyOptional({ type: String, description: 'Comma separated' })
  @IsOptional() @Transform(csv) nature_of_business?: string[];

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional() @Transform(bool) @IsBoolean() is_gidc?: boolean;

  @ApiPropertyOptional({ type: String, description: 'Comma separated: Good, Average, Poor, No Website' })
  @IsOptional() @Transform(csv) website_quality?: string[];

  @ApiPropertyOptional({ enum: ['all', 'not_a_lead', 'open', 'client', 'lost'], default: 'all' })
  @IsOptional() @IsIn(['all', 'not_a_lead', 'open', 'client', 'lost']) lead?: 'all' | 'not_a_lead' | 'open' | 'client' | 'lost';

  @ApiPropertyOptional({ type: String }) @IsOptional() @Transform(csv) state?: string[];
  @ApiPropertyOptional({ type: String }) @IsOptional() @Transform(csv) country?: string[];
  @ApiPropertyOptional({ type: String }) @IsOptional() @Transform(csv) gidc_name?: string[];
  @ApiPropertyOptional({ type: String }) @IsOptional() @Transform(csv) gidc_area_phase?: string[];
  @ApiPropertyOptional({ type: String, description: 'Companies that have a contact with this designation' })
  @IsOptional() @Transform(csv) designation?: string[];

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) employees_min?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) employees_max?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @Min(0) turnover_min?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @Min(0) turnover_max?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() year_min?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() year_max?: number;

  @ApiPropertyOptional({ type: Boolean }) @IsOptional() @Transform(bool) @IsBoolean() has_website?: boolean;
  @ApiPropertyOptional({ type: Boolean }) @IsOptional() @Transform(bool) @IsBoolean() has_brochure?: boolean;

  @ApiPropertyOptional({ description: 'Employee id of the user who added the company' })
  @IsOptional() @Type(() => Number) @IsInt() added_by?: number;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @IsOptional() @Type(() => Date) added_from?: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @IsOptional() @Type(() => Date) added_to?: Date;

  @ApiPropertyOptional({ enum: ['created_at', 'name', 'city'], default: 'created_at' })
  @IsOptional() @IsIn(['created_at', 'name', 'city']) sort?: 'created_at' | 'name' | 'city';
  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 10, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class DuplicateCheckQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional({ description: 'Company being edited; it is never reported as its own duplicate' })
  @IsOptional() @Type(() => Number) @IsInt() exclude_company_id?: number;
}

// ------------------------------------------------------------------ body ----
// Shape only. Business rules and their messages live in the domain validator,
// so every error comes back in the same { field, message } format.

export class CompanyBodyDto {
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() name?: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() no_of_branches?: number | string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() no_of_plants?: number | string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() full_address?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() city?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() state?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Defaults to India' }) @IsOptional() country?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() pin?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() google_maps_url?: string | null;
  @ApiPropertyOptional({ type: Boolean }) @IsOptional() is_gidc?: boolean | string;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Required when is_gidc is true' }) @IsOptional() gidc_name?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Required when is_gidc is true' }) @IsOptional() gidc_area_phase?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() nature_of_business?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Industry master name' }) @IsOptional() industry?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() products_services?: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() estimated_employees?: number | string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() estimated_turnover?: number | string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() year_established?: number | string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() existing_major_clients?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() website?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Set to "No Website" automatically when website is empty' }) @IsOptional() website_quality?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() developed_by?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() linkedin_url?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() instagram_url?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() facebook_url?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() youtube_url?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() google_business_profile_url?: string | null;
}

export class ContactBodyDto {
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() name?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() designation?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: '10 digits; "+91 98250 41236" is accepted' }) @IsOptional() mobile?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) @IsOptional() email?: string | null;
}

export class CreateSalesCompanyBodyDto {
  @ApiProperty({ type: CompanyBodyDto }) @ValidateNested() @Type(() => CompanyBodyDto) company!: CompanyBodyDto;
  @ApiPropertyOptional({ type: ContactBodyDto, description: 'First contact; becomes the primary contact' })
  @IsOptional() @ValidateNested() @Type(() => ContactBodyDto) contact?: ContactBodyDto;
  @ApiPropertyOptional({ description: 'Send true after the user confirms "This is a different company"' })
  @IsOptional() @IsBoolean() confirm_duplicate?: boolean;
}

export class UpdateSalesCompanyBodyDto {
  @ApiPropertyOptional({ type: CompanyBodyDto, description: 'Only the keys that are sent change' })
  @IsOptional() @ValidateNested() @Type(() => CompanyBodyDto) company?: CompanyBodyDto;
  @ApiPropertyOptional({ type: ContactBodyDto, description: 'Edits the primary contact' })
  @IsOptional() @ValidateNested() @Type(() => ContactBodyDto) contact?: ContactBodyDto;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() confirm_duplicate?: boolean;
}
