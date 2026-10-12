import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class PersonLookupQueryDto {
  @ApiPropertyOptional({ type: String, description: 'Person email address to search' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ type: String, description: 'Person mobile number to search' })
  @IsOptional()
  @IsString()
  mobile?: string;
}

export class LinkedCompanyDto {
  @ApiProperty({ type: Number, example: 1 })
  company_id!: number;

  @ApiProperty({ type: String, example: 'Acme Corp' })
  name!: string;
}

export class PersonLookupMatchDto {
  @ApiProperty({ type: Number, example: 1 })
  person_id!: number;

  @ApiProperty({ type: String, example: 'Jane Doe' })
  name!: string;

  @ApiPropertyOptional({ type: String, example: 'jane.doe@acme.com', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ type: String, example: '+1234567890', nullable: true })
  mobile!: string | null;

  @ApiProperty({ type: () => [LinkedCompanyDto] })
  linked_companies!: LinkedCompanyDto[];
}
