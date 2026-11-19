import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Res,
  Headers,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { AttachmentsService } from '../../application/services/attachments.service';
import { findStoredFile } from '../../application/services/storage-root';
import { AttachmentFileStore, CLOUD_URL_PREFIX } from '../../application/services/attachment-file-store';
import { Readable } from 'stream';
import {
  CreateAttachmentDto,
  ReorderAttachmentsDto,
} from '../dto/attachment.dto';
import { isShareableType } from '../../../projects/domain/services/discussion-attachments';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Attachments')
@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly store: AttachmentFileStore,
  ) {}

  // NOTE: the download route is declared first on purpose. Express matches routes in order, and
  // ':entityType/:entityId' below would otherwise take '/7/download' and fail with "numeric string is expected".
  // ---------------------------------------------------------------------------
  // 3. DOWNLOAD / STREAM ATTACHMENT FILE (Publicly streamable inline)
  // ---------------------------------------------------------------------------

  @Get(':id/download')
  @ApiOperation({ summary: 'Download or stream attachment file' })
  async downloadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
    @Headers('range') range?: string,
  ): Promise<StreamableFile> {
    const attachment = await this.attachmentsService.getAttachmentById(id);

    // Files kept in Cloudinary are read whole (25 MB at most); files on the local disk are streamed
    const cloud = await this.store.readCloud(attachment.file_url);
    let filePath: string | null = null;
    if (!cloud) {
      const relativePath = attachment.file_url.startsWith('/files/attachments/')
        ? path.join('attachments', attachment.file_url.replace('/files/attachments/', ''))
        : attachment.file_url.replace(/^[/\\]+/, '');
      filePath = attachment.file_url.startsWith(CLOUD_URL_PREFIX) ? null : findStoredFile(relativePath);
    }

    if (!cloud && !filePath) {
      throw new NotFoundException(`Physical file for attachment #${id} not found on server`);
    }
    const open = (range?: { start: number; end: number }) =>
      cloud ? Readable.from(range ? cloud.subarray(range.start, range.end + 1) : cloud) : fs.createReadStream(filePath!, range);

    const mime = attachment.mime_type || 'application/octet-stream';
    // A page or an svg is never shown inline: it could run script. Everything else opens in the browser.
    const inline = !['text/html', 'image/svg+xml'].includes(mime.toLowerCase().split(';')[0].trim());
    res.set({
      'Content-Type': mime,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(attachment.file_name)}"`,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
    });

    // Videos need partial reads so the player can seek and start before the whole file is down
    const size = cloud ? cloud.length : fs.statSync(filePath!).size;
    const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
    if (m && (m[1] !== '' || m[2] !== '')) {
      const start = m[1] === '' ? Math.max(size - Number(m[2]), 0) : Number(m[1]);
      const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
      if (start >= size || start > end) {
        res.status(416).set({ 'Content-Range': `bytes */${size}` });
        return new StreamableFile(Buffer.alloc(0));
      }
      res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) });
      return new StreamableFile(open({ start, end }));
    }
    res.set({ 'Content-Length': String(size) });
    return new StreamableFile(open());
  }

  // ---------------------------------------------------------------------------
  // 1. GET ALL FOR AN ENTITY
  // ---------------------------------------------------------------------------

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get all active attachments for an entity' })
  async getEntityAttachments(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.attachmentsService.getAttachments(entityType, entityId);
  }

  // ---------------------------------------------------------------------------
  // 2. GET SINGLE ATTACHMENT METADATA
  // ---------------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({ summary: 'Get attachment metadata by ID' })
  async getAttachmentById(@Param('id', ParseIntPipe) id: number) {
    return this.attachmentsService.getAttachmentById(id);
  }

  // ---------------------------------------------------------------------------
  // 4. CREATE FROM METADATA / URL
  // ---------------------------------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create attachment from URL/metadata' })
  async createAttachment(@Body() dto: CreateAttachmentDto, @Req() req: any) {
    const userId = req.user?.emp_id || 1;
    return this.attachmentsService.createAttachment(dto, userId);
  }

  // ---------------------------------------------------------------------------
  // 5. UPLOAD PHYSICAL FILE
  // ---------------------------------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @ApiOperation({ summary: 'Upload file and attach to entity (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('entity_type') entityType: string,
    @Body('entity_id') entityIdStr: string,
    @Body('display_order') displayOrder: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required for upload');
    }
    if (!entityType) {
      throw new BadRequestException('entity_type is required');
    }
    if (entityType.trim().toLowerCase() === 'project_discussion' && !isShareableType(file.mimetype)) {
      throw new BadRequestException('That type of file cannot be shared. Send a picture, video, PDF, document, spreadsheet or zip.');
    }

    const userId = req.user?.emp_id || 1;
    const entityId = entityIdStr ? parseInt(entityIdStr, 10) || 0 : 0;
    const orderNum = displayOrder ? parseInt(displayOrder, 10) || 1 : 1;

    return this.attachmentsService.uploadAttachment(
      entityType,
      entityId,
      file,
      userId,
      orderNum,
    );
  }

  // ---------------------------------------------------------------------------
  // 6. REORDER ATTACHMENTS
  // ---------------------------------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':entityType/:entityId/reorder')
  @ApiOperation({ summary: 'Reorder attachments for an entity' })
  async reorderAttachments(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
    @Body() dto: ReorderAttachmentsDto,
    @Req() req: any,
  ) {
    const userId = req.user?.emp_id || 1;
    return this.attachmentsService.reorderAttachments(
      entityType,
      entityId,
      dto.attachment_ids,
      userId,
    );
  }

  // ---------------------------------------------------------------------------
  // 7. SOFT DELETE ATTACHMENT
  // ---------------------------------------------------------------------------

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete attachment' })
  async deleteAttachment(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.emp_id || 1;
    return this.attachmentsService.softDeleteAttachment(id, userId);
  }
}

