import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class EmployeePayPolicyDto {
  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  salary_effective_from?: Date | null;

  @ApiProperty({ type: Boolean, example: true })
  pf_applicable!: boolean;

  @ApiPropertyOptional({ type: String, example: '100904838291', nullable: true })
  uan?: string | null;

  @ApiProperty({ type: Number, example: 12 })
  employee_pf_pct!: number;

  @ApiProperty({ type: Number, example: 12 })
  employer_pf_pct!: number;

  @ApiProperty({ type: Boolean, example: true })
  ot_eligible!: boolean;

  @ApiPropertyOptional({ type: String, enum: ['FIXED', 'MULTIPLIER'], nullable: true })
  ot_rate_type?: 'FIXED' | 'MULTIPLIER' | null;

  @ApiPropertyOptional({ type: Number, example: 150, nullable: true })
  ot_rate?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1.5, nullable: true })
  ot_multiplier?: number | null;

  @ApiProperty({ type: Number, example: 1.0 })
  minimum_ot_per_day!: number;

  @ApiProperty({ type: String, enum: ['SALARY', 'COMP_OFF'], example: 'SALARY' })
  ot_paid_as!: 'SALARY' | 'COMP_OFF';

  @ApiPropertyOptional({ type: String, enum: ['BANK_TRANSFER', 'CHEQUE', 'CASH'], nullable: true })
  payment_mode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | null;

  @ApiPropertyOptional({ type: String, example: 'HDFC Bank', nullable: true })
  bank_name?: string | null;

  @ApiPropertyOptional({ type: String, example: '50100492817291', nullable: true })
  account_number?: string | null;

  @ApiPropertyOptional({ type: String, example: 'HDFC0001234', nullable: true })
  ifsc_code?: string | null;
}

