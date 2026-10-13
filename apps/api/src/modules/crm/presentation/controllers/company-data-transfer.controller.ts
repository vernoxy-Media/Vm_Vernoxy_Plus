import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
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
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { CompanyAdminGuard } from '../guards/company-admin.guard';
import { mapTransferErrorToHttpException } from '../transfer-error.mapper';
import {
  CompanyImportPreviewDto,
  CompanyImportConfirmDto,
} from '../dtos/company-import-dto';
import {
  CompanyExportQueryDto,
  PagedQueryDto,
} from '../dtos/company-export-dto';
import {
  CompanyImportPreviewResponseDto,
  CompanyImportConfirmResponseDto,
  DataTransferJobDetailResponseDto,
  TransferJobIssuesResponseDto,
  TransferJobListResponseDto,
} from '../dtos/company-data-transfer.dto';

import { DownloadCompanyTemplateUseCase } from '../../application/use-cases/download-company-template.use-case';
import { PreviewCompanyImportUseCase } from '../../application/use-cases/preview-company-import.use-case';
import { ConfirmCompanyImportUseCase } from '../../application/use-cases/confirm-company-import.use-case';
import { ExportCompaniesUseCase } from '../../application/use-cases/export-companies.use-case';
import {
  GetTransferJobUseCase,
  GetTransferJobIssuesUseCase,
  ListTransferJobsUseCase,
  CancelTransferJobUseCase,
  DownloadTransferReportUseCase,
} from '../../../data-transfer/public-api';

