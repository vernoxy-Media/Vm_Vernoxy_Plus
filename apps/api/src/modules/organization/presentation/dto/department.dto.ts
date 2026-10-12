import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDepartmentDto {
  @ApiProperty({ type: String, example: 'Engineering', description: 'Department name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ type: String, example: 'Product Engineering', description: 'Department name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ type: Boolean, example: true, description: 'Department active status' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class DepartmentQueryDto {
  @ApiPropertyOptional({ type: String, description: 'Search query for name' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: Number, description: 'Limit number of results', default: 50 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  limit?: number;

  @ApiPropertyOptional({ type: String, description: 'Keyset cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class DepartmentOptionDto {
  @ApiProperty({ type: Number, example: 1 })
  dep_id!: number;

  @ApiProperty({ type: String, example: 'Engineering' })
  name!: string;
}

export class DepartmentResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  dep_id!: number;

  @ApiProperty({ type: String, example: 'Engineering' })
  name!: string;

  @ApiProperty({ type: Boolean, example: true })
  is_active!: boolean;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-10-10T12:00:00Z' })
  created_at!: Date;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  created_by!: number | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', example: '2026-10-10T12:00:00Z', nullable: true })
  updated_at!: Date | null;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  updated_by!: number | null;
}

export class DepartmentListResponseDto {
  @ApiProperty({ type: () => [DepartmentResponseDto] })
  items!: DepartmentResponseDto[];

  @ApiPropertyOptional({ type: String, example: 'eyJpZCI6MTB9', nullable: true })
  next_cursor!: string | null;
}
