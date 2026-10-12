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
  MinLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ListCompaniesQueryDto {
  @ApiPropertyOptional({ type: String, description: 'Search term by company name (min 2 chars)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  q?: string;

  @ApiPropertyOptional({ type: Number, description: 'Filter by customer type ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customer_type_id?: number;

  @ApiPropertyOptional({ type: Number, description: 'Filter by industry or sub-industry ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  industry_id?: number;

  @ApiPropertyOptional({ type: Number, description: 'Filter by owner employee ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  owner_id?: number;

  @ApiPropertyOptional({ type: String, enum: ['unassigned'], description: 'Filter unassigned owner records' })
  @IsOptional()
  @IsIn(['unassigned'])
  owner?: 'unassigned';

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

  @ApiPropertyOptional({ type: String, description: 'Keyset pagination cursor' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class CompanyOptionsQueryDto {
  @ApiPropertyOptional({ type: String, description: 'Search term for company name' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ type: Number, description: 'Exclude company ID and its descendants' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  exclude_id?: number;
}

export class CompanyDuplicateCheckQueryDto {
  @ApiPropertyOptional({ type: String, description: 'Company name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: String, description: 'Company email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ type: String, description: 'Company phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ type: String, description: 'Company website' })
  @IsOptional()
  @IsString()
  website?: string;
}

export class CreateCompanyChannelDto {
  @ApiProperty({ type: String, example: 'email', enum: ['website', 'facebook', 'instagram', 'x', 'linkedin', 'email', 'phone', 'whatsapp'] })
  @IsString()
  @IsNotEmpty()
  channel_type!: string;

  @ApiProperty({ type: String, example: 'contact@acme.com' })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiPropertyOptional({ type: String, example: 'Support' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class UpdateCompanyChannelDto {
  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt()
  channel_id?: number;

  @ApiProperty({ type: String, example: 'email', enum: ['website', 'facebook', 'instagram', 'x', 'linkedin', 'email', 'phone', 'whatsapp'] })
  @IsString()
  @IsNotEmpty()
  channel_type!: string;

  @ApiProperty({ type: String, example: 'contact@acme.com' })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiPropertyOptional({ type: String, example: 'Support' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class CreatePersonNestedDto {
  @ApiProperty({ type: String, example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ type: String, example: 'jane.doe@acme.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ type: String, example: '+1234567890' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ type: String, example: 'https://linkedin.com/in/janedoe' })
  @IsOptional()
  @IsString()
  linkedin_url?: string;
}

export class CreateCompanyContactDto {
  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt()
  person_id?: number;

  @ApiPropertyOptional({ type: () => CreatePersonNestedDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePersonNestedDto)
  person?: CreatePersonNestedDto;

  @ApiPropertyOptional({ type: String, example: 'VP Engineering' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt()
  department_id?: number;

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional({ type: Number, example: 0, description: 'Index of another contact in the same request who this contact reports to' })
  @IsOptional()
  @IsInt()
  reports_to_index?: number;
}

export class UpdateCompanyContactDto {
  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt()
  company_person_id?: number;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt()
  person_id?: number;

  @ApiPropertyOptional({ type: () => CreatePersonNestedDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePersonNestedDto)
  person?: CreatePersonNestedDto;

  @ApiPropertyOptional({ type: String, example: 'VP Engineering' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt()
  department_id?: number;

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional({ type: Number, example: 2 })
  @IsOptional()
  @IsInt()
  reports_to_company_person_id?: number;

  @ApiPropertyOptional({ type: Number, example: 0 })
  @IsOptional()
  @IsInt()
  reports_to_index?: number;
}

export class CreateCompanyDto {
  @ApiProperty({ type: String, example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt()
  parent_company_id?: number;

  @ApiProperty({ type: Number, example: 1 })
  @IsInt()
  customer_type_id!: number;

  @ApiProperty({ type: Number, example: 1 })
  @IsInt()
  industry_id!: number;

  @ApiPropertyOptional({ type: Number, example: 2 })
  @IsOptional()
  @IsInt()
  sub_industry_id?: number;

  @ApiPropertyOptional({ type: String, example: '123 Market St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ type: String, example: 'San Francisco' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ type: String, example: 'CA' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ type: String, example: 'United States' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt()
  owner_id?: number;

  @ApiPropertyOptional({ type: () => [CreateCompanyChannelDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCompanyChannelDto)
  @ArrayMaxSize(20)
  channels?: CreateCompanyChannelDto[];

  @ApiPropertyOptional({ type: () => [CreateCompanyContactDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCompanyContactDto)
  @ArrayMaxSize(50)
  contacts?: CreateCompanyContactDto[];
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ type: String, example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  parent_company_id?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt()
  customer_type_id?: number;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @IsInt()
  industry_id?: number;

  @ApiPropertyOptional({ type: Number, example: 2, nullable: true })
  @IsOptional()
  @IsInt()
  sub_industry_id?: number | null;

  @ApiPropertyOptional({ type: String, example: '123 Market St', nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ type: String, example: 'San Francisco', nullable: true })
  @IsOptional()
  @IsString()
  city?: string | null;

  @ApiPropertyOptional({ type: String, example: 'CA', nullable: true })
  @IsOptional()
  @IsString()
  state?: string | null;

  @ApiPropertyOptional({ type: String, example: 'United States', nullable: true })
  @IsOptional()
  @IsString()
  country?: string | null;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  owner_id?: number | null;

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: () => [UpdateCompanyChannelDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCompanyChannelDto)
  @ArrayMaxSize(20)
  channels?: UpdateCompanyChannelDto[];

  @ApiPropertyOptional({ type: () => [UpdateCompanyContactDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCompanyContactDto)
  @ArrayMaxSize(50)
  contacts?: UpdateCompanyContactDto[];
}

export class IdNameDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'Name' })
  name!: string;
}

export class OwnerDto {
  @ApiProperty({ type: Number, example: 1 })
  emp_id!: number;

  @ApiProperty({ type: String, example: 'John Doe' })
  name!: string;
}

export class CompanyListItemDto {
  @ApiProperty({ type: Number, example: 1 })
  company_id!: number;

  @ApiProperty({ type: String, example: 'Acme Corp' })
  name!: string;

  @ApiProperty({ type: () => IdNameDto })
  customer_type!: IdNameDto;

  @ApiProperty({ type: () => IdNameDto })
  industry!: IdNameDto;

  @ApiProperty({ type: () => IdNameDto, nullable: true })
  sub_industry!: IdNameDto | null;

  @ApiProperty({ type: String, example: 'San Francisco', nullable: true })
  city!: string | null;

  @ApiProperty({ type: String, example: 'CA', nullable: true })
  state!: string | null;

  @ApiProperty({ type: () => OwnerDto, nullable: true })
  owner!: OwnerDto | null;

  @ApiProperty({ type: String, example: 'contact@acme.com', nullable: true })
  primary_email!: string | null;

  @ApiProperty({ type: String, example: '+1234567890', nullable: true })
  primary_phone!: string | null;

  @ApiProperty({ type: Number, example: 4 })
  contact_count!: number;

  @ApiProperty({ type: Boolean, example: true })
  is_active!: boolean;
}

export class ListCompaniesResponseDto {
  @ApiProperty({ type: () => [CompanyListItemDto] })
  items!: CompanyListItemDto[];

  @ApiPropertyOptional({ type: String, example: 'ZXhhbXBsZQ==', nullable: true })
  next_cursor!: string | null;
}

export class CompanyOptionDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'Acme Corp' })
  name!: string;

  @ApiProperty({ type: String, example: 'San Francisco', nullable: true })
  city!: string | null;
}

export class CompanyDuplicateMatchDto {
  @ApiProperty({ type: Number, example: 1 })
  company_id!: number;

  @ApiProperty({ type: String, example: 'Acme Corp' })
  name!: string;

  @ApiProperty({ type: String, example: 'San Francisco', nullable: true })
  city!: string | null;

  @ApiProperty({ type: String, example: 'Exact name match' })
  reason!: string;
}

export class DepartmentLabelDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'Engineering' })
  label!: string;
}

export class CompanyContactDetailDto {
  @ApiProperty({ type: Number, example: 1 })
  company_person_id!: number;

  @ApiProperty({ type: Number, example: 1 })
  person_id!: number;

  @ApiProperty({ type: String, example: 'Jane Doe' })
  name!: string;

  @ApiProperty({ type: String, example: 'jane@acme.com', nullable: true })
  email!: string | null;

  @ApiProperty({ type: String, example: '+1234567890', nullable: true })
  mobile!: string | null;

  @ApiProperty({ type: String, example: 'https://linkedin.com/in/janedoe', nullable: true })
  linkedin_url!: string | null;

  @ApiProperty({ type: String, example: 'VP Engineering', nullable: true })
  designation!: string | null;

  @ApiProperty({ type: () => DepartmentLabelDto, nullable: true })
  department!: DepartmentLabelDto | null;

  @ApiProperty({ type: Boolean, example: true })
  is_primary!: boolean;

  @ApiProperty({ type: Number, example: null, nullable: true })
  reports_to_company_person_id!: number | null;

  @ApiProperty({ type: Number, example: 2 })
  linked_company_count!: number;
}

export class CompanyChannelDetailDto {
  @ApiProperty({ type: Number, example: 1 })
  channel_id!: number;

  @ApiProperty({ type: String, example: 'website' })
  channel_type!: string;

  @ApiProperty({ type: String, example: 'https://acme.com' })
  value!: string;

  @ApiProperty({ type: String, example: 'Main Website', nullable: true })
  label!: string | null;

  @ApiProperty({ type: Boolean, example: true })
  is_primary!: boolean;
}

export class CompanyDetailResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  company_id!: number;

  @ApiProperty({ type: String, example: 'Acme Corp' })
  name!: string;

  @ApiProperty({ type: () => IdNameDto })
  customer_type!: IdNameDto;

  @ApiProperty({ type: () => IdNameDto })
  industry!: IdNameDto;

  @ApiProperty({ type: () => IdNameDto, nullable: true })
  sub_industry!: IdNameDto | null;

  @ApiProperty({ type: () => IdNameDto, nullable: true })
  parent!: IdNameDto | null;

  @ApiProperty({ type: () => [IdNameDto] })
  children!: IdNameDto[];

  @ApiProperty({ type: String, example: '123 Market St', nullable: true })
  address!: string | null;

  @ApiProperty({ type: String, example: 'San Francisco', nullable: true })
  city!: string | null;

  @ApiProperty({ type: String, example: 'CA', nullable: true })
  state!: string | null;

  @ApiProperty({ type: String, example: 'United States', nullable: true })
  country!: string | null;

  @ApiProperty({ type: () => OwnerDto, nullable: true })
  owner!: OwnerDto | null;

  @ApiProperty({ type: Boolean, example: true })
  is_active!: boolean;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-10-12T10:00:00Z' })
  created_at!: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', example: null, nullable: true })
  updated_at!: Date | null;

  @ApiProperty({ type: () => [CompanyChannelDetailDto] })
  channels!: CompanyChannelDetailDto[];

  @ApiProperty({ type: () => [CompanyContactDetailDto] })
  contacts!: CompanyContactDetailDto[];
}
