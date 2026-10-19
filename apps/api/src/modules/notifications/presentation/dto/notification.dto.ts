import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class NotificationResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  notification_id!: number;

  @ApiProperty({ type: Number, example: 10 })
  recipient_id!: number;

  @ApiProperty({ type: String, example: 'task_assigned' })
  kind!: string;

  @ApiProperty({ type: String, example: 'New Task Assigned' })
  title!: string;

  @ApiPropertyOptional({ type: String, example: 'You have been assigned to task TSK-2026-0001', nullable: true })
  body!: string | null;

  @ApiPropertyOptional({ type: String, example: 'task', nullable: true })
  entity_type!: string | null;

  @ApiPropertyOptional({ type: Number, example: 42, nullable: true })
  entity_id!: number | null;

  @ApiPropertyOptional({ type: Date, example: '2026-10-19T10:00:00Z', nullable: true })
  read_at!: Date | null;

  @ApiProperty({ type: Date, example: '2026-10-19T09:30:00Z' })
  created_at!: Date;
}

export class NotificationsQueryDto {
  @ApiPropertyOptional({ type: Number, example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ type: Number, example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ type: Boolean, example: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unread_only?: boolean;
}

export class UnreadCountResponseDto {
  @ApiProperty({ type: Number, example: 3 })
  unread_count!: number;
}

export class MarkReadResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  success!: boolean;
}

export class MarkAllReadResponseDto {
  @ApiProperty({ type: Number, example: 5 })
  marked_count!: number;
}
