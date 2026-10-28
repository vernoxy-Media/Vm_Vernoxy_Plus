import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
  Max,
  Length,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLeaveTypeDto {
  @ApiProperty({ description: 'Leave Type name (3-50 chars)', example: 'Casual Leave' })
  @IsString()
  @Length(3, 50)
  name!: string;

  @ApiProperty({ description: '2 to 5 capital letters', example: 'CL' })
  @IsString()
  @Length(2, 5)
  code!: string;

  @ApiProperty({ description: 'Paid = Full Day in Payroll, Unpaid = LOP', default: true })
  @IsBoolean()
  is_paid!: boolean;

  @ApiProperty({ description: 'Balance tracked (false only if unpaid)', default: true })
  @IsBoolean()
  balance_tracked!: boolean;

  @ApiProperty({ description: 'Whether half-days are allowed', default: true })
  @IsBoolean()
  half_day_allowed!: boolean;

  @ApiProperty({ enum: ['ALL', 'FEMALE_ONLY', 'MALE_ONLY'], default: 'ALL' })
  @IsEnum(['ALL', 'FEMALE_ONLY', 'MALE_ONLY'])
  applies_to!: 'ALL' | 'FEMALE_ONLY' | 'MALE_ONLY';

  @ApiProperty({ description: 'Color in calendars', example: 'blue' })
  @IsString()
  calendar_color!: string;

  @ApiPropertyOptional({ description: 'Description (up to 200 chars)' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class UpdateLeaveTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 5)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_paid?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  balance_tracked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  half_day_allowed?: boolean;

  @ApiPropertyOptional({ enum: ['ALL', 'FEMALE_ONLY', 'MALE_ONLY'] })
  @IsOptional()
  @IsEnum(['ALL', 'FEMALE_ONLY', 'MALE_ONLY'])
  applies_to?: 'ALL' | 'FEMALE_ONLY' | 'MALE_ONLY';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  calendar_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class LeavePolicyRuleInputDto {
  @ApiProperty()
  @IsInt()
  leave_type_id!: number;

  @ApiPropertyOptional({ description: 'Days per year (0 to 365, null for No limit)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  days_per_year?: number;

  @ApiProperty({ enum: ['YEARLY', 'MONTHLY', 'FROM_APPROVED_OT'] })
  @IsEnum(['YEARLY', 'MONTHLY', 'FROM_APPROVED_OT'])
  credit_frequency!: 'YEARLY' | 'MONTHLY' | 'FROM_APPROVED_OT';

  @ApiPropertyOptional({ description: 'Carry forward max days', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carry_forward_days?: number;

  @ApiPropertyOptional({ description: 'Max days at once' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  max_at_once?: number;

  @ApiPropertyOptional({ description: 'Notice days required before start', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  min_notice_days?: number;

  @ApiPropertyOptional({ description: 'Backdated days allowed', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  backdated_days?: number;

  @ApiPropertyOptional({ description: 'Attachment required after days' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  attachment_after_days?: number;

  @ApiProperty({ description: 'Allowed during probation', default: true })
  @IsBoolean()
  allowed_during_probation!: boolean;

  @ApiPropertyOptional({ description: 'Comp-off expiry days', default: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  comp_off_expiry_days?: number;
}

export class CreateLeavePolicyDto {
  @ApiProperty({ description: 'Policy name (unique)' })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  pro_rata?: boolean;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiProperty({ type: [LeavePolicyRuleInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeavePolicyRuleInputDto)
  rules!: LeavePolicyRuleInputDto[];
}

export class UpdateLeavePolicyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pro_rata?: boolean;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional({ type: [LeavePolicyRuleInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeavePolicyRuleInputDto)
  rules?: LeavePolicyRuleInputDto[];
}

export class CopyLeavePolicyDto {
  @ApiProperty({ description: 'Name of the copied policy' })
  @IsString()
  @Length(2, 100)
  new_name!: string;
}

export class UpdateGeneralSettingsDto {
  @ApiPropertyOptional({ enum: ['JANUARY_TO_DECEMBER', 'APRIL_TO_MARCH'] })
  @IsOptional()
  @IsEnum(['JANUARY_TO_DECEMBER', 'APRIL_TO_MARCH'])
  leave_year_start?: 'JANUARY_TO_DECEMBER' | 'APRIL_TO_MARCH';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  count_sandwich_leave?: boolean;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pending_reminder_hours?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  approve_after_leave_started?: boolean;

  @ApiPropertyOptional({ enum: ['AUTOMATIC', 'MANUAL'] })
  @IsOptional()
  @IsEnum(['AUTOMATIC', 'MANUAL'])
  year_end_processing?: 'AUTOMATIC' | 'MANUAL';

  @ApiPropertyOptional({ default: 8.00 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  comp_off_hours_per_day?: number;
}

export class CalculateLeaveDaysDto {
  @ApiProperty()
  @IsInt()
  leave_type_id!: number;

  @ApiProperty({ example: '2026-11-06' })
  @IsString()
  from_date!: string;

  @ApiProperty({ example: '2026-11-09' })
  @IsString()
  to_date!: string;

  @ApiProperty({ enum: ['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'], default: 'FULL_DAY' })
  @IsEnum(['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'])
  duration!: 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';
}

export class ApplyLeaveDto extends CalculateLeaveDaysDto {
  @ApiProperty({ description: 'Reason for leave (10 to 500 characters)' })
  @IsString()
  @Length(10, 500)
  reason!: string;

  @ApiPropertyOptional({ description: 'Attachment URL (PDF, JPG, PNG)' })
  @IsOptional()
  @IsString()
  attachment_url?: string;
}

export class AddLeaveForEmployeeDto extends ApplyLeaveDto {
  @ApiProperty({ description: 'Employee ID for whom Admin is adding leave' })
  @IsInt()
  emp_id!: number;
}

export class ReviewLeaveRequestDto {
  @ApiPropertyOptional({ description: 'Remarks (optional for approve, required for reject)' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  remarks?: string;
}

export class RequestCancellationDto {
  @ApiProperty({ description: 'Reason for cancellation (10 to 500 characters)' })
  @IsString()
  @Length(10, 500)
  cancellation_reason!: string;
}

export class DecideCancellationDto {
  @ApiProperty({ description: 'true = Agree to cancel (status Cancelled); false = Keep leave (status Approved)' })
  @IsBoolean()
  agree!: boolean;

  @ApiProperty({ description: 'Remarks by Admin' })
  @IsString()
  @Length(1, 500)
  remarks!: string;
}

export class AdminCancelLeaveDto {
  @ApiProperty({ description: 'Reason for cancellation (required)' })
  @IsString()
  @Length(1, 500)
  reason!: string;
}

export class AdjustBalanceDto {
  @ApiProperty()
  @IsInt()
  emp_id!: number;

  @ApiProperty()
  @IsInt()
  leave_type_id!: number;

  @ApiProperty({ enum: ['CREDIT', 'DEBIT'] })
  @IsEnum(['CREDIT', 'DEBIT'])
  direction!: 'CREDIT' | 'DEBIT';

  @ApiProperty({ description: 'Days to adjust (0.5 to 365 in 0.5 steps)' })
  @IsNumber()
  @Min(0.5)
  @Max(365)
  days!: number;

  @ApiProperty({ description: 'Mandatory reason note (10 to 500 characters)' })
  @IsString()
  @Length(10, 500)
  note!: string;
}
