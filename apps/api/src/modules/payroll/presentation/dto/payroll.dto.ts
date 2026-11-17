import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class StartPayrollDto {
  @ApiProperty({ example: 9 }) @IsInt() @Min(1) @Max(12) @Type(() => Number) payroll_month!: number;
  @ApiProperty({ example: 2026 }) @IsInt() @Min(2020) @Max(2100) @Type(() => Number) payroll_year!: number;
}

export const DAY_ADJUSTMENT_REASONS = [
  'Attendance correction after month lock',
  'Approved work outside office',
  'Management approval (paid absence)',
  'Penalty',
  'Other',
];

export class DayAdjustmentDto {
  @ApiProperty({ enum: ['FULL', 'HALF', 'UNPAID'] })
  @IsEnum(['FULL', 'HALF', 'UNPAID'], { message: 'Please fill this field.' })
  pay_this_day_as!: 'FULL' | 'HALF' | 'UNPAID';

  @ApiProperty({ enum: DAY_ADJUSTMENT_REASONS })
  @IsIn(DAY_ADJUSTMENT_REASONS, { message: 'Please fill this field.' })
  reason!: string;

  @ApiProperty({ description: '10 to 250 characters' })
  @IsString()
  @Length(10, 250, { message: 'Please write at least 10 characters.' })
  note!: string;
}

export class RemoveWithReasonDto {
  @ApiProperty({ description: '10 to 250 characters' })
  @IsString()
  @Length(10, 250, { message: 'Please write at least 10 characters.' })
  reason!: string;
}

export class AddAdjustmentDto {
  @ApiProperty({ enum: ['ADDITION', 'DEDUCTION'] })
  @IsEnum(['ADDITION', 'DEDUCTION'], { message: 'Please fill this field.' })
  kind!: 'ADDITION' | 'DEDUCTION';

  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) category_id?: number;
  @ApiPropertyOptional({ description: 'Category code, used when category_id is not given' }) @IsOptional() @IsString() category_code?: string;

  @ApiProperty({ example: 2000 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Please enter an amount more than 0.' })
  @Min(0.01, { message: 'Please enter an amount more than 0.' })
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional() @IsOptional() @Matches(DATE) related_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference_number?: string;

  @ApiProperty({ description: '10 to 250 characters' })
  @IsString()
  @Length(10, 250, { message: 'Please write at least 10 characters.' })
  reason!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() attachment_url?: string;
}

export class ApproveOtDto {
  @ApiProperty({ enum: ['APPROVED', 'REDUCED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REDUCED', 'REJECTED'])
  status!: 'APPROVED' | 'REDUCED' | 'REJECTED';

  @ApiPropertyOptional({ example: 4.5 }) @IsOptional() @IsNumber() @Min(0) @Type(() => Number) approved_hours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(250) comment?: string;
}

export class BatchApproveOtDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  ot_entry_ids!: number[];
}

export class LockPayrollDto {
  @ApiProperty({ description: '"I have checked the Payroll Register and the warnings"' })
  @IsBoolean()
  confirmed!: boolean;
}

export class UnlockPayrollDto {
  @ApiProperty({ description: '10 to 250 characters' })
  @IsString()
  @Length(10, 250, { message: 'Please write at least 10 characters.' })
  reason!: string;
}

export class MarkPaidDto {
  @ApiProperty({ example: '2026-10-07' }) @Matches(DATE, { message: 'Please fill this field.' }) payment_date!: string;
  @ApiPropertyOptional({ type: [Number], description: 'Employees paid; all unpaid when omitted' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  emp_ids?: number[];
  @ApiPropertyOptional({ description: 'Batch reference for bank transfers' }) @IsOptional() @IsString() @MaxLength(100) batch_reference?: string;
  @ApiPropertyOptional({ description: 'Cheque number per emp_id' }) @IsOptional() @IsObject() cheque_numbers?: Record<string, string>;
  @ApiPropertyOptional({ description: 'Reference for cash payments' }) @IsOptional() @IsString() @MaxLength(100) cash_reference?: string;
}

export class UpdatePayrollSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) default_employee_pf_pct?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) default_employer_pf_pct?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() apply_pf_wage_limit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01, { message: 'The PF Wage Limit must be more than 0.' }) pf_wage_limit?: number;
  @ApiPropertyOptional({ enum: ['UNPAID', 'FULL'] }) @IsOptional() @IsEnum(['UNPAID', 'FULL']) missing_punch_default?: 'UNPAID' | 'FULL';
  @ApiPropertyOptional({ enum: ['NONE', 'FIFTEEN', 'THIRTY'] }) @IsOptional() @IsEnum(['NONE', 'FIFTEEN', 'THIRTY']) ot_rounding?: 'NONE' | 'FIFTEEN' | 'THIRTY';
  @ApiPropertyOptional({ enum: ['NEAREST_RUPEE', 'NONE'] }) @IsOptional() @IsEnum(['NEAREST_RUPEE', 'NONE']) total_salary_rounding?: 'NEAREST_RUPEE' | 'NONE';
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(28) pay_day?: number;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @IsInt({ each: true }) accounts_emp_ids?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) company_name?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) company_address?: string | null;
}

export class CategoryDto {
  @ApiProperty({ enum: ['ADDITION', 'DEDUCTION'] }) @IsEnum(['ADDITION', 'DEDUCTION']) kind!: 'ADDITION' | 'DEDUCTION';
  @ApiProperty() @IsString() @Length(2, 60, { message: 'Please fill this field.' }) label!: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 60) label?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class ReportQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) year?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(12) @Type(() => Number) month?: number;
  @ApiPropertyOptional({ description: 'Range start YYYY-MM (Salary Summary)' }) @IsOptional() @Matches(/^\d{4}-\d{2}$/) from?: string;
  @ApiPropertyOptional({ description: 'Range end YYYY-MM (Salary Summary)' }) @IsOptional() @Matches(/^\d{4}-\d{2}$/) to?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) emp_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Type(() => Number) department_id?: number;
  @ApiPropertyOptional({ enum: ['json', 'xlsx', 'csv'] }) @IsOptional() @IsIn(['json', 'xlsx', 'csv']) format?: 'json' | 'xlsx' | 'csv';
}
