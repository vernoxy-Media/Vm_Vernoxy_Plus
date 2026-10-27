import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class EmployeeDocumentItemDto {
  @ApiProperty()
  doc_id!: number;

  @ApiProperty()
  emp_id!: number;

  @ApiProperty({ enum: ['given_to_employee', 'taken_from_employee', 'agreement'] })
  category!: 'given_to_employee' | 'taken_from_employee' | 'agreement';

  @ApiProperty()
  document_type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  is_ticked!: boolean;

  @ApiProperty({ enum: ['uploaded', 'file_pending', 'not_ticked', 'locked', 'draft', 'final'] })
  status!: 'uploaded' | 'file_pending' | 'not_ticked' | 'locked' | 'draft' | 'final';

  @ApiPropertyOptional()
  file_url?: string | null;

  @ApiPropertyOptional()
  file_name?: string | null;

  @ApiPropertyOptional()
  file_size?: number | null;

  @ApiPropertyOptional()
  mime_type?: string | null;

  @ApiPropertyOptional()
  draft_content?: string | null;

  @ApiPropertyOptional()
  template_id?: number | null;

  @ApiPropertyOptional()
  issued_at?: string | null;

  @ApiProperty()
  created_at!: string;

  @ApiPropertyOptional()
  updated_at?: string | null;
}

export class DocumentTemplateItemDto {
  @ApiProperty()
  template_id!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  document_type!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  content_html!: string;

  @ApiProperty()
  is_active!: boolean;
}

export class ToggleDocumentDto {
  @ApiProperty()
  @IsBoolean()
  is_ticked!: boolean;
}

export class GenerateDocumentDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  template_id?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document_type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proposed_joining_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  custom_salary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  custom_pf?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinalizeDocumentDraftDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document_type!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  final_content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
