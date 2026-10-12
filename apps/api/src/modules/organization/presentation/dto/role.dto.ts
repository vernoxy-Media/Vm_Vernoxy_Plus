import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRoleDto {
  @ApiProperty({ type: String, example: 'Software Engineer', description: 'Role name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  role_name!: string;

  @ApiProperty({ type: Number, example: 1, description: 'Department ID this role belongs to' })
  @IsInt()
  @IsNotEmpty()
  dep_id!: number;

  @ApiPropertyOptional({ type: String, example: 'Develops platform features', description: 'Role description' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ type: String, example: 'Senior Software Engineer', description: 'Role name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  role_name?: string;

  @ApiPropertyOptional({ type: String, example: 'Leads platform development', description: 'Role description' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ type: Boolean, example: true, description: 'Role active status' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class RoleQueryDto {
  @ApiPropertyOptional({ type: Number, description: 'Filter by department ID' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  dep_id?: number;

  @ApiPropertyOptional({ type: String, description: 'Search query for role name' })
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

export class RoleOptionDto {
  @ApiProperty({ type: Number, example: 1 })
  role_id!: number;

  @ApiProperty({ type: String, example: 'Software Engineer' })
  role_name!: string;
}

export class RoleResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  role_id!: number;

  @ApiProperty({ type: String, example: 'Software Engineer' })
  role_name!: string;

  @ApiProperty({ type: Number, example: 1 })
  dep_id!: number;

  @ApiPropertyOptional({ type: String, example: 'Develops platform features', nullable: true })
  description!: string | null;

  @ApiProperty({ type: Boolean, example: true })
  is_active!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  is_admin!: boolean;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-10-10T12:00:00Z' })
  created_at!: Date;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  created_by!: number | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', example: '2026-10-10T12:00:00Z', nullable: true })
  updated_at!: Date | null;

  @ApiPropertyOptional({ type: Number, example: 1, nullable: true })
  updated_by!: number | null;
}

export class RoleListResponseDto {
  @ApiProperty({ type: () => [RoleResponseDto] })
  items!: RoleResponseDto[];

  @ApiPropertyOptional({ type: String, example: 'eyJpZCI6MTB9', nullable: true })
  next_cursor!: string | null;
}