export class CreateEmployeeDto {
  @ApiProperty({ type: String, example: 'Alice Johnson', description: 'Employee full name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ type: String, example: 'alice@vernoxy.com', description: 'Corporate email' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ type: String, example: '+919876543210', description: 'Mobile phone number', nullable: true })
  @IsOptional()
  @IsString()
  mob?: string;

  @ApiProperty({ type: String, example: 'P@ssw0rd', description: 'Initial account password (min 6 chars)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({ type: Number, example: 1, description: 'Primary Department ID' })
  @IsInt()
  @IsNotEmpty()
  dep_id!: number;

  @ApiPropertyOptional({ type: [Number], example: [1, 2], description: 'List of Department IDs (multi-department support)' })
  @IsOptional()
  @IsArray()
  department_ids?: number[];

  @ApiPropertyOptional({ type: Number, example: 2, description: 'Role ID (designation)', nullable: true })
  @IsOptional()
  @IsInt()
  role_id?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Reporting manager employee ID', nullable: true })
  @IsOptional()
  @IsInt()
  reporting_manager?: number | null;

  @ApiProperty({ type: String, example: '2026-10-01', description: 'Joining date' })
  @IsNotEmpty()
  joining_date!: string;

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Gender lookup ID', nullable: true })
  @IsOptional()
  @IsInt()
  gender_id?: number | null;

  @ApiPropertyOptional({ type: String, example: 'alice.personal@gmail.com', nullable: true })
  @IsOptional()
  @IsEmail()
  personal_email?: string | null;

  @ApiPropertyOptional({ type: String, example: 'alice@vernoxy.com', nullable: true })
  @IsOptional()
  @IsEmail()
  office_email?: string | null;

  @ApiPropertyOptional({ type: String, example: '1995-05-15', nullable: true })
  @IsOptional()
  @IsString()
  birth_date?: string | null;

  @ApiPropertyOptional({ type: String, example: 'B+', nullable: true })
  @IsOptional()
  @IsString()
  blood_group?: string | null;

  @ApiPropertyOptional({ type: String, example: '123 Tech Park, Indiranagar, Bengaluru', nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ type: String, example: 'John Johnson', nullable: true })
  @IsOptional()
  @IsString()
  emergency_contact_name?: string | null;

  @ApiPropertyOptional({ type: String, example: '+919876543219', nullable: true })
  @IsOptional()
  @IsString()
  emergency_contact_number?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Spouse', nullable: true })
  @IsOptional()
  @IsString()
  emergency_contact_relation?: string | null;

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Employment Type lookup ID', nullable: true })
  @IsOptional()
  @IsInt()
  employment_type_id?: number | null;

  @ApiPropertyOptional({ type: Number, example: 50000, description: 'Salary (cannot be negative)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ type: Number, example: 1800, description: 'PF (cannot be negative)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pf?: number;

  @ApiPropertyOptional({ type: Boolean, example: true, description: 'Overtime eligibility' })
  @IsOptional()
  @IsBoolean()
  ot_eligible?: boolean;

  @ApiPropertyOptional({ type: String, enum: ['FIXED', 'MULTIPLIER'], example: 'MULTIPLIER' })
  @IsOptional()
  @IsIn(['FIXED', 'MULTIPLIER'])
  ot_rate_type?: 'FIXED' | 'MULTIPLIER' | null;

  @ApiPropertyOptional({ type: Number, example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ot_rate?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ot_multiplier?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_ot_per_day?: number;

  @ApiPropertyOptional({ type: String, enum: ['SALARY', 'COMP_OFF'], example: 'SALARY' })
  @IsOptional()
  @IsIn(['SALARY', 'COMP_OFF'])
  ot_paid_as?: 'SALARY' | 'COMP_OFF';

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  pf_applicable?: boolean;

  @ApiPropertyOptional({ type: String, example: '100904838291' })
  @IsOptional()
  @IsString()
  uan?: string | null;

  @ApiPropertyOptional({ type: Number, example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  employee_pf_pct?: number;

  @ApiPropertyOptional({ type: Number, example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  employer_pf_pct?: number;

  @ApiPropertyOptional({ type: String, enum: ['BANK_TRANSFER', 'CHEQUE', 'CASH'], example: 'BANK_TRANSFER' })
  @IsOptional()
  @IsIn(['BANK_TRANSFER', 'CHEQUE', 'CASH'])
  payment_mode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | null;

  @ApiPropertyOptional({ type: String, example: 'HDFC Bank' })
  @IsOptional()
  @IsString()
  bank_name?: string | null;

  @ApiPropertyOptional({ type: String, example: '50100492817291' })
  @IsOptional()
  @IsString()
  account_number?: string | null;

  @ApiPropertyOptional({ type: String, example: 'HDFC0001234' })
  @IsOptional()
  @IsString()
  ifsc_code?: string | null;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ type: String, example: 'Alice Johnson-Smith', description: 'Employee full name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ type: String, example: 'alice@vernoxy.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ type: String, example: '+919876543211', description: 'Mobile phone number' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  mob?: string;

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Primary Department ID' })
  @IsOptional()
  @IsInt()
  dep_id?: number;

  @ApiPropertyOptional({ type: [Number], example: [1, 2], description: 'List of Department IDs' })
  @IsOptional()
  @IsArray()
  department_ids?: number[];

  @ApiPropertyOptional({ type: Number, example: 2, description: 'Role ID', nullable: true })
  @IsOptional()
  @IsInt()
  role_id?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Reporting manager employee ID', nullable: true })
  @IsOptional()
  @IsInt()
  reporting_manager?: number | null;

  @ApiPropertyOptional({ type: String, example: '2026-10-01', description: 'Joining date' })
  @IsOptional()
  @IsString()
  joining_date?: string;

  @ApiPropertyOptional({ type: String, example: '2026-10-31', description: 'Exit date', nullable: true })
  @IsOptional()
  @IsString()
  exit_date?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Active', enum: ['Active', 'Inactive'] })
  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: 'Active' | 'Inactive';

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Gender lookup ID', nullable: true })
  @IsOptional()
  @IsInt()
  gender_id?: number | null;

  @ApiPropertyOptional({ type: String, example: 'alice.personal@gmail.com', nullable: true })
  @IsOptional()
  @IsEmail()
  personal_email?: string | null;

  @ApiPropertyOptional({ type: String, example: 'alice@vernoxy.com', nullable: true })
  @IsOptional()
  @IsEmail()
  office_email?: string | null;

  @ApiPropertyOptional({ type: String, example: '1995-05-15', nullable: true })
  @IsOptional()
  @IsString()
  birth_date?: string | null;

  @ApiPropertyOptional({ type: String, example: 'B+', nullable: true })
  @IsOptional()
  @IsString()
  blood_group?: string | null;

  @ApiPropertyOptional({ type: String, example: '123 Tech Park, Bengaluru', nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ type: String, example: 'John Johnson', nullable: true })
  @IsOptional()
  @IsString()
  emergency_contact_name?: string | null;

  @ApiPropertyOptional({ type: String, example: '+919876543219', nullable: true })
  @IsOptional()
  @IsString()
  emergency_contact_number?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Spouse', nullable: true })
  @IsOptional()
  @IsString()
  emergency_contact_relation?: string | null;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  employment_type_id?: number | null;

  @ApiPropertyOptional({ type: Number, example: 60000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ type: Number, example: 1800 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pf?: number;

  @ApiPropertyOptional({ type: String, example: '2026-10-31', nullable: true })
  @IsOptional()
  @IsString()
  termination_date?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Resigned', nullable: true })
  @IsOptional()
  @IsString()
  deactivation_reason?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Moved to another city', nullable: true })
  @IsOptional()
  @IsString()
  deactivation_notes?: string | null;

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  ot_eligible?: boolean;

  @ApiPropertyOptional({ type: String, enum: ['FIXED', 'MULTIPLIER'] })
  @IsOptional()
  @IsIn(['FIXED', 'MULTIPLIER'])
  ot_rate_type?: 'FIXED' | 'MULTIPLIER' | null;

  @ApiPropertyOptional({ type: Number, example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ot_rate?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ot_multiplier?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_ot_per_day?: number;

  @ApiPropertyOptional({ type: String, enum: ['SALARY', 'COMP_OFF'] })
  @IsOptional()
  @IsIn(['SALARY', 'COMP_OFF'])
  ot_paid_as?: 'SALARY' | 'COMP_OFF';

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  pf_applicable?: boolean;

  @ApiPropertyOptional({ type: String, example: '100904838291' })
  @IsOptional()
  @IsString()
  uan?: string | null;

  @ApiPropertyOptional({ type: Number, example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  employee_pf_pct?: number;

  @ApiPropertyOptional({ type: Number, example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  employer_pf_pct?: number;

  @ApiPropertyOptional({ type: String, enum: ['BANK_TRANSFER', 'CHEQUE', 'CASH'] })
  @IsOptional()
  @IsIn(['BANK_TRANSFER', 'CHEQUE', 'CASH'])
  payment_mode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | null;

  @ApiPropertyOptional({ type: String, example: 'HDFC Bank' })
  @IsOptional()
  @IsString()
  bank_name?: string | null;

  @ApiPropertyOptional({ type: String, example: '50100492817291' })
  @IsOptional()
  @IsString()
  account_number?: string | null;

  @ApiPropertyOptional({ type: String, example: 'HDFC0001234' })
  @IsOptional()
  @IsString()
  ifsc_code?: string | null;
}

export class DeactivateEmployeeDto {
  @ApiProperty({ type: String, example: '2026-10-31', description: 'Termination date (last working day)' })
  @IsNotEmpty()
  @IsString()
  termination_date!: string;

  @ApiProperty({
    type: String,
    example: 'Resigned',
    description: 'Deactivation reason (Resigned, Terminated, Contract ended, Retired, Absconded, Other)',
  })
  @IsNotEmpty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ type: String, example: 'Detailed notes (required if reason is Other)', nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeactivateWarningResponseDto {
  @ApiProperty({ type: Number, example: 3 })
  direct_reports_count!: number;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        emp_id: { type: 'number' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
  })
  direct_reports!: Array<{ emp_id: number; name: string; email: string }>;
}

export class EmployeeQueryDto {
  @ApiPropertyOptional({ type: String, description: 'Search name or email' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ type: Number, description: 'Filter by department ID' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  dep_id?: number;

  @ApiPropertyOptional({ type: Number, description: 'Filter by role ID' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  role_id?: number;

  @ApiPropertyOptional({ type: String, description: 'Filter by status', enum: ['Active', 'Inactive'] })
  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: 'Active' | 'Inactive';

  @ApiPropertyOptional({ type: Number, description: 'Limit results', default: 50 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ type: String, description: 'Keyset pagination cursor' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class EmployeeOptionDto {
  @ApiProperty({ type: Number, example: 1 })
  emp_id!: number;

  @ApiProperty({ type: String, example: 'Alice Johnson' })
  name!: string;

  @ApiProperty({ type: String, example: 'alice@vernoxy.com' })
  email!: string;
}

export class EmployeeRelationDepartmentDto {
  @ApiProperty({ type: Number, example: 1 })
  dep_id!: number;

  @ApiProperty({ type: String, example: 'Engineering' })
  name!: string;

  @ApiPropertyOptional({ type: Boolean, example: true })
  is_primary?: boolean;
}

export class EmployeeRelationRoleDto {
  @ApiProperty({ type: Number, example: 2 })
  role_id!: number;

  @ApiProperty({ type: String, example: 'Software Engineer' })
  role_name!: string;
}

export class EmployeeRelationManagerDto {
  @ApiProperty({ type: Number, example: 1 })
  emp_id!: number;

  @ApiProperty({ type: String, example: 'Bob Smith' })
  name!: string;
}

export class LookupValueDto {
  @ApiProperty({ type: Number, example: 1 })
  lookup_id!: number;

  @ApiProperty({ type: String, example: 'male' })
  code!: string;

  @ApiProperty({ type: String, example: 'Male' })
  label!: string;
}

export class EmployeeResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  emp_id!: number;

  @ApiProperty({ type: String, example: 'Alice Johnson' })
  name!: string;

  @ApiProperty({ type: String, example: 'alice@vernoxy.com' })
  email!: string;

  @ApiProperty({ type: String, example: '+919876543210' })
  mob!: string;

  @ApiProperty({ type: Number, example: 1 })
  dep_id!: number;

  @ApiPropertyOptional({ type: () => [EmployeeRelationDepartmentDto] })
  departments?: EmployeeRelationDepartmentDto[];

  @ApiPropertyOptional({ type: Number, example: 2, nullable: true })
  role_id!: number | null;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  reporting_manager!: number | null;

  @ApiPropertyOptional({ type: String, example: '/api/v1/files/profile-photos/abc123.webp?exp=123&sig=456', nullable: true })
  profile_picture_url?: string | null;

  @ApiProperty({ type: String, example: 'Active', enum: ['Active', 'Inactive'] })
  status!: 'Active' | 'Inactive';

  @ApiProperty({ type: String, format: 'date', example: '2026-10-01' })
  joining_date!: Date;

  @ApiPropertyOptional({ type: String, format: 'date', example: null, nullable: true })
  exit_date!: Date | null;

  @ApiPropertyOptional({ type: () => EmployeeRelationDepartmentDto })
  department?: EmployeeRelationDepartmentDto;

  @ApiPropertyOptional({ type: () => EmployeeRelationRoleDto, nullable: true })
  role?: EmployeeRelationRoleDto | null;

  @ApiPropertyOptional({ type: () => EmployeeRelationManagerDto, nullable: true })
  manager?: EmployeeRelationManagerDto | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  gender_id?: number | null;

  @ApiPropertyOptional({ type: () => LookupValueDto, nullable: true })
  gender?: LookupValueDto | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  personal_email?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  office_email?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  birth_date?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  blood_group?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  emergency_contact_name?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  emergency_contact_number?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  emergency_contact_relation?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  employment_type_id?: number | null;

  @ApiPropertyOptional({ type: () => LookupValueDto, nullable: true })
  employment_type?: LookupValueDto | null;

  @ApiPropertyOptional({ type: Number, example: 50000 })
  salary?: number;

  @ApiPropertyOptional({ type: Number, example: 1800 })
  pf?: number;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  termination_date?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  deactivation_reason?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  deactivation_notes?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  deactivated_at?: Date | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  deactivated_by?: number | null;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-10-10T12:00:00Z' })
  created_at!: Date;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  created_by!: number | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', example: '2026-10-10T12:00:00Z', nullable: true })
  updated_at!: Date | null;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  updated_by!: number | null;

  @ApiPropertyOptional({ type: String, example: 'EMP-0001' })
  employee_code?: string;

  @ApiPropertyOptional({ type: Number, example: 0 })
  pending_documents_count?: number;

  @ApiPropertyOptional({ type: () => EmployeePayPolicyDto })
  pay_policy?: EmployeePayPolicyDto | null;

  @ApiPropertyOptional({ type: Boolean, example: true })
  ot_eligible?: boolean;

  @ApiPropertyOptional({ type: String, enum: ['FIXED', 'MULTIPLIER'] })
  ot_rate_type?: 'FIXED' | 'MULTIPLIER' | null;

  @ApiPropertyOptional({ type: Number, example: 150 })
  ot_rate?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1.5 })
  ot_multiplier?: number | null;

  @ApiPropertyOptional({ type: Number, example: 1.0 })
  minimum_ot_per_day?: number;

  @ApiPropertyOptional({ type: String, enum: ['SALARY', 'COMP_OFF'] })
  ot_paid_as?: 'SALARY' | 'COMP_OFF';

  @ApiPropertyOptional({ type: Boolean, example: true })
  pf_applicable?: boolean;

  @ApiPropertyOptional({ type: String, example: '100904838291' })
  uan?: string | null;

  @ApiPropertyOptional({ type: Number, example: 12 })
  employee_pf_pct?: number;

  @ApiPropertyOptional({ type: Number, example: 12 })
  employer_pf_pct?: number;

  @ApiPropertyOptional({ type: String, enum: ['BANK_TRANSFER', 'CHEQUE', 'CASH'] })
  payment_mode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | null;

  @ApiPropertyOptional({ type: String, example: 'HDFC Bank' })
  bank_name?: string | null;

  @ApiPropertyOptional({ type: String, example: '50100492817291' })
  account_number?: string | null;

  @ApiPropertyOptional({ type: String, example: 'HDFC0001234' })
  ifsc_code?: string | null;
}

export class EmployeeHistoryItemDto {
  @ApiProperty({ type: Number })
  history_id!: number;

  @ApiProperty({ type: Number })
  emp_id!: number;

  @ApiProperty({ type: String, example: 'HIRED' })
  event_type!: string;

  @ApiProperty({ type: String, example: 'Joined the company' })
  title!: string;

  @ApiProperty({ type: [Number] })
  department_ids!: number[];

  @ApiPropertyOptional({ type: () => [EmployeeRelationDepartmentDto] })
  departments?: EmployeeRelationDepartmentDto[];

  @ApiPropertyOptional({ type: Number, nullable: true })
  role_id!: number | null;

  @ApiPropertyOptional({ type: () => EmployeeRelationRoleDto, nullable: true })
  role?: EmployeeRelationRoleDto | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  manager_id!: number | null;

  @ApiPropertyOptional({ type: () => EmployeeRelationManagerDto, nullable: true })
  manager?: EmployeeRelationManagerDto | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  employment_type!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  salary!: number | null;

  @ApiProperty({ type: String, format: 'date' })
  effective_date!: Date;

  @ApiPropertyOptional({ type: String, nullable: true })
  reason!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: Date;

  @ApiPropertyOptional({ type: Number, nullable: true })
  created_by!: number | null;
}

export class EmployeeStatsDto {
  @ApiProperty({ type: Number, example: 24 })
  total!: number;

  @ApiProperty({ type: Number, example: 21 })
  active!: number;

  @ApiProperty({ type: Number, example: 3 })
  inactive!: number;
}

export class EmployeeListResponseDto {
  @ApiProperty({ type: () => [EmployeeResponseDto] })
  items!: EmployeeResponseDto[];

  @ApiPropertyOptional({ type: String, example: 'eyJpZCI6MTB9', nullable: true })
  next_cursor!: string | null;

  @ApiPropertyOptional({ type: () => EmployeeStatsDto })
  stats?: EmployeeStatsDto;
}
