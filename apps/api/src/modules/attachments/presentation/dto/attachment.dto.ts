
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsNumber,
  IsOptional,
  Length,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttachmentDto {
  @ApiProperty({ description: 'Parent entity type', example: 'EXPENSE_CLAIM' })
  @IsString()
  @Length(1, 50)
  entity_type!: string;

  @ApiPropertyOptional({ description: 'Parent entity ID (0 if pending creation)', example: 101, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  entity_id?: number;

  @ApiProperty({ description: 'Original file name', example: 'flight_invoice.pdf' })
  @IsString()
  @Length(1, 255)
  file_name!: string;

  @ApiProperty({ description: 'Accessible file URL or storage path', example: '/files/attachments/EXPENSE_CLAIM/101/invoice.pdf' })
  @IsString()
  @Length(1, 500)
  file_url!: string;

  @ApiProperty({ description: 'File size in bytes (max 25MB = 26214400)', example: 1048576 })
  @IsNumber()
  @Min(1)
  @Max(26214400)
  @Type(() => Number)
  file_size_bytes!: number;

  @ApiProperty({ description: 'MIME type', example: 'application/pdf' })
  @IsString()
  @Length(1, 100)
  mime_type!: string;

  @ApiPropertyOptional({ description: 'Display order', default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  display_order?: number;
}

export class UploadAttachmentDto {
  @ApiProperty({ description: 'Parent entity type', example: 'EXPENSE_CLAIM' })
  @IsString()
  @Length(1, 50)
  entity_type!: string;

  @ApiPropertyOptional({ description: 'Parent entity ID (0 if pending creation)', example: 101, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  entity_id?: number;

  @ApiPropertyOptional({ description: 'Display order', default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  display_order?: number;
}

export class ReorderAttachmentsDto {
  @ApiProperty({ description: 'Array of attachment IDs in the desired order', example: [3, 1, 2] })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  attachment_ids!: number[];
}
