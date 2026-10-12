import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ListCustomerTypesQueryDto {
  @ApiPropertyOptional({ type: String, description: 'Search term by name' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: Number, description: 'Pagination limit (1-100)', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ type: Number, description: 'Keyset pagination cursor' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cursor?: number;
}

export class CreateCustomerTypeDto {
  @ApiProperty({ type: String, description: 'Customer type name', example: 'Enterprise' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateCustomerTypeDto {
  @ApiPropertyOptional({ type: String, description: 'Customer type name', example: 'Key Account' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: Boolean, description: 'Active status', example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ type: Boolean, description: 'Set as default customer type', example: true })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

export class CustomerTypeItemDto {
  @ApiProperty({ type: Number, example: 1 })
  customer_type_id!: number;

  @ApiProperty({ type: String, example: 'Client' })
  name!: string;

  @ApiProperty({ type: Boolean, example: true })
  is_active!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  is_default!: boolean;
}

export class ListCustomerTypesResponseDto {
  @ApiProperty({ type: () => [CustomerTypeItemDto] })
  items!: CustomerTypeItemDto[];

  @ApiPropertyOptional({ example: 10, nullable: true, type: Number })
  next_cursor!: number | null;
}

export class CustomerTypeOptionDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'Client' })
  name!: string;

  @ApiProperty({ type: Boolean, example: false })
  is_default!: boolean;
}
