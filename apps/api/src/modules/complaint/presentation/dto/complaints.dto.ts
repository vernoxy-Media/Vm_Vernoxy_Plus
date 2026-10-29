import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Length,
  IsEnum,
  IsArray,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ComplaintPriority } from './complaint-settings.dto';

export enum ComplaintStatus {
  NEW = 'New',
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed',
}

export enum ClosureType {
  RESOLVED = 'Resolved',
  WITHOUT_ACTION = 'Without action',
  WITHDRAWN = 'Withdrawn',
}

export enum CloseWithoutActionReason {
  DUPLICATE = 'Duplicate',
  NOT_A_COMPLAINT = 'Not a complaint',
  BELONGS_TO_ANOTHER_PROCESS = 'Belongs to another process',
  NOT_ENOUGH_INFORMATION = 'Not enough information',
  OTHER = 'Other',
}

export enum ResolutionOutcome {
  ISSUE_FIXED = 'Resolved – issue fixed',
  EXPLAINED = 'Resolved – explained',
  PARTLY_RESOLVED = 'Partly resolved',
  NOT_UPHELD = 'Not upheld',
  ACTION_TAKEN = 'Action taken',
}

// -----------------------------------------------------------------------------
// 1. Employee Submission
// -----------------------------------------------------------------------------

export class CreateComplaintDto {
  @ApiProperty({ description: 'Short title of complaint (5 to 150 chars)', example: 'Laptop shuts down during client calls' })
  @IsString()
  @Length(5, 150)
  subject!: string;

