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
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AllowedExpenseType {
  OFFICE = 'OFFICE',
  PERSONAL = 'PERSONAL',
  BOTH = 'BOTH',
}

export enum ReceiptRule {
  ALWAYS = 'ALWAYS',
  ABOVE_THRESHOLD = 'ABOVE_THRESHOLD',
}

export enum AfterClaimWindowAction {
  FLAG_AS_LATE = 'FLAG_AS_LATE',
  STOP_SUBMISSION = 'STOP_SUBMISSION',
}

export enum DefaultReimbursementMethod {
  DIRECT = 'DIRECT',
  PAYROLL = 'PAYROLL',
}

// -----------------------------------------------------------------------------
// Expense Categories DTOs
// -----------------------------------------------------------------------------

export class CreateExpenseCategoryDto {
  @ApiProperty({ description: 'Category name (1-100 characters)', example: 'Travel – Local Conveyance' })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({ description: 'Optional category code', example: 'TRAVEL_LOCAL' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  code?: string;

  @ApiProperty({ enum: AllowedExpenseType, default: AllowedExpenseType.BOTH })
  @IsEnum(AllowedExpenseType)
  allowed_type!: AllowedExpenseType;

  @ApiPropertyOptional({ description: 'Limit per single claim in INR (null or omitted = No limit)', example: 1500 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  @Type(() => Number)
  limit_per_claim?: number | null;

  @ApiProperty({ enum: ReceiptRule, default: ReceiptRule.ABOVE_THRESHOLD })
  @IsEnum(ReceiptRule)
  receipt_rule!: ReceiptRule;

  @ApiPropertyOptional({ description: 'Receipt threshold amount (default 500)', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  receipt_threshold_amount?: number;

  @ApiPropertyOptional({ description: 'Category active status', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Display sorting order', default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  display_order?: number;
}

export class UpdateExpenseCategoryDto {
  @ApiPropertyOptional({ description: 'Category name', example: 'Travel – Local Conveyance' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Optional category code', example: 'TRAVEL_LOCAL' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  code?: string;

  @ApiPropertyOptional({ enum: AllowedExpenseType })
  @IsOptional()
  @IsEnum(AllowedExpenseType)
  allowed_type?: AllowedExpenseType;

  @ApiPropertyOptional({ description: 'Limit per single claim in INR (null = No limit)', example: 1500 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  @Type(() => Number)
  limit_per_claim?: number | null;

  @ApiPropertyOptional({ enum: ReceiptRule })
  @IsOptional()
  @IsEnum(ReceiptRule)
  receipt_rule?: ReceiptRule;

  @ApiPropertyOptional({ description: 'Receipt threshold amount', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  receipt_threshold_amount?: number;

  @ApiPropertyOptional({ description: 'Category active status' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Display sorting order' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  display_order?: number;
}

// -----------------------------------------------------------------------------
// Expense General Settings DTOs
// -----------------------------------------------------------------------------

export class UpdateExpenseGeneralSettingsDto {
  @ApiPropertyOptional({ description: 'Claim window in days (1 to 365)', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  claim_window_days?: number;

  @ApiPropertyOptional({ enum: AfterClaimWindowAction, default: AfterClaimWindowAction.FLAG_AS_LATE })
  @IsOptional()
  @IsEnum(AfterClaimWindowAction)
  after_claim_window_action?: AfterClaimWindowAction;

  @ApiPropertyOptional({ description: 'Enable duplicate check across claims', default: true })
  @IsOptional()
  @IsBoolean()
  duplicate_check_enabled?: boolean;

  @ApiPropertyOptional({ enum: DefaultReimbursementMethod, default: DefaultReimbursementMethod.DIRECT })
  @IsOptional()
  @IsEnum(DefaultReimbursementMethod)
  default_reimbursement_method?: DefaultReimbursementMethod;

  @ApiPropertyOptional({ description: 'Days before reminding approver (1 to 30)', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  approver_reminder_days?: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'INR' })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  currency?: string;
}

// -----------------------------------------------------------------------------
// Expense Authorised Approver DTOs
// -----------------------------------------------------------------------------

export class AssignAuthorisedApproverDto {
  @ApiProperty({ description: 'Department ID', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  department_id!: number;

  @ApiProperty({ description: 'Approver Employee ID', example: 10 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  approver_emp_id!: number;
}

// -----------------------------------------------------------------------------
// Expense Types (Master Data) DTOs
// -----------------------------------------------------------------------------

export class CreateExpenseTypeDto {
  @ApiProperty({ description: 'Expense Type Name', example: 'Office Expense' })
  @IsString()
  @Length(1, 50)
  name!: string;

  @ApiProperty({ description: 'Unique code', example: 'OFFICE' })
  @IsString()
  @Length(1, 20)
  code!: string;

  @ApiPropertyOptional({ description: 'Type description' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Display order', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  display_order?: number;
}

export class UpdateExpenseTypeDto {
  @ApiPropertyOptional({ description: 'Expense Type Name' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @ApiPropertyOptional({ description: 'Unique code' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  code?: string;

  @ApiPropertyOptional({ description: 'Type description' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  display_order?: number;
}


