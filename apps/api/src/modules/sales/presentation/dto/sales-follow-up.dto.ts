import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CONVERSATION_TYPES, OUTCOMES } from '../../domain/services/activity-validator.service';
import { FOLLOW_UP_TABS } from '../../domain/services/follow-up.service';
import { NEXT_STEPS } from '../../domain/services/follow-up-validator.service';

const csv = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? undefined
    : (Array.isArray(value) ? value : String(value).split(',')).map((v) => String(v).trim()).filter(Boolean);
const csvInt = ({ value }: { value: unknown }) => csv({ value })?.map(Number);

// Shape only; business rules and their BFD messages live in the domain validators.

export class ListFollowUpsQueryDto {
  @ApiPropertyOptional({ enum: FOLLOW_UP_TABS, default: 'today' }) @IsOptional() @IsIn([...FOLLOW_UP_TABS]) tab?: (typeof FOLLOW_UP_TABS)[number];

  @ApiPropertyOptional({ description: '"me", "all" or an employee id. The page starts as "me".' })
  @IsOptional() @Matches(/^(me|all|\d+)$/, { message: 'assigned_to must be "me", "all" or an employee id' }) assigned_to?: string;

  @ApiPropertyOptional({ type: String, description: 'Comma separated: Call, Email, WhatsApp, Meeting, Site Visit' }) @IsOptional() @Transform(csv) type?: string[];
  @ApiPropertyOptional({ type: String, description: 'Comma separated cities' }) @IsOptional() @Transform(csv) city?: string[];
  @ApiPropertyOptional({ type: String, description: 'Comma separated industry ids' }) @IsOptional() @Transform(csvInt) industry_ids?: number[];

  @ApiPropertyOptional({ description: '"me", "all" or an employee id (the Lead By user of the lead)' })
  @IsOptional() @Matches(/^(me|all|\d+)$/, { message: 'lead_by must be "me", "all" or an employee id' }) lead_by?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'From (inclusive). Applies to Done on in the Completed tab.' }) @IsOptional() @Type(() => Date) date_from?: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'To (exclusive)' }) @IsOptional() @Type(() => Date) date_to?: Date;

  @ApiPropertyOptional({ description: 'Company, Company ID, contact, purpose or Lead ID' }) @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 10, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class ScheduleFollowUpBodyDto {
  @ApiPropertyOptional({ description: 'The lead it belongs to' }) @IsOptional() @Type(() => Number) @IsInt() lead_id?: number;
  @ApiPropertyOptional({ description: 'Or a company that is not yet a lead (a company with an open lead uses that lead)' }) @IsOptional() @Type(() => Number) @IsInt() company_id?: number;
  @ApiPropertyOptional({ description: 'person_id of a contact of the company; starts as the primary contact' }) @IsOptional() @Type(() => Number) @IsInt() contact_id?: number;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @IsOptional() @Type(() => Date) follow_up_on?: Date;
  @ApiPropertyOptional({ enum: CONVERSATION_TYPES }) @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional({ description: 'Employee id; starts as the Lead By user' }) @IsOptional() @Type(() => Number) @IsInt() assigned_to?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
}

export class ScheduleOnLeadBodyDto {
  @ApiPropertyOptional({ description: 'person_id; starts as the lead contact' }) @IsOptional() @Type(() => Number) @IsInt() contact_id?: number;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @IsOptional() @Type(() => Date) follow_up_on?: Date;
  @ApiPropertyOptional({ enum: CONVERSATION_TYPES, default: 'Call' }) @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional({ description: 'Employee id; starts as the Lead By user' }) @IsOptional() @Type(() => Number) @IsInt() assigned_to?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
}

export class EditFollowUpBodyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() contact_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() assigned_to?: number;
}

export class RescheduleBodyDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @IsOptional() @Type(() => Date) follow_up_on?: Date;
  @ApiPropertyOptional({ description: 'Why it moves (required)' }) @IsOptional() @IsString() reason?: string;
}

export class CancelBodyDto {
  @ApiPropertyOptional({ description: 'Why it will not be done (required)' }) @IsOptional() @IsString() reason?: string;
}

export class NextStepDto {
  @ApiProperty({ enum: NEXT_STEPS, description: 'schedule = Schedule next follow-up, qualify = Qualify lead, hold = Put on hold, lost = Mark as lost, none = No next step' })
  @IsOptional() @IsIn([...NEXT_STEPS]) action?: (typeof NEXT_STEPS)[number];

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'schedule / hold: the next follow-up or check-back date' }) @IsOptional() @Type(() => Date) follow_up_on?: Date;
  @ApiPropertyOptional({ enum: CONVERSATION_TYPES }) @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() assigned_to?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
  @ApiPropertyOptional({ description: 'hold: why the talks are paused' }) @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional({ description: 'lost: Lost reason master label' }) @IsOptional() @IsString() lost_reason?: string;
  @ApiPropertyOptional({ description: 'lost: note ("Other" needs one)' }) @IsOptional() @IsString() note?: string;
  @ApiPropertyOptional({ type: [String], description: 'qualify: corrects the Service Fit' })
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? [value] : value)) service_fit?: string[];
}

export class CompleteFollowUpBodyDto {
  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Starts as now; not before the follow-up was created' }) @IsOptional() @Type(() => Date) done_on?: Date;
  @ApiPropertyOptional({ enum: OUTCOMES }) @IsOptional() @IsString() outcome?: string;
  @ApiPropertyOptional({ description: 'Saved as a conversation on the lead' }) @IsOptional() @IsString() what_happened?: string;
  @ApiPropertyOptional({ type: NextStepDto }) @IsOptional() @ValidateNested() @Type(() => NextStepDto) next_step?: NextStepDto;
}
