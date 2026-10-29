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
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExpenseType {
  OFFICE = 'Office Expense',
  PERSONAL = 'Personal Expense',
}

export enum ClaimStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REIMBURSED = 'REIMBURSED',
}

export enum RejectionReason {
  RECEIPT_MISSING = 'Receipt missing or unclear',
  AMOUNT_MISMATCH = 'Amount does not match receipt',
  NOT_BUSINESS = 'Not a business expense',
  POLICY_DISALLOWED = 'Not allowed under policy',
  ABOVE_LIMIT = 'Above policy limit',
  DUPLICATE = 'Duplicate claim',
  TOO_LATE = 'Submitted too late',
  WRONG_CATEGORY = 'Wrong category or type',
  OTHER = 'Other',
}

export enum PaymentMode {
  BANK_TRANSFER = 'Bank Transfer',
  UPI = 'UPI',
  CASH = 'Cash',
  CHEQUE = 'Cheque',
}

// -----------------------------------------------------------------------------
// Claim Creation & Updates
// -----------------------------------------------------------------------------

export class CreateExpenseClaimDto {
  @ApiProperty({ description: 'Date expense was incurred (YYYY-MM-DD)', example: '2026-10-29' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expense_date must be in YYYY-MM-DD format' })
  expense_date!: string;

  @ApiProperty({ description: 'Expense category ID', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  category_id!: number;

  @ApiProperty({ enum: ExpenseType, example: ExpenseType.OFFICE })
  @IsEnum(ExpenseType)
  expense_type!: ExpenseType;

  @ApiProperty({ description: 'Claim amount in INR (0.01 to 1,000,000.00)', example: 1450.5 })
  @IsNumber()
  @Min(0.01)
  @Max(1000000.0)
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({ description: 'Merchant or vendor name', example: 'Uber India' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  merchant_name?: string;

  @ApiProperty({ description: 'Expense description and business purpose (10 to 500 chars)', example: 'Client visit to South Delhi office for requirement gathering' })
  @IsString()
  @Length(10, 500)
  description!: string;

  @ApiPropertyOptional({ description: 'Submit immediately instead of saving as Draft', default: false })
  @IsOptional()
  @IsBoolean()
  submit_immediately?: boolean;

  @ApiPropertyOptional({ description: 'Attachment IDs uploaded to attachments table', example: [1, 2] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  attachment_ids?: number[];
}

export class UpdateExpenseClaimDto {
  @ApiPropertyOptional({ description: 'Date expense was incurred (YYYY-MM-DD)', example: '2026-10-29' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expense_date must be in YYYY-MM-DD format' })
  expense_date?: string;

  @ApiPropertyOptional({ description: 'Expense category ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  category_id?: number;

  @ApiPropertyOptional({ enum: ExpenseType })
  @IsOptional()
  @IsEnum(ExpenseType)
  expense_type?: ExpenseType;

  @ApiPropertyOptional({ description: 'Claim amount in INR', example: 1450.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1000000.0)
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ description: 'Merchant or vendor name' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  merchant_name?: string;

  @ApiPropertyOptional({ description: 'Expense description (10 to 500 chars)' })
  @IsOptional()
  @IsString()
  @Length(10, 500)
  description?: string;

  @ApiPropertyOptional({ description: 'Attachment IDs' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  attachment_ids?: number[];
}

// -----------------------------------------------------------------------------
// Approver Review
// -----------------------------------------------------------------------------

export class ReviewExpenseClaimDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'], example: 'APPROVE' })
  @IsEnum(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ enum: RejectionReason, description: 'Mandatory if rejecting claim' })
  @IsOptional()
  @IsEnum(RejectionReason)
  rejection_reason?: RejectionReason;

  @ApiPropertyOptional({ description: 'Mandatory if rejecting (min 10 chars); optional if approving' })
  @IsOptional()
  @IsString()
  decision_remarks?: string;

  @ApiPropertyOptional({ description: 'Required to be true if claim has system flags (above limit or duplicate)', default: false })
  @IsOptional()
  @IsBoolean()
  flags_acknowledged?: boolean;
}

// -----------------------------------------------------------------------------
// Admin Reopen
// -----------------------------------------------------------------------------

export class ReopenExpenseClaimDto {
  @ApiPropertyOptional({ description: 'Reason for reopening claim', example: 'Employee provided missing invoice' })
  @IsOptional()
  @IsString()
  @Length(5, 500)
  remarks?: string;

  @ApiPropertyOptional({ enum: ['SUBMITTED', 'DRAFT'], default: 'SUBMITTED' })
  @IsOptional()
  @IsEnum(['SUBMITTED', 'DRAFT'])
  target_status?: 'SUBMITTED' | 'DRAFT';
}

// -----------------------------------------------------------------------------
// Reimbursement
// -----------------------------------------------------------------------------

export class DirectReimbursementDto {
  @ApiProperty({ enum: PaymentMode, example: PaymentMode.BANK_TRANSFER })
  @IsEnum(PaymentMode)
  payment_mode!: PaymentMode;

  @ApiProperty({ description: 'Bank/UPI reference number or cheque number', example: 'IMPS-20261029-987654' })
  @IsString()
  @Length(2, 80)
  payment_reference_no!: string;

  @ApiProperty({ description: 'Payment date (YYYY-MM-DD)', example: '2026-10-29' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'payment_date must be in YYYY-MM-DD format' })
  payment_date!: string;
}

export class PayrollReimbursementDto {
  @ApiPropertyOptional({ description: 'Target payroll run ID to attach to', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  payroll_run_id?: number;
}

// -----------------------------------------------------------------------------
// Expense Reports
// -----------------------------------------------------------------------------

export class ExpenseReportsQueryDto {
  @ApiPropertyOptional({
    description: 'Report type tab',
    enum: ['monthly', 'date_range', 'employee', 'category', 'approvals', 'rejected', 'reimbursement'],
    default: 'monthly',
  })
  @IsOptional()
  @IsString()
  report_type?: string;

  @ApiPropertyOptional({ description: 'Calendar month in YYYY-MM format', example: '2026-10' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ description: 'From date (YYYY-MM-DD)', example: '2026-10-01' })
  @IsOptional()
  @IsString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'To date (YYYY-MM-DD)', example: '2026-10-31' })
  @IsOptional()
  @IsString()
  to_date?: string;

  @ApiPropertyOptional({
    description: 'Date basis for filtering',
    enum: ['EXPENSE_DATE', 'APPROVAL_DATE', 'REIMBURSEMENT_DATE'],
    default: 'EXPENSE_DATE',
  })
  @IsOptional()
  @IsString()
  date_basis?: 'EXPENSE_DATE' | 'APPROVAL_DATE' | 'REIMBURSEMENT_DATE';

  @ApiPropertyOptional({ description: 'Filter by Department ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;

  @ApiPropertyOptional({ description: 'Filter by Employee ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  emp_id?: number;

  @ApiPropertyOptional({ description: 'Filter by Expense Category ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;

  @ApiPropertyOptional({ description: 'Filter by Expense Type name', example: 'Office Expense' })
  @IsOptional()
  @IsString()
  expense_type?: string;

  @ApiPropertyOptional({ description: 'Comma-separated claim statuses (e.g. APPROVED,REIMBURSED)', example: 'APPROVED,REIMBURSED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Breakdown grouping',
    enum: ['category', 'department', 'employee'],
    default: 'category',
  })
  @IsOptional()
  @IsString()
  group_by?: 'category' | 'department' | 'employee';
}


