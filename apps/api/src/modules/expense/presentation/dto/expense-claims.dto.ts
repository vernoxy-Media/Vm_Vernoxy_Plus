import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

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

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const toBool = ({ value }: { value: any }) => value === true || value === 'true' || value === '1';

// -----------------------------------------------------------------------------
// Screen 2: Add Expense. A Draft needs only the Expense Date (BFD 4 Part 1).
// The "Stops" of BFD 4 Part 3 are checked in the service on submit.
// -----------------------------------------------------------------------------

export class SaveClaimDto {
  @ApiPropertyOptional({ example: '2026-10-22' })
  @IsOptional()
  @Matches(DATE, { message: 'Please fill this field.' })
  expense_date?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  category_id?: number | null;

  @ApiPropertyOptional({ enum: ExpenseType })
  @IsOptional()
  @IsIn([ExpenseType.OFFICE, ExpenseType.PERSONAL], { message: 'Please choose Office Expense or Personal Expense.' })
  expense_type?: string | null;

  @ApiPropertyOptional({ example: 640 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Please enter an amount more than 0.' })
  @Type(() => Number)
  amount?: number | null;

  @ApiPropertyOptional({ example: 'Uber India' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Merchant / Paid to can be up to 100 characters.' })
  merchant_name?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'The description can be up to 500 characters.' })
  description?: string | null;

  @ApiPropertyOptional({ description: 'Receipts uploaded to /attachments/upload (entity_type EXPENSE_CLAIM). Omit to keep the current ones.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Only PDF, JPG or PNG up to 5 MB, up to 5 files.' })
  @IsInt({ each: true })
  @Type(() => Number)
  attachment_ids?: number[];

  @ApiPropertyOptional({ description: 'Submit Claim instead of Save as Draft' })
  @IsOptional()
  @IsBoolean()
  submit?: boolean;

  @ApiPropertyOptional({ description: 'The employee answered "Submit anyway?" for the flags' })
  @IsOptional()
  @IsBoolean()
  confirm_flags?: boolean;

  @ApiPropertyOptional({ description: 'Set by "Copy to new claim"' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  copied_from_claim_id?: number;
}

export class SubmitClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  confirm_flags?: boolean;
}

export class WithdrawClaimDto {
  @ApiPropertyOptional({ description: 'Optional reason, up to 300 characters' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class MyClaimsQueryDto {
  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @Matches(MONTH)
  month?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(DATE)
  from_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(DATE)
  to_date?: string;

  @ApiPropertyOptional({ enum: ClaimStatus })
  @IsOptional()
  @IsIn(Object.values(ClaimStatus))
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  category_id?: number;

  @ApiPropertyOptional({ enum: ExpenseType })
  @IsOptional()
  @IsString()
  expense_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;
}

// -----------------------------------------------------------------------------
// Screen 3: Expense Claims
// -----------------------------------------------------------------------------

export class ClaimsListQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'all'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'all'])
  tab?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) emp_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) department_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) category_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expense_type?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE) from_date?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE) to_date?: string;
  @ApiPropertyOptional({ description: 'Claim No. or employee name' }) @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(toBool) @IsBoolean() export?: boolean;
}

// -----------------------------------------------------------------------------
// Section 7: Approve / Reject / Reopen
// -----------------------------------------------------------------------------

export class ApproveClaimDto {
  @ApiPropertyOptional({ description: 'Optional remarks, up to 500 characters' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Remarks can be up to 500 characters.' })
  remarks?: string;

  @ApiPropertyOptional({ description: '"I have checked the flags" — required when the claim has a flag' })
  @IsOptional()
  @IsBoolean()
  flags_acknowledged?: boolean;
}

export class RejectClaimDto {
  @ApiProperty({ description: 'Code from the expense_rejection_reason lookup' })
  @IsString()
  @Length(1, 50, { message: 'Please choose the reason.' })
  reason_code!: string;

  @ApiProperty({ description: '10 to 500 characters' })
  @IsString()
  @Length(10, 500, { message: 'Please write at least 10 characters so the employee knows what to fix.' })
  remarks!: string;
}

export class ReopenExpenseClaimDto {
  @ApiProperty({ description: 'Why the approval is reopened' })
  @IsString()
  @Length(10, 500, { message: 'Please write at least 10 characters.' })
  reason!: string;
}

// -----------------------------------------------------------------------------
// Section 8: Reimbursement
// -----------------------------------------------------------------------------

export class RecordPaymentDto {
  @ApiProperty({ description: 'Approved claims of one employee', example: [12, 13] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Please select at least one claim.' })
  @IsInt({ each: true })
  @Type(() => Number)
  claim_ids!: number[];

  @ApiProperty({ example: '2026-11-05' })
  @Matches(DATE, { message: 'Please fill this field.' })
  payment_date!: string;

  @ApiProperty({ description: 'Code from the expense_payment_mode lookup' })
  @IsString()
  @Length(1, 50, { message: 'Please choose the payment mode.' })
  payment_mode_code!: string;

  @ApiProperty({ example: 'IMPS-20261105-987654' })
  @IsString()
  @Length(1, 80, { message: 'Please fill this field.' })
  payment_reference_no!: string;
}

export class PayrollReimbursementDto {
  @ApiProperty()
  @IsArray()
  @ArrayMinSize(1, { message: 'Please select at least one claim.' })
  @IsInt({ each: true })
  @Type(() => Number)
  claim_ids!: number[];

  @ApiProperty({ description: 'A Draft payroll run' })
  @IsInt({ message: 'Please choose a Payroll Month.' })
  @Min(1)
  @Type(() => Number)
  payroll_run_id!: number;
}

// -----------------------------------------------------------------------------
// Section 11: Expense Reports
// -----------------------------------------------------------------------------

export class ExpenseReportsQueryDto {
  @ApiPropertyOptional({ enum: ['monthly', 'date_range', 'employee', 'category', 'approvals', 'rejected', 'reimbursement'] })
  @IsOptional()
  @IsString()
  report_type?: string;

  @ApiPropertyOptional({ example: '2026-10' }) @IsOptional() @Matches(MONTH) month?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE) from_date?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE) to_date?: string;

  @ApiPropertyOptional({ enum: ['EXPENSE_DATE', 'APPROVAL_DATE', 'REIMBURSEMENT_DATE'] })
  @IsOptional()
  @IsIn(['EXPENSE_DATE', 'APPROVAL_DATE', 'REIMBURSEMENT_DATE'])
  date_basis?: 'EXPENSE_DATE' | 'APPROVAL_DATE' | 'REIMBURSEMENT_DATE';

  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) department_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) emp_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) category_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expense_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;

  @ApiPropertyOptional({ enum: ['category', 'department', 'employee'] })
  @IsOptional()
  @IsIn(['category', 'department', 'employee'])
  group_by?: 'category' | 'department' | 'employee';
}
