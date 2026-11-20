import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { FileInspectionError, FileInspectionService } from '../../../data-transfer/public-api';
import { DownloadEmployeeTemplateUseCase } from '../../application/use-cases/employee-import.use-cases';
import { EmployeeImportHandler } from '../../infrastructure/import/employee-import.handler';
import { OrganizationAdminGuard } from '../guards/organization-admin.guard';

const logger = new Logger('EmployeeImportController');

function problem(status: number, title: string, code: string, detail: string): HttpException {
  return new HttpException({ type: 'about:blank', title, status, code, detail, errors: [{ field: 'general', code, message: detail }] }, status);
}

function mapImportError(err: unknown): HttpException {
  if (err instanceof HttpException) return err;
  if (err instanceof FileInspectionError) return problem(err.statusCode, 'Invalid file', err.code, err.message);

  // Never swallowed: the developer sees the cause in the API terminal. Outside production the same text is sent to the
  // screen too, so a failed import says why. In production the screen only gets the generic line.
  const cause = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  logger.error(`Employee import request failed: ${cause}`, err instanceof Error ? err.stack : undefined);
  const detail =
    process.env.NODE_ENV === 'production'
      ? 'An error occurred during the employee import'
      : `An error occurred during the employee import (${cause.slice(0, 400)})`;
  return problem(500, 'Internal Server Error', 'INTERNAL_ERROR', detail);
}

const truthy = (v: unknown) => v === true || v === 'true' || v === '1';

const MISSING_FILE = () =>
  new BadRequestException({
    type: 'about:blank',
    title: 'Bad Request',
    status: 400,
    code: 'MISSING_FILE',
    detail: 'Spreadsheet file is required',
    errors: [{ field: 'file', code: 'MISSING_FILE', message: 'Spreadsheet file is required' }],
  });

/**
 * Bulk employee import. The file is read in memory and nothing about it is stored:
 *   GET  template  -> the empty sheet
 *   POST preview   -> checks the file, saves nothing
 *   POST (root)    -> creates the employees in the file
 * Declared before EmployeeController so "employees/import/..." is never read as "employees/:id".
 */
@ApiTags('Organization - Employee Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationAdminGuard)
@Controller('employees/import')
export class EmployeeImportController {
  constructor(
    private readonly downloadTemplate: DownloadEmployeeTemplateUseCase,
    private readonly importHandler: EmployeeImportHandler,
    private readonly fileInspection: FileInspectionService,
  ) {}

  @Get('template')
  @ApiOperation({ summary: 'Download the empty employee import template (xlsx or csv)' })
  async template(@Query('format') format: string, @Res() res: Response): Promise<void> {
    try {
      const out = await this.downloadTemplate.execute(format === 'csv' ? 'csv' : 'xlsx');
      res.setHeader('Content-Type', out.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
      res.status(HttpStatus.OK).send(out.buffer);
    } catch (err) {
      throw mapImportError(err);
    }
  }

  @Post('preview')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Check the file and show what would be created. Nothing is saved' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' }, skip_invalid_rows: { type: 'boolean' } },
    },
  })
  async preview(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: { skip_invalid_rows?: unknown }) {
    if (!file) throw MISSING_FILE();
    try {
      const format = this.fileInspection.inspectAndDetectFormat(file.buffer, file.originalname);
      return await this.importHandler.previewFile(format, file.buffer, truthy(body?.skip_invalid_rows));
    } catch (err) {
      throw mapImportError(err);
    }
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create the employees in the file (up to 100 rows)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        skip_invalid_rows: { type: 'boolean' },
        send_welcome_email: { type: 'boolean', description: 'Mail the sign-in details to every employee created. Default: no' },
      },
    },
  })
  async importEmployees(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { skip_invalid_rows?: unknown; send_welcome_email?: unknown },
    @Req() req: Request,
  ) {
    if (!file) throw MISSING_FILE();
    try {
      const format = this.fileInspection.inspectAndDetectFormat(file.buffer, file.originalname);
      return await this.importHandler.importFile(
        format,
        file.buffer,
        req.user!.emp_id,
        truthy(body?.skip_invalid_rows),
        truthy(body?.send_welcome_email),
      );
    } catch (err) {
      throw mapImportError(err);
    }
  }
}
