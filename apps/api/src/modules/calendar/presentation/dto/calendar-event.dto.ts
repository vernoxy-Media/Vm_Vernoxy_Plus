import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import {
  CalendarEventStatus,
  CalendarEventType,
  CalendarRsvpStatus,
} from '../../domain/entities/calendar-event.entity';

export class CalendarEventsQueryDto {
  @ApiProperty({ example: '2026-10-18T00:00:00.000Z' })
  @IsDateString()
  start!: string;

  @ApiProperty({ example: '2026-10-25T23:59:59.999Z' })
  @IsDateString()
  end!: string;
}

export class CalendarAttendeeDto {
  @ApiProperty()
  attendee_id!: number;

  @ApiProperty()
  event_id!: number;

  @ApiProperty()
  employee_id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  profile_picture_url!: string | null;

  @ApiProperty({ enum: ['pending', 'accepted', 'declined', 'tentative'] })
  response_status!: CalendarRsvpStatus;

  @ApiProperty()
  is_optional!: boolean;

  @ApiPropertyOptional({ nullable: true })
  responded_at!: string | null;
}

export class CalendarEventResponseDto {
  @ApiProperty()
  event_id!: number;

  @ApiProperty({ enum: ['meeting', 'task_block', 'appointment', 'reminder'] })
  event_type!: CalendarEventType;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  start_time!: string;

  @ApiProperty()
  end_time!: string;

  @ApiProperty()
  is_all_day!: boolean;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiPropertyOptional({ nullable: true })
  meeting_link!: string | null;

  @ApiProperty({ enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] })
  status!: CalendarEventStatus;

  @ApiPropertyOptional({ nullable: true })
  task_id!: number | null;

  @ApiPropertyOptional({ nullable: true })
  task_code?: string | null;

  @ApiPropertyOptional({ nullable: true })
  task_stage?: string | null;

  @ApiProperty()
  organizer_id!: number;

  @ApiProperty()
  organizer_name!: string;

  @ApiProperty({ type: [CalendarAttendeeDto] })
  attendees!: CalendarAttendeeDto[];

  @ApiProperty()
  created_at!: string;

  @ApiProperty()
  row_version!: number;
}

export class UnscheduledTaskDto {
  @ApiProperty()
  task_id!: number;

  @ApiProperty()
  task_code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  priority!: string;

  @ApiProperty()
  stage!: string;

  @ApiPropertyOptional({ nullable: true })
  allocated_minutes!: number | null;

  @ApiPropertyOptional({ nullable: true })
  due_date!: string | null;
}
