import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssigneeItemDto {
  @ApiProperty({ description: 'Employee ID to assign software to' })
  @IsInt()
  emp_id!: number;

  @ApiPropertyOptional({ description: 'Employee account login / email / license username' })
  @IsOptional()
  @IsString()
  login_account_id?: string;

  @ApiPropertyOptional({ description: 'Assignment remarks' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateSoftwareLicenseDto {
  @ApiProperty({ description: 'Software Name (e.g. Figma, Adobe CC, GitHub Enterprise)' })
  @IsString()
  software_name!: string;

  @ApiPropertyOptional({ description: 'Vendor ID from software_license_vendors' })
  @IsOptional()
  @IsInt()
  vendor_id?: number;

  @ApiPropertyOptional({ description: 'Vendor Name (if creating new vendor on the fly)' })
  @IsOptional()
  @IsString()
  vendor_name?: string;

  @ApiProperty({ description: 'Category ID from software_license_categories' })
  @IsInt()
  category_id!: number;

  @ApiProperty({ description: 'License type (Subscription, Perpetual, Floating/Shared, Usage-Based, Free/Open-Source, Trial)' })
  @IsString()
  license_type!: string;

  @ApiPropertyOptional({ description: 'Total licensed seats (null if unlimited/free)' })
  @IsOptional()
  @IsInt()
  total_seats?: number;

  @ApiProperty({ description: 'Software Owner Employee ID' })
  @IsInt()
  software_owner_id!: number;

  @ApiPropertyOptional({ description: 'Bought From (e.g., Direct, Reseller, AWS Marketplace)' })
  @IsOptional()
  @IsString()
  bought_from?: string;

  @ApiPropertyOptional({ description: 'License key, serial, activation token' })
  @IsOptional()
  @IsString()
  license_key?: string;

  @ApiPropertyOptional({ description: 'Auto-renews flag' })
  @IsOptional()
  @IsBoolean()
  auto_renews?: boolean;

  // Initial Term details
  @ApiPropertyOptional({ description: 'Purchase date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  purchase_date?: string;

  @ApiProperty({ description: 'License term start date (YYYY-MM-DD)' })
  @IsString()
  start_date!: string;

  @ApiPropertyOptional({ description: 'License term expiry date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  expiry_date?: string;

  @ApiPropertyOptional({ description: 'Billing cycle (Monthly, Quarterly, Half-Yearly, Annual, Biennial, Custom, None)' })
  @IsOptional()
  @IsString()
  billing_cycle?: string;

  @ApiPropertyOptional({ description: 'Term cost amount' })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ description: 'Invoice or purchase order number' })
  @IsOptional()
  @IsString()
  invoice_order_no?: string;

  @ApiPropertyOptional({ description: 'Internal expense claim number' })
  @IsOptional()
  @IsString()
  expense_claim_no?: string;

  @ApiPropertyOptional({ description: 'Term notes / remarks' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ description: 'IDs of pre-uploaded attachments in attachments table' })
  @IsOptional()
  @IsArray()
  attachment_ids?: number[];
}

export class UpdateSoftwareLicenseDto {
  @ApiPropertyOptional({ description: 'Software Name' })
  @IsOptional()
  @IsString()
  software_name?: string;

  @ApiPropertyOptional({ description: 'Vendor ID' })
  @IsOptional()
  @IsInt()
  vendor_id?: number;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsInt()
  category_id?: number;

  @ApiPropertyOptional({ description: 'License type' })
  @IsOptional()
  @IsString()
  license_type?: string;

  @ApiPropertyOptional({ description: 'Total licensed seats' })
  @IsOptional()
  @IsInt()
  total_seats?: number;

  @ApiPropertyOptional({ description: 'Software Owner Employee ID' })
  @IsOptional()
  @IsInt()
  software_owner_id?: number;

  @ApiPropertyOptional({ description: 'Bought From' })
  @IsOptional()
  @IsString()
  bought_from?: string;

  @ApiPropertyOptional({ description: 'License key' })
  @IsOptional()
  @IsString()
  license_key?: string;

  @ApiPropertyOptional({ description: 'Auto-renews flag' })
  @IsOptional()
  @IsBoolean()
  auto_renews?: boolean;
}

export class RenewLicenseDto {
  @ApiProperty({ description: 'Term start date (YYYY-MM-DD)' })
  @IsString()
  start_date!: string;

  @ApiPropertyOptional({ description: 'Term expiry date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  expiry_date?: string;

  @ApiPropertyOptional({ description: 'Billing cycle' })
  @IsOptional()
  @IsString()
  billing_cycle?: string;

  @ApiPropertyOptional({ description: 'Total cost for this new term' })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ description: 'Updated seat capacity if changed' })
  @IsOptional()
  @IsInt()
  total_seats?: number;

  @ApiPropertyOptional({ description: 'Invoice / Purchase Order number' })
  @IsOptional()
  @IsString()
  invoice_order_no?: string;

  @ApiPropertyOptional({ description: 'Expense claim number' })
  @IsOptional()
  @IsString()
  expense_claim_no?: string;

  @ApiPropertyOptional({ description: 'Remarks' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ description: 'IDs of pre-uploaded attachments' })
  @IsOptional()
  @IsArray()
  attachment_ids?: number[];
}

export class AssignLicenseDto {
  @ApiProperty({ description: 'List of employee assignment items', type: [AssigneeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssigneeItemDto)
  assignments!: AssigneeItemDto[];

  @ApiProperty({ description: 'Assigned from date (YYYY-MM-DD)' })
  @IsString()
  assigned_from!: string;
}

export class RevokeLicenseDto {
  @ApiProperty({ description: 'Revocation date (YYYY-MM-DD)' })
  @IsString()
  revoked_on!: string;

  @ApiProperty({ description: 'Revocation reason ID' })
  @IsInt()
  revoke_reason_id!: number;

  @ApiPropertyOptional({ description: 'Revocation remarks' })
  @IsOptional()
  @IsString()
  revoke_remarks?: string;

  @ApiPropertyOptional({ description: 'Transfer license directly to another employee ID' })
  @IsOptional()
  @IsInt()
  transferred_to_emp_id?: number;
}

export class DiscontinueLicenseDto {
  @ApiProperty({ description: 'Effective discontinuation date (YYYY-MM-DD)' })
  @IsString()
  discontinue_date!: string;

  @ApiProperty({ description: 'Discontinue reason ID' })
  @IsInt()
  discontinue_reason_id!: number;

  @ApiPropertyOptional({ description: 'Discontinuation remarks' })
  @IsOptional()
  @IsString()
  discontinue_remarks?: string;

  @ApiPropertyOptional({ description: 'Replaced by another active software ID' })
  @IsOptional()
  @IsInt()
  replaced_by_software_id?: number;
}

export class QuerySoftwareLicenseDto {
  @ApiPropertyOptional({ description: 'Search term for name, code, or vendor' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category_id?: number;

  @ApiPropertyOptional({ description: 'Filter by vendor ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vendor_id?: number;

  @ApiPropertyOptional({ description: 'Filter by status (Active, Expiring Soon, Expired, Discontinued, Trial)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by license type' })
  @IsOptional()
  @IsString()
  license_type?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: 'Page limit' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
