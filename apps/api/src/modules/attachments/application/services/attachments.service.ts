import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateAttachmentDto } from '../../presentation/dto/attachment.dto';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 1. GET ATTACHMENTS
  // ---------------------------------------------------------------------------

  async getAttachments(entityType: string, entityId: number) {
    const records = await this.prisma.attachments.findMany({
      where: {
        entity_type: entityType.toUpperCase(),
        entity_id: entityId,
        deleted_at: null,
      },
      include: {
        employees_attachments_created_byToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ display_order: 'asc' }, { attachment_id: 'asc' }],
    });

    return records.map((r) => ({
      attachment_id: r.attachment_id,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      file_name: r.file_name,
      file_url: r.file_url,
      file_size_bytes: Number(r.file_size_bytes),
      mime_type: r.mime_type,
      display_order: r.display_order,
      created_at: r.created_at,
      created_by: r.created_by,
      created_by_name: r.employees_attachments_created_byToemployees?.name || null,
    }));
  }

  async getAttachmentById(attachmentId: number) {
    const record = await this.prisma.attachments.findFirst({
      where: { attachment_id: attachmentId, deleted_at: null },
      include: {
        employees_attachments_created_byToemployees: {
          select: {
            emp_id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Attachment #${attachmentId} not found`);
    }

    return {
      attachment_id: record.attachment_id,
      entity_type: record.entity_type,
      entity_id: record.entity_id,
      file_name: record.file_name,
      file_url: record.file_url,
      file_size_bytes: Number(record.file_size_bytes),
      mime_type: record.mime_type,
      display_order: record.display_order,
      created_at: record.created_at,
      created_by: record.created_by,
      created_by_name: record.employees_attachments_created_byToemployees?.name || null,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. CREATE / REGISTER ATTACHMENT
  // ---------------------------------------------------------------------------

  async createAttachment(dto: CreateAttachmentDto, userId: number) {
    const entityType = dto.entity_type.trim().toUpperCase();

    const created = await this.prisma.attachments.create({
      data: {
        entity_type: entityType,
        entity_id: dto.entity_id ?? 0,
        file_name: dto.file_name.trim(),
        file_url: dto.file_url.trim(),
        file_size_bytes: BigInt(dto.file_size_bytes),
        mime_type: dto.mime_type.trim().toLowerCase(),
        display_order: dto.display_order ?? 1,
        created_by: userId,
      },
    });

    return {
      ...created,
      file_size_bytes: Number(created.file_size_bytes),
    };
  }

  async createMultipleAttachments(dtos: CreateAttachmentDto[], userId: number) {
    const results = [];
    for (const dto of dtos) {
      const item = await this.createAttachment(dto, userId);
      results.push(item);
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // 3. PHYSICAL FILE UPLOAD & ATTACHMENT CREATION
  // ---------------------------------------------------------------------------

  async uploadAttachment(
    entityType: string,
    entityId: number,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    userId: number,
    displayOrder?: number,
  ) {
    const normalizedType = entityType.trim().toUpperCase();

    // Storage directory: storage/attachments/<entityType>/<entityId>/
    const repoRoot = path.resolve(__dirname, '../../../../../../..');
    const storageDir = path.resolve(repoRoot, 'storage', 'attachments', normalizedType, String(entityId));

    if (!fs.existsSync(storageDir)) {
      await fs.promises.mkdir(storageDir, { recursive: true });
    }

    // Generate safe filename: <timestamp>_<sanitized_name>
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const diskFileName = `${Date.now()}_${sanitizedName}`;
    const diskPath = path.resolve(storageDir, diskFileName);

    await fs.promises.writeFile(diskPath, file.buffer);

    // Relative web URL
    const fileUrl = `/files/attachments/${normalizedType}/${entityId}/${diskFileName}`;

    return this.createAttachment(
      {
        entity_type: normalizedType,
        entity_id: entityId,
        file_name: file.originalname,
        file_url: fileUrl,
        file_size_bytes: file.size,
        mime_type: file.mimetype,
        display_order: displayOrder ?? 1,
      },
      userId,
    );
  }

  // ---------------------------------------------------------------------------
  // 4. REORDER ATTACHMENTS
  // ---------------------------------------------------------------------------

  async reorderAttachments(
    entityType: string,
    entityId: number,
    orderedIds: number[],
    userId: number,
  ) {
    const normalizedType = entityType.trim().toUpperCase();

    const existing = await this.prisma.attachments.findMany({
      where: {
        entity_type: normalizedType,
        entity_id: entityId,
        deleted_at: null,
      },
      select: { attachment_id: true },
    });

    const validIdSet = new Set(existing.map((e) => e.attachment_id));

    // Update each in order
    let order = 1;
    for (const id of orderedIds) {
      if (validIdSet.has(id)) {
        await this.prisma.attachments.update({
          where: { attachment_id: id },
          data: { display_order: order++ },
        });
      }
    }

    return this.getAttachments(normalizedType, entityId);
  }

  // ---------------------------------------------------------------------------
  // 5. SOFT DELETE
  // ---------------------------------------------------------------------------

  async softDeleteAttachment(attachmentId: number, userId: number) {
    const existing = await this.prisma.attachments.findFirst({
      where: { attachment_id: attachmentId, deleted_at: null },
    });

    if (!existing) {
      throw new NotFoundException(`Attachment #${attachmentId} not found`);
    }

    return this.prisma.attachments.update({
      where: { attachment_id: attachmentId },
      data: {
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  async softDeleteEntityAttachments(entityType: string, entityId: number, userId: number) {
    return this.prisma.attachments.updateMany({
      where: {
        entity_type: entityType.trim().toUpperCase(),
        entity_id: entityId,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }
}

