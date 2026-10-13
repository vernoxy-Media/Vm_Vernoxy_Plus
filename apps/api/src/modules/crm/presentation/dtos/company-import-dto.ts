import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CompanyImportPreviewDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Duplicate resolution policy',
    enum: ['skip_duplicates', 'import_anyway'],
    default: 'skip_duplicates',
  })
  @IsOptional()
  @IsIn(['skip_duplicates', 'import_anyway'])
  duplicate_policy?: 'skip_duplicates' | 'import_anyway';

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether to import valid rows when some rows have validation errors',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  skip_invalid_rows?: boolean;
}

export class CompanyImportConfirmDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Duplicate resolution policy',
    enum: ['skip_duplicates', 'import_anyway'],
    default: 'skip_duplicates',
  })
  @IsOptional()
  @IsIn(['skip_duplicates', 'import_anyway'])
  duplicate_policy?: 'skip_duplicates' | 'import_anyway';

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether to import valid rows when some rows have validation errors',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  skip_invalid_rows?: boolean;
}
