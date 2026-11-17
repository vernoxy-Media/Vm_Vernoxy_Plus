import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../../../auth/public-api';
import { OrganizationAdminGuard } from '../guards/organization-admin.guard';
import { EmployeeDocumentChecklistService } from '../../application/services/employee-document-checklist.service';

export class CreateChecklistDocumentDto {
  @ApiProperty({ description: 'Document name, e.g. "Driving Licence"' })
  @IsString()
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional({ description: 'Needed before the employee can be activated' })
  @IsOptional()
  @IsBoolean()
  is_required_for_activation?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) display_order?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class UpdateChecklistDocumentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_required_for_activation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) display_order?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

/** Settings -> Employee Documents: the standard document checklist every employee gets (Admin). */
@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationAdminGuard)
@Controller('employee-document-checklist')
export class EmployeeDocumentChecklistController {
  constructor(private readonly checklist: EmployeeDocumentChecklistService) {}

  @Get()
  @ApiOperation({ summary: 'The document checklist, with how many employees have each document' })
  list() {
    return this.checklist.listForSettings();
  }

  @Post()
  @ApiOperation({ summary: 'Add a document every new employee gets' })
  create(@Body() dto: CreateChecklistDocumentDto, @Req() req: any) {
    return this.checklist.create(dto, Number(req.user?.emp_id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename, make required / optional, reorder, switch on / off' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChecklistDocumentDto, @Req() req: any) {
    return this.checklist.update(id, dto, Number(req.user?.emp_id));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an unused document, or switch off one employees already have' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.checklist.remove(id, Number(req.user?.emp_id));
  }
}
