import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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
