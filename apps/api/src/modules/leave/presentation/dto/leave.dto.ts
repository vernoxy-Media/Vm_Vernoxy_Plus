import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const trim = ({ value }: { value: any }) => (typeof value === 'string' ? value.trim() : value);

// =============================================================================
// Leave Types
// =============================================================================

export class CreateLeaveTypeDto {
  @ApiProperty({ description: 'Leave Type name (3-50 chars)', example: 'Casual Leave' })
  @Transform(trim)
  @IsString()
  @Length(3, 50, { message: 'Leave Type Name must be 3 to 50 characters.' })
  name!: string;

  @ApiProperty({ description: '2 to 5 capital letters', example: 'CL' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z]{2,5}$/, { message: 'Code must be 2 to 5 capital letters, such as CL.' })
  code!: string;

  @ApiProperty({ description: 'Paid = Full Day in Payroll, Unpaid = LOP' })
  @IsBoolean()
  is_paid!: boolean;

  @ApiProperty({ description: 'Balance tracked (false = "No limit", Unpaid only)' })
  @IsBoolean()
  balance_tracked!: boolean;

  @ApiProperty()
  @IsBoolean()
  half_day_allowed!: boolean;

  @ApiProperty({ description: 'From lookup leave_applies_to', example: 'ALL' })
  @IsString()
  applies_to!: 'ALL' | 'FEMALE_ONLY' | 'MALE_ONLY';

  @ApiProperty({ description: 'From lookup leave_calendar_color', example: 'blue' })
  @IsString()
  calendar_color!: string;

  @ApiPropertyOptional({ description: 'Up to 200 characters' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Description can be up to 200 characters.' })
  description?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

export class UpdateLeaveTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(3, 50, { message: 'Leave Type Name must be 3 to 50 characters.' })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z]{2,5}$/, { message: 'Code must be 2 to 5 capital letters, such as CL.' })
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applies_to?: 'ALL' | 'FEMALE_ONLY' | 'MALE_ONLY';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  calendar_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Description can be up to 200 characters.' })
  description?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

// =============================================================================
// Leave Policies
// =============================================================================

export class LeavePolicyRuleInputDto {
  @ApiProperty()
  @IsInt()
  leave_type_id!: number;

