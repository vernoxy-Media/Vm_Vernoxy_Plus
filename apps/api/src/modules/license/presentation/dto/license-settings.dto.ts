import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateBillingCycleDto {
  @ApiProperty({ description: 'Name shown in the Billing Cycle list, e.g. "8 Months"' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['FIXED', 'TERM', 'ONE_TIME'], description: 'FIXED: one term lasts `months`; TERM: length from the term dates (Multi-year); ONE_TIME: no renewal' })
  @IsIn(['FIXED', 'TERM', 'ONE_TIME'], { message: 'Choose how long one term of this cycle lasts.' })
  kind!: 'FIXED' | 'TERM' | 'ONE_TIME';

  @ApiPropertyOptional({ description: 'Length of one term in months (FIXED only), 1 to 120' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  months?: number | null;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateBillingCycleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ enum: ['FIXED', 'TERM', 'ONE_TIME'] })
  @IsOptional()
  @IsIn(['FIXED', 'TERM', 'ONE_TIME'], { message: 'Choose how long one term of this cycle lasts.' })
  kind?: 'FIXED' | 'TERM' | 'ONE_TIME';
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(120) months?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() display_order?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateVendorDto {
  @ApiProperty({ description: 'Vendor/Publisher name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateVendorDto {
  @ApiPropertyOptional({ description: 'Vendor/Publisher name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateReasonDto {
  @ApiProperty({ description: 'Reason name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateReasonDto {
  @ApiPropertyOptional({ description: 'Reason name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ description: 'Active flag' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class AddManagerDto {
  @ApiProperty({ description: 'Employee ID to appoint as Software License Manager' })
  @IsInt()
  emp_id!: number;
}

export class UpdateLicenseSettingsDto {
  @ApiPropertyOptional({ description: 'Expiry reminder window days (default 30)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  reminder_window_days?: number;

  @ApiPropertyOptional({ description: 'Milestone reminder days array [30, 15, 7, 1]' })
  @IsOptional()
  @IsArray()
  reminder_days?: number[];

  @ApiPropertyOptional({ description: 'Auto-remind finance & accounts' })
  @IsOptional()
  @IsBoolean()
  remind_accounts?: boolean;

  @ApiPropertyOptional({ description: 'Send weekly renewal summary' })
  @IsOptional()
  @IsBoolean()
  weekly_renewal_summary?: boolean;

  @ApiPropertyOptional({ description: 'Unused seat flag threshold days' })
  @IsOptional()
  @IsInt()
  unused_seat_flag_days?: number;

  @ApiPropertyOptional({ description: 'Recovery reminder cadence days' })
  @IsOptional()
  @IsInt()
  recovery_reminder_days?: number;

  @ApiPropertyOptional({ description: 'Maximum trial period days' })
  @IsOptional()
  @IsInt()
  max_trial_days?: number;

  @ApiPropertyOptional({ description: 'License Types switched off (BFD 11)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabled_license_types?: string[];

  @ApiPropertyOptional({ description: 'Default currency symbol (e.g. ₹ or $)' })
  @IsOptional()
  @IsString()
  currency?: string;
}
