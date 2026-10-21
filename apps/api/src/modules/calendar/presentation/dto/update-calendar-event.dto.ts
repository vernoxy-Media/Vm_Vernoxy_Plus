import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  CalendarEventStatus,
  CalendarEventType,
} from '../../domain/entities/calendar-event.entity';

export class UpdateCalendarEventDto {
  @ApiPropertyOptional({
    enum: ['meeting', 'task_block', 'appointment', 'reminder'],
  })
  @IsOptional()
  @IsEnum(['meeting', 'task_block', 'appointment', 'reminder'])
  event_type?: CalendarEventType;

  @ApiPropertyOptional({ example: 'Updated Sprint Planning' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2026-10-21T10:30:00.000Z' })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiPropertyOptional({ example: '2026-10-21T11:30:00.000Z' })
  @IsOptional()
  @IsString()
  end_time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_all_day?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  meeting_link?: string;

  @ApiPropertyOptional({
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['scheduled', 'in_progress', 'completed', 'cancelled'])
  status?: CalendarEventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  task_id?: number | null;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  attendee_ids?: number[];
}