  @ApiPropertyOptional({ description: 'Days per year (0 to 365, steps of 0.5). Empty for "No limit".' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  days_per_year?: number;

  @ApiProperty({ description: 'From lookup leave_credit_frequency' })
  @IsString()
  credit_frequency!: 'YEARLY' | 'MONTHLY' | 'FROM_APPROVED_OT';

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  carry_forward_days?: number;

  @ApiPropertyOptional({ description: 'Most Leave Days one request can cover. Empty = no limit.' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(365)
  max_at_once?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  min_notice_days?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  backdated_days?: number;

  @ApiPropertyOptional({ description: 'Attachment required when longer than these days. Empty = never.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  attachment_after_days?: number;

  @ApiProperty()
  @IsBoolean()
  allowed_during_probation!: boolean;

  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  comp_off_expiry_days?: number;
}

export class CreateLeavePolicyDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(2, 100, { message: 'Policy name must be 2 to 100 characters.' })
  name!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  pro_rata?: boolean;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
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
  @Transform(trim)
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
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  new_name!: string;
}

export class UpdateGeneralSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leave_year_start?: 'JANUARY_TO_DECEMBER' | 'APRIL_TO_MARCH';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  count_sandwich_leave?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  pending_reminder_hours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  approve_after_leave_started?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  year_end_processing?: 'AUTOMATIC' | 'MANUAL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  comp_off_hours_per_day?: number;
}

// =============================================================================
// Apply / preview
// =============================================================================

export class CalculateLeaveDaysDto {
  @ApiProperty()
  @IsInt({ message: 'Please fill this field.' })
  leave_type_id!: number;

  @ApiProperty({ example: '2026-11-06' })
  @IsString()
  @Matches(DATE_RE, { message: 'Please fill this field.' })
  from_date!: string;

  @ApiProperty({ example: '2026-11-09' })
  @IsString()
  @Matches(DATE_RE, { message: 'Please fill this field.' })
  to_date!: string;

  @ApiProperty({ enum: ['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'] })
  @IsEnum(['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'], { message: 'Please fill this field.' })
  duration!: 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';

  @ApiPropertyOptional({ description: 'Admin preview for another employee' })
  @IsOptional()
  @IsInt()
  emp_id?: number;
}

export class ApplyLeaveDto {
  @ApiProperty()
  @IsInt({ message: 'Please fill this field.' })
  leave_type_id!: number;

  @ApiProperty({ example: '2026-11-06' })
  @IsString()
  @Matches(DATE_RE, { message: 'Please fill this field.' })
  from_date!: string;

  @ApiProperty({ example: '2026-11-09' })
  @IsString()
  @Matches(DATE_RE, { message: 'Please fill this field.' })
  to_date!: string;

  @ApiProperty({ enum: ['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'] })
  @IsEnum(['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'], { message: 'Please fill this field.' })
  duration!: 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF';

  @ApiProperty({ description: '10 to 500 characters' })
  @Transform(trim)
  @IsString({ message: 'Please fill this field.' })
  @Length(10, 500, { message: 'Please write a reason of 10 to 500 characters.' })
  reason!: string;

  @ApiPropertyOptional({ description: 'Uploaded file URL (PDF, JPG or PNG up to 5 MB)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachment_url?: string;

  @ApiPropertyOptional({ description: 'Original file name of the attachment' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  attachment_name?: string;
}

export class AddLeaveForEmployeeDto extends ApplyLeaveDto {
  @ApiProperty({ description: 'Active employee for whom the Admin adds leave' })
  @IsInt({ message: 'Please fill this field.' })
  emp_id!: number;

  @ApiPropertyOptional({ description: 'Remarks to the employee' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}

// =============================================================================
// Decisions
// =============================================================================

export class ReviewLeaveRequestDto {
  @ApiPropertyOptional({ description: 'Optional to approve, required to reject' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, { message: 'Remarks can be up to 500 characters.' })
  remarks?: string;
}

export class WithdrawLeaveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RequestCancellationDto {
  @ApiProperty({ description: '10 to 500 characters' })
  @Transform(trim)
  @IsString()
  @Length(10, 500, { message: 'Please write a reason of 10 to 500 characters.' })
  cancellation_reason!: string;
}

export class DecideCancellationDto {
  @ApiProperty({ description: 'true = Agree to cancel; false = Keep leave' })
  @IsBoolean()
  agree!: boolean;

  @ApiPropertyOptional({ description: 'Required to keep the leave' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  remarks?: string;
}

export class AdminCancelLeaveDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(3, 500, { message: 'Please write a reason (3 to 500 characters).' })
  reason!: string;
}

// =============================================================================
// Balances
// =============================================================================

export class AdjustBalanceDto {
  @ApiProperty()
  @IsInt()
  emp_id!: number;

  @ApiProperty()
  @IsInt()
  leave_type_id!: number;

  @ApiProperty({ enum: ['CREDIT', 'DEBIT'] })
  @IsIn(['CREDIT', 'DEBIT'])
  direction!: 'CREDIT' | 'DEBIT';

  @ApiProperty({ description: '0.5 to 365 in steps of 0.5' })
  @IsNumber()
  @Min(0.5, { message: 'Days must be 0.5 to 365, in steps of 0.5.' })
  @Max(365, { message: 'Days must be 0.5 to 365, in steps of 0.5.' })
  days!: number;

  @ApiProperty({ description: '10 to 500 characters' })
  @Transform(trim)
  @IsString()
  @Length(10, 500, { message: 'Please write a note of 10 to 500 characters.' })
  note!: string;

  @ApiPropertyOptional({ description: 'Leave year (defaults to the current one)' })
  @IsOptional()
  @IsInt()
  leave_year?: number;
}

export class BulkAdjustBalanceDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Please choose at least one employee.' })
  @IsInt({ each: true })
  emp_ids!: number[];

  @ApiProperty()
  @IsInt()
  leave_type_id!: number;

  @ApiProperty({ description: '0.5 to 365 in steps of 0.5' })
  @IsNumber()
  @Min(0.5)
  @Max(365)
  days!: number;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(10, 500, { message: 'Please write a note of 10 to 500 characters.' })
  note!: string;
}

export class SetOpeningBalanceDto {
  @ApiProperty()
  @IsInt()
  emp_id!: number;

  @ApiProperty()
  @IsInt()
  leave_type_id!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(365)
  opening_balance!: number;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @Length(10, 500, { message: 'Please write a note of 10 to 500 characters.' })
  note!: string;
}

export class YearEndDto {
  @ApiProperty({ description: 'The leave year to close' })
  @IsInt()
  leave_year!: number;
}

export class AssignEmployeePolicyDto {
  @ApiProperty()
  @IsInt()
  policy_id!: number;
}

// =============================================================================
// Queries
// =============================================================================

export class LeaveRequestsQueryDto {
  @IsOptional() @IsString() tab?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() leave_type_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() department_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() employee_id?: number;
  @IsOptional() @Matches(DATE_RE) from_date?: string;
  @IsOptional() @Matches(DATE_RE) to_date?: string;
  @IsOptional() @IsString() counter?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) page_size?: number;
  @IsOptional() @IsString() format?: string;
}

export class LeaveReportsQueryDto {
  @IsOptional() @IsString() report_type?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}$/) month?: string;
  @IsOptional() @Matches(DATE_RE) from_date?: string;
  @IsOptional() @Matches(DATE_RE) to_date?: string;
  @IsOptional() @Matches(DATE_RE) on_date?: string;
  @IsOptional() @Type(() => Number) @IsInt() leave_type_id?: number;
  @IsOptional() @IsString() paid_unpaid?: string;
  @IsOptional() @Type(() => Number) @IsInt() department_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() employee_id?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() group_by?: string;
  @IsOptional() @IsString() format?: string;
}
