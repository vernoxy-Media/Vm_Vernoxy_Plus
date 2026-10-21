import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CalendarEventType } from '../../domain/entities/calendar-event.entity';

export class CreateCalendarEventDto {
  @ApiProperty({
    enum: ['meeting', 'task_block', 'appointment', 'reminder'],
    default: 'meeting',
  })
  @IsEnum(['meeting', 'task_block', 'appointment', 'reminder'])
  event_type!: CalendarEventType;

  @ApiProperty({ example: 'Sprint Planning Meeting' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'Discussing goals and backlog for Sprint 42' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-10-21T10:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  start_time!: string;

  @ApiProperty({ example: '2026-10-21T11:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  end_time!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_all_day?: boolean;

  @ApiPropertyOptional({ example: 'Conference Room 3A' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  meeting_link?: string;

  @ApiPropertyOptional({ example: 42, description: 'Task ID to time-block on calendar' })
  @IsOptional()
  @IsInt()
  task_id?: number;

  @ApiPropertyOptional({ type: [Number], example: [2, 3, 5] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  attendee_ids?: number[];
}
