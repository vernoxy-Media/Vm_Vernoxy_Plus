import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Shape only; the rules and their BFD messages live in the domain validators.

export class ConvertToClientBodyDto {
  @ApiPropertyOptional({ example: '2026-10-26', description: 'Won on: the date the company said yes (YYYY-MM-DD). Today or a past date, not before the lead was added.' })
  @IsOptional() @IsString() won_on?: string;

  @ApiPropertyOptional({ description: 'Win note: what was agreed, such as the PO or the scope. Saved on the lead and the client.' })
  @IsOptional() @IsString() win_note?: string;
}

export class ReverseConversionBodyDto {
  @ApiPropertyOptional({ description: 'Why the conversion is reversed (required)' })
  @IsOptional() @IsString() reason?: string;
}

export class ListClientsQueryDto {
  @ApiPropertyOptional({ description: 'Search the client or company name, Client ID, company ID or city' })
  @IsOptional() @IsString() q?: string;

  @ApiPropertyOptional({ enum: ['won_on', 'name', 'created_at'], default: 'won_on' })
  @IsOptional() @IsIn(['won_on', 'name', 'created_at']) sort?: 'won_on' | 'name' | 'created_at';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
