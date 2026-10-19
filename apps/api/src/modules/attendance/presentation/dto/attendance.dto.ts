import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TimelineEventDto {
  @ApiProperty({ type: String, enum: ['punch_in', 'break_start', 'break_end', 'punch_out'] })
  type!: 'punch_in' | 'break_start' | 'break_end' | 'punch_out';

  @ApiProperty({ type: String, example: '2026-10-16T10:00:00.000Z' })
  at!: string;
}

export class TodayAttendanceBlockDto {
  @ApiProperty({ type: String, example: '2026-10-16T10:00:00.000Z' })
  server_now!: string;

  @ApiProperty({ type: String, example: '2026-10-16' })
  work_date!: string;

  @ApiProperty({ type: String, example: 'Asia/Kolkata' })
  timezone!: string;

  @ApiProperty({
    type: String,
    enum: [
      'not_started',
      'working',
      'on_break',
      'done',
      'on_leave',
      'holiday',
      'weekly_off',
    ],
  })
  state!: string;

  @ApiProperty({ type: Object, example: { worked_on_non_working_day: false } })
  flags!: Record<string, any>;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-10-16T10:00:00.000Z' })
  check_in_at?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-10-16T18:00:00.000Z' })
  check_out_at?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-10-16T13:00:00.000Z' })
  current_break_started_at?: string | null;

  @ApiProperty({ type: Number, example: 450 })
  worked_minutes_so_far!: number;

  @ApiProperty({ type: Number, example: 30 })
  break_minutes_so_far!: number;

  @ApiProperty({ type: Number, example: 480 })
  target_minutes!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 450 })
  production_minutes?: number | null;

  @ApiProperty({ type: () => [TimelineEventDto] })
  events!: TimelineEventDto[];

  @ApiPropertyOptional({ type: Object, nullable: true, example: null })
  leave?: { type_name: string; part: string } | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: null })
  holiday_name?: string | null;
}

export class MonthSummaryDto {
  @ApiProperty({ type: Number, example: 22 })
  scheduled_working_days!: number;

  @ApiProperty({ type: Number, example: 20 })
  days_present!: number;

  @ApiProperty({ type: Number, example: 18 })
  days_full!: number;

  @ApiProperty({ type: Number, example: 2 })
  days_half!: number;

  @ApiProperty({ type: Number, example: 0 })
  days_short!: number;

  @ApiProperty({ type: Number, example: 0 })
  days_incomplete!: number;

  @ApiProperty({ type: Number, example: 1 })
  days_absent!: number;

  @ApiProperty({ type: Number, example: 1.0 })
  leave_days!: number;

  @ApiProperty({ type: Number, example: 1 })
  holidays!: number;

  @ApiProperty({ type: Number, example: 8 })
  weekly_offs!: number;

  @ApiProperty({ type: Number, example: 9600 })
  total_production_minutes!: number;

  @ApiProperty({ type: Number, example: 600 })
  total_break_minutes!: number;

  @ApiProperty({ type: Number, example: 10080 })
  expected_minutes!: number;

  @ApiProperty({ type: Number, example: 480 })
  remaining_minutes!: number;
}

export class MonthDayItemDto {
  @ApiProperty({ type: String, example: '2026-10-01' })
  date!: string;

  @ApiProperty({
    type: String,
    enum: [
      'present',
      'half_day',
      'short',
      'incomplete',
      'leave',
      'holiday',
      'weekly_off',
      'absent',
      'upcoming',
    ],
  })
  state!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-10-01T10:00:00.000Z' })
  check_in_at?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-10-01T18:00:00.000Z' })
  check_out_at?: string | null;

  @ApiProperty({ type: Number, example: 450 })
  production_minutes!: number;

  @ApiProperty({ type: Number, example: 30 })
  break_minutes!: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'present' })
  day_status?: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  leave?: { type_name: string; part: string } | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  holiday_name?: string | null;

  @ApiProperty({ type: Object, example: { worked_on_non_working_day: false } })
  flags!: Record<string, any>;
}

export class DashboardStatsTodayDto {
  @ApiProperty({ type: Number, example: 450 })
  worked!: number;

  @ApiProperty({ type: Number, example: 480 })
  target!: number;
}

export class DashboardStatsWeekDto {
  @ApiProperty({ type: String, example: '2026-10-12' })
  start!: string;

  @ApiProperty({ type: String, example: '2026-10-18' })
  end!: string;

