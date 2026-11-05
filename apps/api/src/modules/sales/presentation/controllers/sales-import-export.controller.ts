import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, ParseIntPipe, Post, Put, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { SalesAccessGuard } from '../guards/sales-access.guard';
import { CurrentSalesActor } from '../guards/sales-actor.decorator';
import { mapSalesErrorToHttpException } from '../sales-error.mapper';
import { SalesActor } from '../../application/ports/sales-access-policy.port';
import { FileProblemError } from '../../domain/errors/sales.errors';
import { ImportUseCases } from '../../application/use-cases/import.use-cases';
import { ExportUseCases } from '../../application/use-cases/export.use-cases';
import { SalesRightsUseCases } from '../../application/use-cases/rights.use-cases';
import { CheckImportBodyDto, ExportBodyDto, FormatQueryDto, HistoryQueryDto, SetRightsBodyDto } from '../dto/sales-import-export.dto';
import { ListSalesCompaniesQueryDto } from '../dto/sales-company.dto';
import { LeadFiltersQueryDto } from '../dto/sales-lead.dto';
import { ListFollowUpsQueryDto } from '../dto/sales-follow-up.dto';
import { toQuery } from './sales-lead.controller';

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw mapSalesErrorToHttpException(err);
  }
}

const who = (v: string | undefined): 'me' | 'all' | number | undefined =>
  v === undefined ? undefined : /^\d+$/.test(v) ? Number(v) : (v as 'me' | 'all');

const file = (res: Response, f: { buffer: Buffer; filename: string; contentType: string }) => {
  res.set({ 'Content-Type': f.contentType, 'Content-Disposition': `attachment; filename="${f.filename}"`, 'Cache-Control': 'no-store' });
  return new StreamableFile(f.buffer);
};

/** Import, Export, History and Import / Export rights of the Sales module (BFD section 3, Part 2 and 3). */
@ApiTags('Sales - Import / Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SalesAccessGuard)
@Controller('sales')
export class SalesImportExportController {
  constructor(
    private readonly imports: ImportUseCases,
    private readonly exports: ExportUseCases,
    private readonly rights: SalesRightsUseCases,
  ) {}

  // --------------------------------------------------------------- import ----

  @Get('imports/template')
  @ApiOperation({ summary: 'Download the import template (36 columns, a Lists sheet, instructions)' })
  template(@Query() q: FormatQueryDto, @CurrentSalesActor() actor: SalesActor, @Res({ passthrough: true }) res: Response) {
    return run(async () => {
      await this.rights.require(actor, 'import');
      return file(res, await this.imports.downloadTemplate(q.format ?? 'xlsx'));
    });
  }

  @Post('imports')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 + 1, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Steps 1 and 2: upload the file; returns the automatic column match and a first check' })
  upload(@UploadedFile() f: Express.Multer.File | undefined, @CurrentSalesActor() actor: SalesActor) {
    return run(async () => {
      await this.rights.require(actor, 'import');
      if (!f) throw new FileProblemError('Choose a file to upload.', 'FILE_REQUIRED', 400);
      return this.imports.upload(f.buffer, f.originalname, actor);
    });
  }

  @Post('imports/:jobId/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Step 3: check every row with the chosen column match and options' })
  check(@Param('jobId', ParseUUIDPipe) jobId: string, @Body() body: CheckImportBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(async () => {
      await this.rights.require(actor, 'import');
      return this.imports.check(jobId, body, actor);
    });
  }

  @Post('imports/:jobId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import the rows that passed the check; rows with errors are never imported' })
  confirm(@Param('jobId', ParseUUIDPipe) jobId: string, @CurrentSalesActor() actor: SalesActor) {
    return run(async () => {
      await this.rights.require(actor, 'import');
      return this.imports.confirm(jobId, actor);
    });
  }

  @Get('imports/:jobId')
  @ApiOperation({ summary: 'One import: counts, what happened to each row, and whether it can still be undone' })
  getImport(@Param('jobId', ParseUUIDPipe) jobId: string, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.imports.getJob(jobId, actor));
  }

  @Get('imports/:jobId/error-rows')
  @ApiOperation({ summary: 'Download the rows with errors (with a Problem column) to fix and import again' })
  errorRows(@Param('jobId', ParseUUIDPipe) jobId: string, @Query() q: FormatQueryDto, @CurrentSalesActor() actor: SalesActor, @Res({ passthrough: true }) res: Response) {
    return run(async () => {
      await this.rights.require(actor, 'import');
      return file(res, await this.imports.errorRows(jobId, q.format ?? 'xlsx', actor));
    });
  }

  @Post('imports/:jobId/undo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin only: undo an import within 24 hours, if nothing was added to the imported companies' })
  undo(@Param('jobId', ParseUUIDPipe) jobId: string, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.imports.undo(jobId, actor));
  }

  @Get('history')
  @ApiOperation({ summary: 'History: imports and exports. The Admin sees all, a Sales user only their own' })
  history(@Query() q: HistoryQueryDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.imports.history(actor, Math.min(Math.max(q.limit ?? 50, 1), 200)));
  }

  // --------------------------------------------------------------- export ----

  @Post('exports/companies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export companies: the current list (filters in the query string) or the selected ids' })
  exportCompanies(@Query() filters: ListSalesCompaniesQueryDto, @Body() body: ExportBodyDto, @CurrentSalesActor() actor: SalesActor, @Res({ passthrough: true }) res: Response) {
    return run(async () => file(res, await this.exports.export('companies', { ...body, filters: { ...filters } }, actor)));
  }

  @Post('exports/leads')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export leads: the current list (filters in the query string) or the selected ids' })
  exportLeads(@Query() filters: LeadFiltersQueryDto, @Body() body: ExportBodyDto, @CurrentSalesActor() actor: SalesActor, @Res({ passthrough: true }) res: Response) {
    return run(async () => file(res, await this.exports.export('leads', { ...body, filters: { ...toQuery(filters) } }, actor)));
  }

  @Post('exports/follow-ups')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export follow-ups: the current tab (filters in the query string) or the selected ids' })
  exportFollowUps(@Query() filters: ListFollowUpsQueryDto, @Body() body: ExportBodyDto, @CurrentSalesActor() actor: SalesActor, @Res({ passthrough: true }) res: Response) {
    return run(async () =>
      file(res, await this.exports.export('follow_ups', { ...body, filters: { ...filters, assigned_to: who(filters.assigned_to), lead_by: who(filters.lead_by) } }, actor)),
    );
  }

  // --------------------------------------------------------------- rights ----

  @Get('rights/me')
  @ApiOperation({ summary: 'Do I have the Import and Export rights?' })
  myRights(@CurrentSalesActor() actor: SalesActor) {
    return run(() => this.rights.me(actor));
  }

  @Get('rights')
  @ApiOperation({ summary: 'Admin only: Import / Export rights of every Sales user' })
  listRights(@CurrentSalesActor() actor: SalesActor) {
    return run(() => this.rights.list(actor));
  }

  @Put('rights/:empId')
  @ApiOperation({ summary: 'Admin only: give or take away the Import and / or Export right of a Sales user' })
  setRights(@Param('empId', ParseIntPipe) empId: number, @Body() body: SetRightsBodyDto, @CurrentSalesActor() actor: SalesActor) {
    return run(() => this.rights.set(actor, empId, body));
  }
}
