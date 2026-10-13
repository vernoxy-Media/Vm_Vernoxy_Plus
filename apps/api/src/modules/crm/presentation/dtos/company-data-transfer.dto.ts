import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JobTotalsDto {
  @ApiProperty({ type: Number, example: 100 })
  total_rows!: number;

  @ApiProperty({ type: Number, example: 85 })
  will_create!: number;

  @ApiProperty({ type: Number, example: 10 })
  will_skip_duplicates!: number;

  @ApiProperty({ type: Number, example: 5 })
  warning_rows!: number;

  @ApiProperty({ type: Number, example: 5 })
  error_rows!: number;
}

export class JobCountsDto {
  @ApiProperty({ type: Number, example: 100 })
  total!: number;

  @ApiProperty({ type: Number, example: 90 })
  valid!: number;

  @ApiProperty({ type: Number, example: 5 })
  warnings!: number;

  @ApiProperty({ type: Number, example: 5 })
  errors!: number;

  @ApiProperty({ type: Number, example: 50 })
  processed!: number;

  @ApiProperty({ type: Number, example: 45 })
  created!: number;

  @ApiProperty({ type: Number, example: 5 })
  skipped!: number;

  @ApiProperty({ type: Number, example: 0 })
  failed!: number;
}

export class JobIssueDto {
  @ApiProperty({ type: Number, example: 3 })
  row_number!: number;

  @ApiProperty({ type: String, example: 'phone' })
  field_name!: string;

  @ApiProperty({ type: String, example: 'INVALID_PHONE' })
  issue_code!: string;

  @ApiProperty({ type: String, example: 'Phone number format is invalid' })
  message!: string;

  @ApiProperty({ type: String, enum: ['warning', 'error'], example: 'error' })
  severity!: 'warning' | 'error';
}

export class CompanyImportPreviewResponseDto {
  @ApiProperty({ type: String, example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  job_id!: string;

  @ApiProperty({ type: String, enum: ['previewed', 'pending', 'running', 'completed', 'failed', 'cancelled'] })
  status!: string;

  @ApiProperty({ type: () => JobTotalsDto })
  totals!: JobTotalsDto;

  @ApiProperty({ type: () => [JobIssueDto] })
  sample_issues!: JobIssueDto[];

  @ApiProperty({ type: Boolean, example: true })
  can_proceed!: boolean;
}

export class CompanyImportConfirmResponseDto {
  @ApiProperty({ type: String, example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  job_id!: string;

  @ApiProperty({ type: String, example: 'queued' })
  status!: string;

  @ApiProperty({ type: String, example: 'Import job scheduled successfully' })
  message!: string;
}

export class DataTransferJobDetailResponseDto {
  @ApiProperty({ type: String, example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  job_id!: string;

  @ApiProperty({ type: String, enum: ['import', 'export'] })
  direction!: string;

  @ApiProperty({ type: String, example: 'companies' })
  entity_type!: string;

  @ApiProperty({ type: String, enum: ['xlsx', 'csv'] })
  format!: string;

  @ApiProperty({ type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] })
  status!: string;

  @ApiProperty({ type: () => JobCountsDto })
  counts!: JobCountsDto;

  @ApiProperty({ type: Number, example: 75 })
  percentage!: number;

  @ApiPropertyOptional({ type: String, example: null })
  error_message?: string | null;

  @ApiProperty({ type: Date })
  created_at!: Date;

  @ApiPropertyOptional({ type: Date })
  started_at?: Date | null;

  @ApiPropertyOptional({ type: Date })
  finished_at?: Date | null;

  @ApiPropertyOptional({ type: Boolean, example: false })
  has_report?: boolean;
}

export class TransferJobSummaryDto {
  @ApiProperty({ type: String, example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  job_id!: string;

  @ApiProperty({ type: String, enum: ['import', 'export'] })
  direction!: string;

  @ApiProperty({ type: String, example: 'companies' })
  entity_type!: string;

  @ApiProperty({ type: String, enum: ['xlsx', 'csv'] })
  format!: string;

  @ApiProperty({ type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] })
  status!: string;

  @ApiProperty({ type: Number, example: 100 })
  total_rows!: number;

  @ApiProperty({ type: Number, example: 100 })
  processed_rows!: number;

  @ApiProperty({ type: Number, example: 95 })
  created_rows!: number;

  @ApiProperty({ type: Number, example: 5 })
  skipped_rows!: number;

  @ApiProperty({ type: Number, example: 0 })
  failed_rows!: number;

  @ApiProperty({ type: Boolean, example: false })
  has_report!: boolean;

  @ApiProperty({ type: Date })
  created_at!: Date;

  @ApiPropertyOptional({ type: Date })
  finished_at?: Date | null;
}

export class TransferJobIssuesResponseDto {
  @ApiProperty({ type: () => [JobIssueDto] })
  issues!: JobIssueDto[];

  @ApiPropertyOptional({ type: String, example: 'eyJpZCI6MTB9' })
  next_cursor?: string | null;

  @ApiProperty({ type: Number, example: 12 })
  total_count!: number;
}

export class TransferJobListResponseDto {
  @ApiProperty({ type: () => [TransferJobSummaryDto] })
  jobs!: TransferJobSummaryDto[];

  @ApiPropertyOptional({ type: String, example: 'eyJpZCI6MTB9' })
  next_cursor?: string | null;
}
