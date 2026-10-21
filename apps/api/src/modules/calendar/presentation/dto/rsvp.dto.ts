import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CalendarRsvpStatus } from '../../domain/entities/calendar-event.entity';

export class RespondRsvpDto {
  @ApiProperty({
    enum: ['accepted', 'declined', 'tentative'],
    example: 'accepted',
  })
  @IsEnum(['accepted', 'declined', 'tentative'])
  response_status!: CalendarRsvpStatus;
}