@ApiTags('CRM - Companies Data Transfer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyAdminGuard)
@Controller('companies')
export class CompanyDataTransferController {
  constructor(
    private readonly downloadTemplateUseCase: DownloadCompanyTemplateUseCase,
    private readonly previewImportUseCase: PreviewCompanyImportUseCase,
    private readonly confirmImportUseCase: ConfirmCompanyImportUseCase,
    private readonly exportCompaniesUseCase: ExportCompaniesUseCase,
    private readonly getJobUseCase: GetTransferJobUseCase,
    private readonly getIssuesUseCase: GetTransferJobIssuesUseCase,
    private readonly listJobsUseCase: ListTransferJobsUseCase,
    private readonly cancelJobUseCase: CancelTransferJobUseCase,
    private readonly downloadReportUseCase: DownloadTransferReportUseCase,
  ) {}

  @Get('import/template')
  @ApiOperation({ summary: 'Download empty company import template (xlsx or csv)' })
  async downloadTemplate(
    @Query('format') format: 'xlsx' | 'csv' = 'xlsx',
    @Res() res: Response,
  ): Promise<void> {
    try {
      const selectedFormat = format === 'csv' ? 'csv' : 'xlsx';
      const { buffer, filename, contentType } = await this.downloadTemplateUseCase.execute(
        selectedFormat,
      );

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(HttpStatus.OK).send(buffer);
    } catch (err) {
      throw mapTransferErrorToHttpException(err);
    }
  }

  @Post('import/preview')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file for inspection and preview (rate limit 5/min)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        duplicate_policy: { type: 'string', enum: ['skip_duplicates', 'import_anyway'] },
        skip_invalid_rows: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, type: CompanyImportPreviewResponseDto })
  async preview(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: CompanyImportPreviewDto,
    @Req() req: Request,
  ): Promise<CompanyImportPreviewResponseDto> {
    if (!file) {
      throw new BadRequestException({
        type: 'about:blank',
        title: 'Bad Request',
        status: HttpStatus.BAD_REQUEST,
        code: 'MISSING_FILE',
        detail: 'Spreadsheet file is required',
        errors: [{ field: 'file', code: 'MISSING_FILE', message: 'Spreadsheet file is required' }],
      });
    }

    const adminEmpId = (req as any).user?.emp_id;

    try {
      const result = await this.previewImportUseCase.execute({
        fileBuffer: file.buffer,
        originalFilename: file.originalname,
        adminEmpId,
        duplicatePolicy: body.duplicate_policy || 'skip_duplicates',
        skipInvalidRows: body.skip_invalid_rows ?? false,
      });

      return {
        job_id: result.job_id,
        status: result.status,
        totals: {
          total_rows: result.totals.total,
          will_create: result.will_create,
          will_skip_duplicates: result.will_skip,
          warning_rows: result.totals.warnings,
          error_rows: result.totals.errors,
        },
        sample_issues: result.issues.map((i) => ({
          row_number: i.row,
          field_name: i.field || '',
          issue_code: i.code,
          message: i.message,
          severity: i.severity,
        })),
        can_proceed: result.can_confirm,
      };
    } catch (err) {
      throw mapTransferErrorToHttpException(err);
    }
  }

  @Post('import/:jobId/confirm')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Confirm import preview and enqueue background processing (rate limit 5/min)' })
  @ApiParam({ name: 'jobId', type: String })
  @ApiResponse({ status: 202, type: CompanyImportConfirmResponseDto })
  async confirm(
    @Param('jobId') jobId: string,
    @Body() body: CompanyImportConfirmDto,
    @Req() req: Request,
  ): Promise<CompanyImportConfirmResponseDto> {
    const adminEmpId = (req as any).user?.emp_id;

    try {
      const result = await this.confirmImportUseCase.execute({
        jobId,
        adminEmpId,
        duplicatePolicy: body.duplicate_policy,
        skipInvalidRows: body.skip_invalid_rows,
      });

      return {
        job_id: result.job_id,
        status: result.status,
        message: 'Import job queued for processing',
      };

    } catch (err) {
      throw mapTransferErrorToHttpException(err);
    }
  }

  @Post('import/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel import job (only if pending)' })
  @ApiParam({ name: 'jobId', type: String })
  async cancel(
    @Param('jobId') jobId: string,
  ): Promise<{ job_id: string; status: string }> {
    try {
      const result = await this.cancelJobUseCase.execute(jobId);
      return { job_id: jobId, status: result.status };
    } catch (err) {
      throw mapTransferErrorToHttpException(err);
    }
  }

  @Get('import')
  @ApiOperation({ summary: 'List recent company import jobs' })
  @ApiResponse({ status: 200, type: TransferJobListResponseDto })
  async listImports(
    @Query() query: PagedQueryDto,
  ): Promise<TransferJobListResponseDto> {
    try {
      const result = await this.listJobsUseCase.execute(
        'companies',
        query.limit || 20,
        query.cursor,
      );

      return {
        jobs: result.jobs.map((j) => ({
          job_id: j.job_id,
          direction: j.direction,
          entity_type: j.entity_type,
          format: j.format,
          status: j.status,
          total_rows: j.total_rows,
          processed_rows: j.processed_rows,
          created_rows: j.created_rows,
          skipped_rows: j.skipped_rows,
          failed_rows: j.failed_rows,
          has_report: j.has_report,
          created_at: j.created_at,
          finished_at: j.finished_at,
        })),
        next_cursor: result.next_cursor,
      };
    } catch (err) {
      throw mapTransferErrorToHttpException(err);
    }
  }

  @Get('import/:jobId/report')
  @ApiOperation({ summary: 'Download final import results CSV/XLSX report' })
  @ApiParam({ name: 'jobId', type: String })
  async downloadReport(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { stream, filename } = await this.downloadReportUseCase.execute(jobId);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } catch (err) {
      throw mapTransferErrorToHttpException(err);
    }
  }

  @Get('import/:jobId/issues')
  @ApiOperation({ summary: 'Get paginated validation issues for import job' })
  @ApiParam({ name: 'jobId', type: String })
  @ApiResponse({ status: 200, type: TransferJobIssuesResponseDto })
  async getIssues(
    @Param('jobId') jobId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = 50,
  ): Promise<TransferJobIssuesResponseDto> {
    try {
      const result = await this.getIssuesUseCase.execute(
        jobId,
        cursor,
        limit ? Number(limit) : 50,
      );

      return {
        issues: result.issues.map((i) => ({
          row_number: i.row,
          field_name: i.field || '',
          issue_code: i.code,
          message: i.message,
          severity: i.severity,
        })),
        next_cursor: result.next_cursor,
        total_count: result.total,
      };
    } catch (err) {
      throw mapTransferErrorToHttpException(err);
    }
  }

  @Get('import/:jobId')
  @ApiOperation({ summary: 'Get company import job status and progress' })
  @ApiParam({ name: 'jobId', type: String })
  @ApiResponse({ status: 200, type: DataTransferJobDetailResponseDto })
  async getJob(
    @Param('jobId') jobId: string,
  ): Promise<DataTransferJobDetailResponseDto> {
    try {
      const job = await this.getJobUseCase.execute(jobId);
      return {
        job_id: job.job_id,
        direction: job.direction,
        entity_type: job.entity_type,
        format: job.format,
        status: job.status,
        counts: job.counts,
        percentage: job.percentage,
        error_message: job.error_message,
        created_at: job.created_at,
        started_at: job.started_at,
        finished_at: job.finished_at,
        has_report: job.has_report,
      };
    } catch (err) {
      throw mapTransferErrorToHttpException(err);
    }
  }

  @Get('export')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Export companies list with active filters directly to streaming file (rate limit 5/min)' })
  async export(
    @Query() query: CompanyExportQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const adminEmpId = (req as any).user?.emp_id;
    const format = query.format || 'xlsx';

    const filters = {
      q: query.q,
      customer_type_id: query.customer_type_id,
      industry_id: query.industry_id,
      owner_id: query.owner_id,
      owner: query.owner,
      is_active: query.is_active,
    };

    try {
      const contentType =
        format === 'csv'
          ? 'text/csv; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      res.setHeader('Content-Type', contentType);

      const onClientDisconnect = (cb: () => Promise<void>) => {
        req.on('close', () => {
          if (!res.writableEnded) {
            cb().catch(() => {});
          }
        });
      };

      const { filename } = await this.exportCompaniesUseCase.execute({
        format,
        filters,
        adminEmpId,
        outputStream: res,
        onClientDisconnect,
      });

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } catch (err) {
      if (!res.headersSent) {
        throw mapTransferErrorToHttpException(err);
      }
    }
  }
}
