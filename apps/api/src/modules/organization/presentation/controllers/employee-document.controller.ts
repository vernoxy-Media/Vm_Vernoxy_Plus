import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { OrganizationAdminGuard } from '../guards/organization-admin.guard';
import { EmployeeDocumentService } from '../../application/services/employee-document.service';
import {
  EmployeeDocumentItemDto,
  DocumentTemplateItemDto,
  ToggleDocumentDto,
  GenerateDocumentDraftDto,
  FinalizeDocumentDraftDto,
  EmployeeActivationStatusDto,
  ActivateEmployeeResponseDto,
} from '../dto/employee-document.dto';

@ApiTags('Organization Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationAdminGuard)
@Controller()
export class EmployeeDocumentController {
  constructor(private readonly documentService: EmployeeDocumentService) {}

  @Get('employees/:id/activation-status')
  @ApiOperation({ summary: 'Check if employee has uploaded all mandatory documents to activate account' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: EmployeeActivationStatusDto })
  async getActivationStatus(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EmployeeActivationStatusDto> {
    return this.documentService.getActivationEligibility(id);
  }

  @Post('employees/:id/activate')
  @ApiOperation({ summary: 'Activate employee account and generate temporary login credentials' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: ActivateEmployeeResponseDto })
  async activateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<ActivateEmployeeResponseDto> {
    const adminId = req.user?.emp_id || 1;
    return this.documentService.activateEmployee(id, adminId);
  }

  @Post('employees/:id/resend-login')
  @ApiOperation({ summary: 'Resend login credentials (generates a new temporary password, Part 7)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: ActivateEmployeeResponseDto })
  async resendLogin(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<ActivateEmployeeResponseDto> {
    const adminId = req.user?.emp_id || 1;
    return this.documentService.resendLogin(id, adminId);
  }

  @Get('employees/:id/documents')
  @ApiOperation({ summary: 'List all employee documents grouped with statuses' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: [EmployeeDocumentItemDto] })
  async listDocuments(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EmployeeDocumentItemDto[]> {
    return this.documentService.getEmployeeDocuments(id);
  }

  @Put('employees/:id/documents/:documentType/toggle')
  @ApiOperation({ summary: 'Toggle tick status for a document' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'documentType', type: String })
  @ApiResponse({ status: 200, type: EmployeeDocumentItemDto })
  async toggleDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentType') documentType: string,
    @Body() dto: ToggleDocumentDto,
    @Req() req: any,
  ): Promise<EmployeeDocumentItemDto> {
    const adminId = req.user?.emp_id || 1;
    return this.documentService.toggleDocument(id, documentType, dto.is_ticked, adminId);
  }

  @Post('employees/:id/documents/:documentType/upload')
  @ApiOperation({ summary: 'Upload document file scan' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'documentType', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async uploadFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentType') documentType: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<EmployeeDocumentItemDto> {
    if (!file) {
      throw new BadRequestException('File is required for upload');
    }
    const adminId = req.user?.emp_id || 1;
    return this.documentService.uploadDocumentFile(id, documentType, file, adminId);
  }

  @Delete('employees/:id/documents/:documentType/file')
  @ApiOperation({ summary: 'Remove uploaded document file' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'documentType', type: String })
  async removeFile(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentType') documentType: string,
    @Req() req: any,
  ): Promise<EmployeeDocumentItemDto> {
    const adminId = req.user?.emp_id || 1;
    return this.documentService.removeDocumentFile(id, documentType, adminId);
  }

  @Get('document-templates')
  @ApiOperation({ summary: 'List active letter templates' })
  @ApiResponse({ status: 200, type: [DocumentTemplateItemDto] })
  async listTemplates(
    @Query('document_type') documentType?: string,
  ): Promise<DocumentTemplateItemDto[]> {
    return this.documentService.listTemplates(documentType);
  }

  @Post('employees/:id/documents/generate-draft')
  @ApiOperation({ summary: 'Auto-fill template and generate document draft' })
  @ApiParam({ name: 'id', type: Number })
  async generateDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateDocumentDraftDto,
    @Req() req: any,
  ): Promise<{ draft_content: string; document: EmployeeDocumentItemDto }> {
    const adminId = req.user?.emp_id || 1;
    return this.documentService.generateDraft(id, dto, adminId);
  }

  @Post('employees/:id/documents/finalize')
  @ApiOperation({ summary: 'Finalize and issue document draft' })
  @ApiParam({ name: 'id', type: Number })
  async finalizeDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FinalizeDocumentDraftDto,
    @Req() req: any,
  ): Promise<EmployeeDocumentItemDto> {
    const adminId = req.user?.emp_id || 1;
    return this.documentService.finalizeDraft(id, dto, adminId);
  }

  @Get('employees/:id/documents/:documentType/download')
  @ApiOperation({ summary: 'Download or view issued employee document file' })
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentType') documentType: string,
    @Query('inline') inline: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const fileData = await this.documentService.getDocumentForDownload(id, documentType);
    const isInline =
      inline === 'true' ||
      fileData.mimeType.startsWith('image/') ||
      fileData.mimeType === 'application/pdf';
    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${isInline ? 'inline' : 'attachment'}; filename="${fileData.fileName}"`,
    );
    res.send(fileData.content);
  }
}