  @ApiProperty({ type: Number, example: 2250 })
  worked!: number;

  @ApiProperty({ type: Number, example: 2400 })
  target!: number;
}

export class DashboardStatsMonthDto {
  @ApiProperty({ type: Number, example: 9600 })
  worked!: number;

  @ApiProperty({ type: Number, example: 10080 })
  target!: number;
}

export class DashboardStatsDto {
  @ApiProperty({ type: () => DashboardStatsTodayDto })
  today!: DashboardStatsTodayDto;

  @ApiProperty({ type: () => DashboardStatsWeekDto })
  week!: DashboardStatsWeekDto;

  @ApiProperty({ type: () => DashboardStatsMonthDto })
  month!: DashboardStatsMonthDto;

  @ApiProperty({ type: Number, example: 480 })
  remaining_minutes!: number;
}

export class MonthBlockDto {
  @ApiProperty({ type: () => MonthSummaryDto })
  summary!: MonthSummaryDto;

  @ApiProperty({ type: () => [MonthDayItemDto] })
  days!: MonthDayItemDto[];

  @ApiProperty({ type: String, example: 'October 2026' })
  month_label!: string;

  @ApiProperty({ type: Boolean, example: true })
  is_current_month!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  can_go_next!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  can_go_prev!: boolean;
}

export class DashboardResponseDto {
  @ApiProperty({ type: () => TodayAttendanceBlockDto })
  today!: TodayAttendanceBlockDto;

  @ApiProperty({ type: () => DashboardStatsDto })
  stats!: DashboardStatsDto;

  @ApiProperty({ type: () => MonthBlockDto })
  month!: MonthBlockDto;
}

export class DayDetailBreakDto {
  @ApiProperty({ type: String, example: '2026-10-16T13:00:00.000Z' })
  started_at!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-10-16T13:30:00.000Z' })
  ended_at?: string | null;

  @ApiProperty({ type: Number, example: 30 })
  minutes!: number;
}

export class DayDetailDto {
  @ApiProperty({ type: String, example: '2026-10-16' })
  date!: string;

  @ApiProperty({ type: String, example: 'present' })
  state!: string;

  @ApiProperty({ type: () => [TimelineEventDto] })
  events!: TimelineEventDto[];

  @ApiProperty({ type: () => [DayDetailBreakDto] })
  breaks!: DayDetailBreakDto[];

  @ApiProperty({ type: Number, example: 450 })
  production_minutes!: number;

  @ApiProperty({ type: Number, example: 30 })
  break_minutes!: number;

  @ApiProperty({ type: String, example: 'present' })
  status!: string;

  @ApiPropertyOptional({ type: Object, nullable: true })
  leave?: { type_name: string; part: string } | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  holiday?: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  correction?: { id: number; status: string } | null;

  @ApiProperty({ type: Boolean, example: true })
  can_request_correction!: boolean;
}

export class CreateCorrectionDto {
  @ApiProperty({ type: String, example: '2026-10-15' })
  @IsString()
  @IsNotEmpty()
  work_date!: string;

  @ApiProperty({ type: String, example: '2026-10-15T09:30:00.000Z' })
  @IsString()
  @IsNotEmpty()
  requested_check_in_at!: string;

  @ApiProperty({ type: String, example: '2026-10-15T18:30:00.000Z' })
  @IsString()
  @IsNotEmpty()
  requested_check_out_at!: string;

  @ApiPropertyOptional({ type: Number, example: 30, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  requested_break_minutes?: number;

  @ApiProperty({ type: String, example: 'Forgot to punch in and out due to client visit' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class RejectCorrectionDto {
  @ApiProperty({ type: String, example: 'Punch times do not match client meeting log' })
  @IsString()
  @IsNotEmpty()
  rejection_reason!: string;
}

export class AdminUpsertDayDto {
  @ApiProperty({ type: String, example: '2026-10-15T10:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  check_in_at!: string;

  @ApiProperty({ type: String, example: '2026-10-15T18:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  check_out_at!: string;

  @ApiPropertyOptional({ type: Number, example: 30, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  break_minutes?: number;

  @ApiPropertyOptional({ type: String, example: 'Admin adjustment for on-site visit' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class TeamAttendanceQueryDto {
  @ApiPropertyOptional({ type: String, example: '2026-10-16' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ type: String, example: '2026-10' })
  @IsString()
  @IsOptional()
  month?: string;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  depId?: number;
}
