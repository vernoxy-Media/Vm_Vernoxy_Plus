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

export class StartPayrollDto {
  @ApiProperty({ description: 'Payroll month (1-12)', example: 9 })
  @IsInt()
  @Min(1)
  @Max(12)
  payroll_month!: number;

  @ApiProperty({ description: 'Payroll year', example: 2026 })
  @IsInt()
  @Min(2020)
  @Max(2100)
  payroll_year!: number;
}

export class DayAdjustmentDto {
  @ApiProperty({ description: 'Day paid value', enum: ['FULL', 'HALF', 'UNPAID'] })
  @IsEnum(['FULL', 'HALF', 'UNPAID'])
  pay_this_day_as!: 'FULL' | 'HALF' | 'UNPAID';

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  reason!: string;

  @ApiProperty({ description: 'Explanation note (10 to 250 chars)' })
  @IsString()
  @Length(10, 250)
  note!: string;
}

export class AddAdjustmentDto {
  @ApiProperty({ enum: ['ADDITION', 'DEDUCTION'] })
  @IsEnum(['ADDITION', 'DEDUCTION'])
  kind!: 'ADDITION' | 'DEDUCTION';

  @ApiPropertyOptional({ description: 'Category lookup id' })
  @IsOptional()
  @IsInt()
  category_id?: number;

  @ApiProperty({ description: 'Category code string (e.g. bonus, referral_bonus, salary_advance_recovery)' })
  @IsString()
  category_code!: string;

  @ApiProperty({ description: 'Amount in rupees', example: 2000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Related date within month' })
  @IsOptional()
  @IsString()
  related_date?: string;

  @ApiPropertyOptional({ description: 'Reference ID, e.g. candidate ID, bill no' })
  @IsOptional()
  @IsString()
  reference_number?: string;

  @ApiProperty({ description: 'Reason (10 to 250 chars)' })
  @IsString()
  @Length(10, 250)
  reason!: string;

  @ApiPropertyOptional({ description: 'Attachment file URL' })
  @IsOptional()
  @IsString()
  attachment_url?: string;
}

export class ApproveOtDto {
  @ApiProperty({ enum: ['APPROVED', 'REDUCED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REDUCED', 'REJECTED'])
  status!: 'APPROVED' | 'REDUCED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Approved hours if reduced/approved', example: 4.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approved_hours?: number;

  @ApiPropertyOptional({ description: 'Approver comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class BatchApproveOtDto {
  @ApiProperty({ type: [Number], description: 'List of payroll_ot_entry_id to approve' })
  ot_entry_ids!: number[];
}

export class LockPayrollDto {
  @ApiProperty({ description: 'Confirmation that register and warnings were verified' })
  @IsBoolean()
  confirmed!: boolean;
}

export class UnlockPayrollDto {
  @ApiProperty({ description: 'Admin reason for unlocking (10 to 250 chars)' })
  @IsString()
  @Length(10, 250)
  reason!: string;
}

export class MarkPaidDto {
  @ApiProperty({ description: 'Payment date (YYYY-MM-DD)' })
  @IsString()
  payment_date!: string;

  @ApiPropertyOptional({ description: 'Payment reference or batch number' })
  @IsOptional()
  @IsString()
  payment_reference?: string;

  @ApiPropertyOptional({ type: [Number], description: 'Specific employee IDs paid (all if omitted)' })
  @IsOptional()
  employee_ids?: number[];
}

export class UpdatePayrollSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  default_employee_pf_pct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  default_employer_pf_pct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  apply_pf_wage_limit?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1000)
  pf_wage_limit?: number;

  @ApiPropertyOptional({ enum: ['UNPAID', 'FULL'] })
  @IsOptional()
  @IsEnum(['UNPAID', 'FULL'])
  missing_punch_default?: 'UNPAID' | 'FULL';

  @ApiPropertyOptional({ enum: ['NONE', 'FIFTEEN', 'THIRTY'] })
  @IsOptional()
  @IsEnum(['NONE', 'FIFTEEN', 'THIRTY'])
  ot_rounding?: 'NONE' | 'FIFTEEN' | 'THIRTY';

  @ApiPropertyOptional({ enum: ['NEAREST_RUPEE', 'NONE'] })
  @IsOptional()
  @IsEnum(['NEAREST_RUPEE', 'NONE'])
  total_salary_rounding?: 'NEAREST_RUPEE' | 'NONE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  pay_day?: number;
}
