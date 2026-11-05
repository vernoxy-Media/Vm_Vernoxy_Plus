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

  @ApiProperty({ enum: ['uploaded', 'file_pending', 'not_ticked', 'locked', 'draft', 'final', 'issued', 'accepted', 'signed', 'declined'] })
  status!: 'uploaded' | 'file_pending' | 'not_ticked' | 'locked' | 'draft' | 'final' | 'issued' | 'accepted' | 'signed' | 'declined';

  @ApiPropertyOptional()
  is_required_for_activation?: boolean;

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
  candidate_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proposed_joining_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  offer_valid_till_date?: string;

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

export class EmployeeActivationStatusDto {
  @ApiProperty()
  can_activate!: boolean;

  @ApiProperty()
  is_already_active!: boolean;

  @ApiProperty({ type: [String] })
  missing_documents!: string[];

  @ApiProperty()
  total_required!: number;

  @ApiProperty()
  completed_required!: number;

  @ApiPropertyOptional()
  is_details_completed?: boolean;

  @ApiPropertyOptional({ type: [String] })
  missing_details?: string[];
}

export class ActivateEmployeeResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  emp_id!: number;

  @ApiProperty()
  office_email!: string;

  @ApiProperty()
  temporary_password!: string;

  @ApiProperty()
  must_change_password!: boolean;
}

export class CreateCustomDocumentDto {
  @ApiProperty({ type: String, example: 'Electricity Bill' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ type: Boolean, example: false })
  @IsOptional()
  @IsBoolean()
  is_required_for_activation?: boolean;
}


export class SendDocumentRequestDto {
  @ApiPropertyOptional({ type: String, example: 'candidate@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ type: String, example: 'Please upload these as soon as possible before your joining date.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SendDocumentRequestResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  sent_to!: string;

  @ApiProperty()
  candidate_name!: string;

  @ApiProperty()
  pending_count!: number;

  @ApiProperty()
  pending_documents!: Array<{
    title: string;
    category?: string;
    isRequired?: boolean;
    reason: 'ticked_pending' | 'required_unticked';
  }>;
}
