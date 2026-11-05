import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CONVERSATION_TYPES, NOTE_TYPES, OUTCOMES } from '../../domain/services/activity-validator.service';

// Shape only. Business rules and their BFD messages live in the domain validators.

export class PageQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class NextFollowUpDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @IsOptional() @Type(() => Date) follow_up_on?: Date;
  @ApiPropertyOptional({ enum: CONVERSATION_TYPES }) @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional({ description: 'Employee id; defaults to the user who is logging' }) @IsOptional() @Type(() => Number) @IsInt() assigned_to?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
}

export class ConversationBodyDto {
  @ApiPropertyOptional({ enum: CONVERSATION_TYPES }) @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional({ description: 'person_id of a contact of the company' }) @IsOptional() @Type(() => Number) @IsInt() contact_id?: number;
  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Defaults to now; cannot be in the future' })
  @IsOptional() @Type(() => Date) communication_date?: Date;
  @ApiPropertyOptional({ description: 'Required, unless the call was not received' }) @IsOptional() @IsString() what_discussed?: string;
  @ApiPropertyOptional({ enum: OUTCOMES, description: 'Required in the Log Conversation popup, unless the call was not received' }) @IsOptional() @IsString() outcome?: string;
  @ApiPropertyOptional({ enum: ['Received', 'Not received'], description: 'Calls only. Received needs the call time and what was discussed; Not received needs a reason.' }) @IsOptional() @IsString() call_status?: string;
  @ApiPropertyOptional({ description: 'A call that was not received: the reason, from the Call Not Received Reasons list' }) @IsOptional() @IsString() not_received_reason?: string;
  @ApiPropertyOptional({ type: NextFollowUpDto, description: 'The "Schedule next follow-up" part, saved together with the conversation' })
  @IsOptional() @ValidateNested() @Type(() => NextFollowUpDto) next_follow_up?: NextFollowUpDto;
}

export class QuickLogBodyDto {
  @ApiProperty({ enum: [...CONVERSATION_TYPES, 'Note'] }) @IsIn([...CONVERSATION_TYPES, 'Note']) type!: string;
  @ApiPropertyOptional({ description: 'One line: what happened. Optional for a call that was not received.' }) @IsOptional() @IsString() text?: string;
  @ApiPropertyOptional({ enum: ['Received', 'Not received'] }) @IsOptional() @IsString() call_status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() not_received_reason?: string;
}

export class NoteBodyDto {
  @ApiPropertyOptional({ enum: NOTE_TYPES }) @IsOptional() @IsString() note_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
  @ApiPropertyOptional({ description: 'Keeps the note near the top of the timeline' }) @IsOptional() @IsBoolean() is_pinned?: boolean;
}

export class ContactBodyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designation?: string;
  @ApiPropertyOptional({ description: '10 digits; "+91 98250 41236" is accepted' }) @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional({ description: 'Send true after the user confirms the person is not the same as at the other company' })
  @IsOptional() @IsBoolean() confirm_duplicate?: boolean;
}

export class QualifyBodyDto {
  @ApiPropertyOptional({ type: [String], description: 'Corrects the Service Fit in the Qualify popup' })
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? [value] : value)) service_fit?: string[];
}

export class HoldBodyDto {
  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Check-back date; becomes a Pending follow-up' }) @IsOptional() @Type(() => Date) follow_up_on?: Date;
  @ApiPropertyOptional({ enum: CONVERSATION_TYPES, default: 'Call' }) @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional({ description: 'Employee id; defaults to the Lead By user' }) @IsOptional() @Type(() => Number) @IsInt() assigned_to?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
  @ApiPropertyOptional({ description: 'Why the talks are paused' }) @IsOptional() @IsString() reason?: string;
}

export class LostBodyDto {
  @ApiPropertyOptional({ description: 'Lost reason master label. "Other" needs a note.' }) @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class MoveStageBodyDto {
  @ApiProperty({ enum: ['New', 'Contacted', 'Qualified', 'On Hold', 'Lost'], description: 'The stage to move the lead to' }) @IsIn(['New', 'Contacted', 'Qualified', 'On Hold', 'Lost']) to!: string;
  @ApiPropertyOptional({ description: 'Required when moving to Lost: a Lost Reasons label' }) @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional({ description: 'Required when the Lost reason is "Other"' }) @IsOptional() @IsString() note?: string;
}

export class ChangeLeadByBodyDto {
  @ApiPropertyOptional({ description: 'Employee id of the new Lead By user' }) @IsOptional() @Type(() => Number) @IsInt() lead_by_id?: number;
}