  @ApiProperty({ description: 'Complaint Type ID from master data', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  complaint_type_id!: number;

  @ApiProperty({ description: 'Date issue occurred (YYYY-MM-DD)', example: '2026-10-26' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'complaint_date must be in YYYY-MM-DD format' })
  complaint_date!: string;

  @ApiProperty({ description: 'Related department ID (Required)', example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  related_department_id!: number;

  @ApiPropertyOptional({ description: 'Related project ID (Optional)', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  related_project_id?: number;

  @ApiProperty({ description: 'Detailed issue description (20 to 2000 chars)', example: 'My laptop shuts down without warning when it gets hot.' })
  @IsString()
  @Length(20, 2000)
  description!: string;

  @ApiPropertyOptional({ description: 'Optional initial remarks/context (up to 1000 chars)', example: 'I have a client demo on 29 Oct.' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  remarks?: string;

  @ApiPropertyOptional({ description: 'Mark as Confidential (only Admin, handler and complainant can view)', default: false })
  @IsOptional()
  @IsBoolean()
  is_confidential?: boolean;

  @ApiPropertyOptional({ description: 'Attachment IDs from unified attachments table', example: [1, 2] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  attachment_ids?: number[];
}

// -----------------------------------------------------------------------------
// 2. Admin Review & Assignment
// -----------------------------------------------------------------------------

export class AcceptAndAssignDto {
  @ApiProperty({ description: 'Assigned handler employee ID (cannot be complainant)', example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  handler_id!: number;

  @ApiProperty({ enum: ComplaintPriority, example: ComplaintPriority.HIGH })
  @IsEnum(ComplaintPriority)
  priority!: ComplaintPriority;

  @ApiProperty({ description: 'Target resolution date (YYYY-MM-DD)', example: '2026-10-29' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'target_date must be in YYYY-MM-DD format' })
  target_date!: string;

  @ApiPropertyOptional({ description: 'Optional note to handler and employee', example: 'Please give a spare laptop first.' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  remarks?: string;
}

export class CloseWithoutActionDto {
  @ApiProperty({ enum: CloseWithoutActionReason, example: CloseWithoutActionReason.DUPLICATE })
  @IsEnum(CloseWithoutActionReason)
  reason!: CloseWithoutActionReason;

  @ApiProperty({ description: 'Mandatory explanation remarks to employee', example: 'The same matter is already raised in CMP/2026/10/0009.' })
  @IsString()
  @Length(5, 1000)
  remarks!: string;

  @ApiPropertyOptional({ description: 'Original complaint ID if reason is Duplicate', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  linked_complaint_id?: number;
}

export class ReassignHandlerDto {
  @ApiProperty({ description: 'New handler employee ID', example: 3 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  handler_id!: number;

  @ApiProperty({ description: 'Mandatory reason for reassignment', example: 'Original handler is on leave.' })
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class ChangePriorityDto {
  @ApiProperty({ enum: ComplaintPriority, example: ComplaintPriority.URGENT })
  @IsEnum(ComplaintPriority)
  priority!: ComplaintPriority;

  @ApiProperty({ description: 'Mandatory reason for changing priority', example: 'Issue escalated by client demo.' })
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class ChangeTargetDateDto {
  @ApiProperty({ description: 'New target resolution date (YYYY-MM-DD)', example: '2026-11-02' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'target_date must be in YYYY-MM-DD format' })
  target_date!: string;

  @ApiProperty({ description: 'Mandatory reason for changing target date', example: 'Spare parts delayed by vendor.' })
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class ChangeConfidentialityDto {
  @ApiProperty({ description: 'New confidentiality state', example: true })
  @IsBoolean()
  is_confidential!: boolean;

  @ApiPropertyOptional({ description: 'Reason required if removing confidentiality', example: 'Matter is resolved and general.' })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  reason?: string;
}

// -----------------------------------------------------------------------------
// 3. Actions & Remarks
// -----------------------------------------------------------------------------

export class AddActionDto {
  @ApiProperty({ description: 'Date action occurred (YYYY-MM-DD)', example: '2026-10-27' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'action_date must be in YYYY-MM-DD format' })
  action_date!: string;

  @ApiProperty({ description: 'Action text (10 to 1000 chars)', example: 'Laptop checked. CPU fan blocked with dust, thermal paste replaced.' })
  @IsString()
  @Length(10, 1000)
  action_text!: string;

  @ApiPropertyOptional({ description: 'Attachment IDs up to 3 files', example: [3] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  attachment_ids?: number[];
}

export class AddRemarkDto {
  @ApiProperty({ description: 'Remark text (1 to 1000 chars)', example: 'Vendor quote received.' })
  @IsString()
  @Length(1, 1000)
  remark_text!: string;

  @ApiPropertyOptional({ description: 'Whether this is an internal remark (seen only by Admin & Handler)', default: false })
  @IsOptional()
  @IsBoolean()
  is_internal?: boolean;
}

// -----------------------------------------------------------------------------
// 4. Resolution, Confirmation & Reopen
// -----------------------------------------------------------------------------

export class RecordResolutionDto {
  @ApiProperty({ enum: ResolutionOutcome, example: ResolutionOutcome.ISSUE_FIXED })
  @IsEnum(ResolutionOutcome)
  outcome!: ResolutionOutcome;

  @ApiProperty({ description: 'Details of what was done and result (20 to 2000 chars)', example: 'Fan cleaned, thermal paste replaced, tested 2 hours without shutdown.' })
  @IsString()
  @Length(20, 2000)
  resolution_details!: string;

  @ApiPropertyOptional({ description: 'Internal root cause (seen by handler & Admin, used in reports)', example: 'Dust in the cooling fan' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  root_cause?: string;

  @ApiPropertyOptional({ description: 'Attachment IDs up to 3 files (e.g. service report)', example: [4] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  attachment_ids?: number[];
}

export class ConfirmResolutionDto {
  @ApiPropertyOptional({ description: 'Optional short comment by employee', example: 'Working fine now, thank you.' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  comment?: string;
}

export class ReopenComplaintDto {
  @ApiProperty({ description: 'Mandatory reason for reopening (10 to 1000 chars)', example: 'The laptop shut down again during a one-hour call.' })
  @IsString()
  @Length(10, 1000)
  reason!: string;
}

export class SendBackDto {
  @ApiProperty({ description: 'Mandatory Admin remarks when sending back to handler', example: 'Please recheck battery charging issue.' })
  @IsString()
  @Length(5, 1000)
  remarks!: string;

  @ApiPropertyOptional({ description: 'New target date if adjusted (YYYY-MM-DD)', example: '2026-11-04' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'target_date must be in YYYY-MM-DD format' })
  target_date?: string;
}

export class CloseComplaintDto {
  @ApiPropertyOptional({ description: 'Optional remarks by Admin upon closing', example: 'Confirmed settled with user.' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  remarks?: string;
}

export class WithdrawComplaintDto {
  @ApiPropertyOptional({ description: 'Optional withdrawal reason', example: 'Issue resolved on its own.' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  reason?: string;
}

// -----------------------------------------------------------------------------
// 5. Reports Query DTO
// -----------------------------------------------------------------------------

export class ComplaintReportsQueryDto {
  @ApiPropertyOptional({
    description: 'Report tab view',
    enum: ['summary', 'register', 'by_type', 'by_department', 'handler_performance', 'overdue', 'reopened', 'closed_without_action'],
    default: 'summary',
  })
  @IsOptional()
  @IsString()
  report_type?: string;

  @ApiPropertyOptional({ description: 'Calendar month (YYYY-MM)', example: '2026-10' })
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
    enum: ['SUBMITTED', 'RESOLVED', 'CLOSED'],
    default: 'SUBMITTED',
  })
  @IsOptional()
  @IsString()
  date_basis?: 'SUBMITTED' | 'RESOLVED' | 'CLOSED';

  @ApiPropertyOptional({ description: 'Filter by Department ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;

  @ApiPropertyOptional({ description: 'Filter by Handler Employee ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  handler_id?: number;

  @ApiPropertyOptional({ description: 'Filter by Complaint Type ID', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  complaint_type_id?: number;

  @ApiPropertyOptional({ enum: ComplaintPriority })
  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @ApiPropertyOptional({ description: 'Status filter (e.g. Active, New, Resolved, Closed)', example: 'Active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Breakdown grouping for summary',
    enum: ['type', 'department', 'handler'],
    default: 'type',
  })
  @IsOptional()
  @IsString()
  group_by?: 'type' | 'department' | 'handler';
}

