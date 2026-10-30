import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  Matches,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCandidateDto {
  @ApiProperty({ description: 'Full name as given in the resume', example: 'Rohan Mehta' })
  @IsString()
  @IsNotEmpty({ message: 'Please fill this field.' })
  name!: string;

  @ApiProperty({ description: '10-digit mobile number', example: '+919825011223' })
  @IsString()
  @IsNotEmpty({ message: 'Please fill this field.' })
  @Matches(/^(\+91)?[6-9]\d{9}$/, { message: 'The phone number must be 10 digits.' })
  phone!: string;

  @ApiProperty({ description: 'Personal email address', example: 'rohan.mehta@gmail.com' })
  @IsEmail({}, { message: 'Please enter a valid email.' })
  @IsNotEmpty({ message: 'Please fill this field.' })
  email!: string;

  @ApiPropertyOptional({ description: 'Gender lookup ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  gender_id?: number;

  @ApiPropertyOptional({ description: 'Current Location (City, State)', example: 'Ahmedabad, Gujarat' })
  @IsOptional()
  @IsString()
  current_location?: string;

  @ApiPropertyOptional({ description: 'Resume file URL' })
  @IsOptional()
  @IsString()
  resume_url?: string;

  @ApiPropertyOptional({ description: 'Resume file name' })
  @IsOptional()
  @IsString()
  resume_filename?: string;

  @ApiPropertyOptional({ description: 'Resume file size in bytes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  resume_size?: number;

  @ApiPropertyOptional({ description: 'Resume MIME type' })
  @IsOptional()
  @IsString()
  resume_mime?: string;

  @ApiProperty({ description: 'Position Applied For (role_id)', example: 4 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Please select a position.' })
  role_id!: number;

  @ApiProperty({ description: 'Department ID (auto-filled from role, editable)', example: 2 })
  @Type(() => Number)
  @IsNumber({}, { message: 'Please select a department.' })
  dep_id!: number;

  @ApiProperty({ description: 'Experience type: fresher or experienced', example: 'experienced' })
  @IsEnum(['fresher', 'experienced'], { message: 'Experience type must be fresher or experienced.' })
  experience_type!: 'fresher' | 'experienced';

  @ApiPropertyOptional({ description: 'Total experience years (0-50)', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  exp_years?: number;

  @ApiPropertyOptional({ description: 'Total experience months (0-11)', example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(11)
  exp_months?: number;

  @ApiPropertyOptional({ description: 'Current Company', example: 'Nexa Infotech' })
  @IsOptional()
  @IsString()
  current_company?: string;

  @ApiPropertyOptional({ description: 'Current Designation', example: 'Jr. Business Analyst' })
  @IsOptional()
  @IsString()
  current_designation?: string;

  @ApiPropertyOptional({ description: 'Current CTC (annual ₹)', example: 480000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Please enter 0 or more.' })
  @Min(0, { message: 'Please enter 0 or more.' })
  current_ctc?: number;

  @ApiPropertyOptional({ description: 'Expected CTC (annual ₹)', example: 600000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Please enter 0 or more.' })
  @Min(0, { message: 'Please enter 0 or more.' })
  expected_ctc?: number;

  @ApiPropertyOptional({ description: 'Notice Period code', example: '30_days' })
  @IsOptional()
  @IsString()
  notice_period?: string;

  @ApiPropertyOptional({ description: 'Last working day if serving notice' })
  @IsOptional()
  @IsString()
  serving_notice_lwd?: string;

  @ApiPropertyOptional({ description: 'Key skills array', example: ['Requirement Gathering', 'BRD', 'SQL'] })
  @IsOptional()
  @IsArray()
  key_skills?: string[];

  @ApiProperty({ description: 'Source code', example: 'job_portal' })
  @IsString()
  @IsNotEmpty({ message: 'Please select a source.' })
  source!: string;

  @ApiPropertyOptional({ description: 'Job portal name code if source is job_portal', example: 'naukri' })
  @IsOptional()
  @IsString()
  source_portal?: string;

  @ApiPropertyOptional({ description: 'Referred by active employee ID if source is employee_referral', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  referred_by_emp_id?: number;

  @ApiPropertyOptional({ description: 'Consultancy name if source is consultancy', example: 'Apex Placement' })
  @IsOptional()
  @IsString()
  consultancy_name?: string;

  @ApiPropertyOptional({ description: 'College name if source is campus', example: 'DAIICT' })
  @IsOptional()
  @IsString()
  college_name?: string;

  @ApiPropertyOptional({ description: 'Source details / platform name' })
  @IsOptional()
  @IsString()
  source_details?: string;

  @ApiPropertyOptional({ description: 'Initial pipeline stage code', example: 'new' })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckDuplicateCandidateDto {
  @ApiProperty({ description: 'Phone number to verify' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'Email address to verify' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class DuplicateMatchDto {
  @ApiProperty({ enum: ['candidate', 'employee'] })
  type!: 'candidate' | 'employee';

  @ApiProperty()
  id!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;

  @ApiPropertyOptional()
  stage?: string;
}

export class CandidateStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  interviewing!: number;

  @ApiProperty()
  selected!: number;

  @ApiProperty()
  onboarding!: number;
}

export class CandidateItemDto {
  @ApiProperty()
  candidate_id!: number;

  @ApiProperty()
  candidate_code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  gender_id?: number | null;

  @ApiPropertyOptional()
  current_location?: string | null;

  @ApiPropertyOptional()
  resume_url?: string | null;

  @ApiPropertyOptional()
  resume_filename?: string | null;

  @ApiProperty()
  role_id!: number;

  @ApiPropertyOptional()
  role_name?: string;

  @ApiProperty()
  dep_id!: number;

  @ApiPropertyOptional()
  department_name?: string;

  @ApiProperty()
  experience_type!: 'fresher' | 'experienced';

  @ApiProperty()
  exp_years!: number;

  @ApiProperty()
  exp_months!: number;

  @ApiPropertyOptional()
  current_company?: string | null;

  @ApiPropertyOptional()
  current_designation?: string | null;

  @ApiPropertyOptional()
  current_ctc?: number | null;

  @ApiPropertyOptional()
  expected_ctc?: number | null;

  @ApiPropertyOptional()
  notice_period?: string | null;

  @ApiPropertyOptional()
  serving_notice_lwd?: string | null;

  @ApiPropertyOptional()
  key_skills!: string[];

  @ApiProperty()
  source!: string;

  @ApiPropertyOptional()
  source_portal?: string | null;

  @ApiPropertyOptional()
  referred_by_emp_id?: number | null;

  @ApiPropertyOptional()
  referred_by_name?: string | null;

  @ApiPropertyOptional()
  consultancy_name?: string | null;

  @ApiPropertyOptional()
  college_name?: string | null;

  @ApiPropertyOptional()
  source_details?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  stage!: string;

  @ApiPropertyOptional()
  converted_to_emp_id?: number | null;

  @ApiPropertyOptional()
  converted_to_emp_code?: string | null;

  @ApiPropertyOptional()
  rejection_reason?: string | null;

  @ApiPropertyOptional()
  rejection_notes?: string | null;

  @ApiPropertyOptional()
  final_role_id?: number | null;

  @ApiPropertyOptional()
  final_role_name?: string | null;

  @ApiPropertyOptional()
  final_dep_id?: number | null;

  @ApiPropertyOptional()
  final_department_name?: string | null;

  @ApiPropertyOptional()
  offered_ctc?: number | null;

  @ApiPropertyOptional()
  expected_joining_date?: string | null;

  @ApiPropertyOptional()
  reporting_manager_id?: number | null;

  @ApiPropertyOptional()
  reporting_manager_name?: string | null;

  @ApiPropertyOptional()
  employment_type?: string | null;

  @ApiPropertyOptional()
  decision_notes?: string | null;

  @ApiPropertyOptional()
  on_hold_review_date?: string | null;

  @ApiPropertyOptional()
  on_hold_notes?: string | null;

  @ApiPropertyOptional()
  send_regret_email?: boolean;

  @ApiPropertyOptional()
  decision_date?: string | null;

  @ApiPropertyOptional()
  decision_by?: number | null;

  @ApiPropertyOptional()
  decision_by_name?: string | null;

  @ApiProperty()
  created_at!: string;
}

export class CandidateListResponseDto {
  @ApiProperty({ type: [CandidateItemDto] })
  items!: CandidateItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty({ type: CandidateStatsDto })
  stats!: CandidateStatsDto;
}

export class UpdateCandidateStageDto {
  @ApiProperty({ description: 'New candidate stage', example: 'interviewing' })
  @IsString()
  @IsNotEmpty()
  stage!: string;
}

export class MarkCandidateDecisionDto {
  @ApiProperty({ enum: ['selected', 'on_hold', 'rejected'], example: 'selected' })
  @IsEnum(['selected', 'on_hold', 'rejected'], { message: 'Decision must be selected, on_hold, or rejected.' })
  decision!: 'selected' | 'on_hold' | 'rejected';

  @ApiPropertyOptional({ description: 'Final designation role ID for selected candidate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  final_role_id?: number;

  @ApiPropertyOptional({ description: 'Final department ID for selected candidate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  final_dep_id?: number;

  @ApiPropertyOptional({ description: 'Offered yearly CTC in rupees', example: 600000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offered_ctc?: number;

  @ApiPropertyOptional({ description: 'Expected joining date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  expected_joining_date?: string;

  @ApiPropertyOptional({ description: 'Reporting Manager employee ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  reporting_manager_id?: number;

  @ApiPropertyOptional({ description: 'Employment Type', example: 'Full-time' })
  @IsOptional()
  @IsString()
  employment_type?: string;

  @ApiPropertyOptional({ description: 'Decision notes / remarks' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Review date for on hold candidate' })
  @IsOptional()
  @IsString()
  on_hold_review_date?: string;

  @ApiPropertyOptional({ description: 'On hold notes / remarks' })
  @IsOptional()
  @IsString()
  on_hold_notes?: string;

  @ApiPropertyOptional({ description: 'Rejection reason code from rejection_reason lookup' })
  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @ApiPropertyOptional({ description: 'Rejection notes (required if reason is Other)' })
  @IsOptional()
  @IsString()
  rejection_notes?: string;

  @ApiPropertyOptional({ description: 'Whether to send regret email to candidate', default: false })
  @IsOptional()
  send_regret_email?: boolean;
}

export class ConvertCandidateToEmployeeDto {
  @ApiProperty({ description: 'Office / Corporate email for the new employee', example: 'rohan.mehta@vernoxy.com' })
  @IsEmail({}, { message: 'Please enter a valid office email.' })
  @IsNotEmpty({ message: 'Office email is required.' })
  office_email!: string;
}

export class NextEmpCodeResponseDto {
  @ApiProperty({ example: 15 })
  next_emp_id!: number;

  @ApiProperty({ example: 'EMP-0015' })
  next_emp_code!: string;
}

export class ConvertToEmployeeResponseDto {
  @ApiProperty()
  employee!: {
    emp_id: number;
    name: string;
    email: string;
    employee_code: string;
  };

  @ApiProperty({ type: CandidateItemDto })
  candidate!: CandidateItemDto;
}


