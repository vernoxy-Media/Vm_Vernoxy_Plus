import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  @ApiProperty({ type: Number, example: 1, description: 'Department ID' })
  @IsInt()
  @IsNotEmpty()
  dep_id!: number;

  @ApiPropertyOptional({ type: Number, example: 2, description: 'Role ID (optional, must belong to department if provided)', nullable: true })
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
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ type: String, example: 'Alice Johnson-Smith', description: 'Employee full name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ type: String, example: '+919876543211', description: 'Mobile phone number' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  mob?: string;

  @ApiPropertyOptional({ type: Number, example: 1, description: 'Department ID' })
  @IsOptional()
  @IsInt()
  dep_id?: number;

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

  @ApiProperty({ type: String, format: 'date-time', example: '2026-10-10T12:00:00Z' })
  created_at!: Date;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  created_by!: number | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', example: '2026-10-10T12:00:00Z', nullable: true })
  updated_at!: Date | null;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  updated_by!: number | null;
}

export class EmployeeListResponseDto {
  @ApiProperty({ type: () => [EmployeeResponseDto] })
  items!: EmployeeResponseDto[];

  @ApiPropertyOptional({ type: String, example: 'eyJpZCI6MTB9', nullable: true })
  next_cursor!: string | null;
}
