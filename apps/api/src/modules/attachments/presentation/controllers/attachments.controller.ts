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
import {
  CreateAttachmentDto,
  ReorderAttachmentsDto,
} from '../dto/attachment.dto';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Attachments')
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

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
  // 3. DOWNLOAD / STREAM ATTACHMENT FILE (Publicly streamable inline)
  // ---------------------------------------------------------------------------

  @Get(':id/download')
  @ApiOperation({ summary: 'Download or stream attachment file' })
  async downloadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const attachment = await this.attachmentsService.getAttachmentById(id);

    const storageCandidate1 = path.resolve(process.cwd(), 'storage');
    const storageCandidate2 = path.resolve(__dirname, '../../../../../..', 'storage');
    const storageRoot = fs.existsSync(storageCandidate1) ? storageCandidate1 : storageCandidate2;
    let filePath = '';

    if (attachment.file_url.startsWith('/files/attachments/')) {
      const relativePart = attachment.file_url.replace('/files/attachments/', '');
      filePath = path.resolve(storageRoot, 'attachments', relativePart);
    } else {
      filePath = path.resolve(storageRoot, attachment.file_url);
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Physical file for attachment #${id} not found on server`);
    }

    res.set({
      'Content-Type': attachment.mime_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.file_name)}"`,
    });

    const stream = fs.createReadStream(filePath);
    return new StreamableFile(stream);
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

