import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString } from 'class-validator';

const bool = ({ value }: { value: unknown }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value);

export class FormatQueryDto {
  @ApiPropertyOptional({ enum: ['xlsx', 'csv'], default: 'xlsx' })
  @IsOptional() @IsIn(['xlsx', 'csv']) format?: 'xlsx' | 'csv';
}

export class CheckImportBodyDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string', nullable: true }, description: 'File column key -> field key (null = do not import). Starts as the automatic match.' })
  @IsOptional() @IsObject() mapping?: Record<string, string | null>;

  @ApiPropertyOptional({ description: 'Also create a lead for rows that have Lead Source, Lead By and Service Fit' })
  @IsOptional() @IsBoolean() create_leads?: boolean;

  @ApiPropertyOptional({ enum: ['skip', 'update_empty'], description: 'Rows already in the database: skip them, or fill only their empty fields' })
  @IsOptional() @IsIn(['skip', 'update_empty']) existing_rows?: 'skip' | 'update_empty';
}

export class ExportBodyDto {
  @ApiPropertyOptional({ type: [Number], description: 'Selected rows only. Without it, the whole current list (its filters are sent as the query string).' })
  @IsOptional() @IsArray() @ArrayMaxSize(10000) @Type(() => Number) @IsInt({ each: true }) ids?: number[];

  @ApiPropertyOptional({ enum: ['all', 'visible', 'custom'], default: 'all' })
  @IsOptional() @IsIn(['all', 'visible', 'custom']) columns?: 'all' | 'visible' | 'custom';

  @ApiPropertyOptional({ type: [String], description: 'Column keys, for "visible" and "custom"' })
  @IsOptional() @IsArray() @IsString({ each: true }) fields?: string[];

  @ApiPropertyOptional() @IsOptional() @Transform(bool) @IsBoolean() include_contacts?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(bool) @IsBoolean() include_conversations?: boolean;
  @ApiPropertyOptional({ description: 'Companies only: add the Next Follow-up column' }) @IsOptional() @Transform(bool) @IsBoolean() include_next_follow_up?: boolean;

  @ApiProperty({ enum: ['xlsx', 'csv'] }) @IsIn(['xlsx', 'csv']) format!: 'xlsx' | 'csv';
}

export class SetRightsBodyDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() can_import?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() can_export?: boolean;
}

export class HistoryQueryDto {
  @ApiPropertyOptional({ default: 50, maximum: 200 }) @IsOptional() @Type(() => Number) @IsInt() limit?: number;
}
