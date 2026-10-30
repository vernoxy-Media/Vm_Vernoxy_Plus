import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Default currency symbol (e.g. ₹ or $)' })
  @IsOptional()
  @IsString()
  currency?: string;
}
