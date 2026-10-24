import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEmail,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({ example: 'Acme Engineering Pvt Ltd', description: 'Company name' })
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  company_name!: string;

  @ApiPropertyOptional({ example: 2, description: 'Number of branches' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  no_of_branches?: number;

  @ApiPropertyOptional({ example: 1, description: 'Number of manufacturing plants' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  no_of_plants?: number;

  @ApiPropertyOptional({ example: 'Plot 42, GIDC Phase 2, Vatva', description: 'Full address' })
  @IsOptional()
  @IsString()
  full_address?: string;

  @ApiPropertyOptional({ example: 'Ahmedabad', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Gujarat', description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Country', default: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '382445', description: 'Postal/PIN code' })
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({ example: 'https://maps.google.com/?q=23.0,72.5', description: 'Google maps link' })
  @IsOptional()
  @IsString()
  google_maps_url?: string;

  @ApiPropertyOptional({ example: true, description: 'Is inside GIDC estate' })
  @IsOptional()
  @IsBoolean()
  is_gidc?: boolean;

  @ApiPropertyOptional({ example: 'Vatva GIDC', description: 'GIDC name if inside GIDC' })
  @IsOptional()
  @IsString()
  gidc_name?: string;

  @ApiPropertyOptional({ example: 'Phase II', description: 'GIDC Area / Phase' })
  @IsOptional()
  @IsString()
  gidc_area_phase?: string;

  @ApiPropertyOptional({ example: 'Rajesh Patel', description: 'Contact person name' })
  @IsOptional()
  @IsString()
  contact_person?: string;

  @ApiPropertyOptional({ example: 'Managing Director', description: 'Designation' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ example: '9876543210', description: '10-digit mobile number' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ example: 'rajesh@acmeeng.com', description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({ example: 'Manufacturer', description: 'Nature of Business' })
  @IsOptional()
  @IsString()
  nature_of_business?: string;

  @ApiPropertyOptional({ example: 'Engineering and Machinery', description: 'Industry name' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 6, description: 'Industry ID if mapped' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  industry_id?: number;

  @ApiPropertyOptional({ example: 'CNC Precision Components, Hydraulic Valves', description: 'Products / Services offered' })
  @IsOptional()
  @IsString()
  products_services?: string;

  @ApiPropertyOptional({ example: 45, description: 'Estimated employee count' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimated_employees?: number;

  @ApiPropertyOptional({ example: 50000000, description: 'Estimated annual turnover in INR' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimated_turnover?: number;

  @ApiPropertyOptional({ example: 2012, description: 'Year established YYYY' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1800)
  @Max(2100)
  year_established?: number;

  @ApiPropertyOptional({ example: 'Tata Motors, L&T, BHEL', description: 'Existing Major Clients' })
  @IsOptional()
  @IsString()
  existing_major_clients?: string;

  @ApiPropertyOptional({ example: 'https://acmeeng.com', description: 'Website URL' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: 'Good', description: 'Website quality', enum: ['Good', 'Average', 'Poor', 'No Website'] })
  @IsOptional()
  @IsIn(['Good', 'Average', 'Poor', 'No Website', ''])
  website_quality?: string;

  @ApiPropertyOptional({ example: 'WordPress / Local Agency', description: 'Developed By' })
  @IsOptional()
  @IsString()
  developed_by?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/company/acmeeng', description: 'LinkedIn URL' })
  @IsOptional()
  @IsString()
  linkedin_url?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/acmeeng', description: 'Instagram URL' })
  @IsOptional()
  @IsString()
  instagram_url?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/acmeeng', description: 'Facebook URL' })
  @IsOptional()
  @IsString()
  facebook_url?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/@acmeeng', description: 'YouTube URL' })
  @IsOptional()
  @IsString()
  youtube_url?: string;

  @ApiPropertyOptional({ example: 'https://business.google.com/acmeeng', description: 'Google Business Profile URL' })
  @IsOptional()
  @IsString()
  google_business_profile_url?: string;

  @ApiPropertyOptional({ example: 'https://storage.../brochure.pdf', description: 'Brochure file URL' })
  @IsOptional()
  @IsString()
  brochure_url?: string;

  @ApiProperty({ example: 'Cold calling', description: 'Lead source', default: 'Cold calling' })
  @IsString()
  @IsNotEmpty({ message: 'Lead source is required' })
  lead_source!: string;

  @ApiPropertyOptional({ example: 1, description: 'Sales user employee ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lead_by_id?: number;

  @ApiProperty({ example: 'Web Development', description: 'Service fit master' })
  @IsString()
  @IsNotEmpty({ message: 'Service fit is required' })
  service_fit!: string;

  @ApiPropertyOptional({ example: 'New', description: 'Pipeline stage / status', default: 'New' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateLeadDto extends CreateLeadDto {}

export class UpdateLeadStageDto {
  @ApiProperty({ example: 'Qualified', description: 'Target stage or status name' })
  @IsString()
  @IsNotEmpty()
  status!: string;

  @ApiPropertyOptional({ example: 'Price too high', description: 'Lost reason if status is Lost' })
  @IsOptional()
  @IsString()
  lost_reason?: string;

  @ApiPropertyOptional({ example: 500000, description: 'Actual deal value if converted/won' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  actual_value?: number;
}

export class ListLeadsQueryDto {
  @ApiPropertyOptional({ description: 'Search term across company, contact, email, phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by specific stage: New, Contacted, Qualified, Converted, Lost, On Hold' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by GIDC flag' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_gidc?: boolean;

  @ApiPropertyOptional({ description: 'Filter by GIDC name' })
  @IsOptional()
  @IsString()
  gidc_name?: string;

  @ApiPropertyOptional({ description: 'Filter by lead source' })
  @IsOptional()
  @IsString()
  lead_source?: string;

  @ApiPropertyOptional({ description: 'Filter by sales user employee ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lead_by_id?: number;

  @ApiPropertyOptional({ description: 'Filter by service fit' })
  @IsOptional()
  @IsString()
  service_fit?: string;
}
