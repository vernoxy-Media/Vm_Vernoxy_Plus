import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class SaveTemplateDraftDto {
  @ApiProperty({
    description: 'Layout JSON (schema_version 1): title, letterhead_asset_id and sections with fields and options. ' +
      'Unknown sections, fields and options are ignored; missing ones get their defaults.',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  layout!: Record<string, unknown>;
}

export class PreviewTemplateDto {
  @ApiPropertyOptional({ description: 'Unsaved layout to try; omitted = the saved draft, else the approved version.', type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Real data for the test document. Salary Slip: { "year": 2026, "month": 11, "emp_id": 12 }. Omitted = sample data.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  subject?: Record<string, unknown>;
}
