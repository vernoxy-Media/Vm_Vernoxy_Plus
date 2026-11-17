import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { TemplateAsset, TemplateAssetStorePort } from '../../application/ports/template-asset.port';

/** Template images in the database (document_template_assets): they survive a redeploy of the server. */
@Injectable()
export class PrismaTemplateAssetStore implements TemplateAssetStorePort {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: { purpose: string; fileName: string | null; contentType: string; data: Buffer; actorId: number | null }): Promise<number> {
    const created = await this.prisma.document_template_assets.create({
      data: {
        purpose: input.purpose,
        file_name: input.fileName,
        content_type: input.contentType,
        byte_size: input.data.length,
        data: new Uint8Array(input.data),
        created_by: input.actorId,
      },
      select: { asset_id: true },
    });
    return created.asset_id;
  }

  async findLatestId(purpose: string): Promise<number | null> {
    const row = await this.prisma.document_template_assets.findFirst({
      where: { purpose },
      orderBy: { asset_id: 'desc' },
      select: { asset_id: true },
    });
    return row?.asset_id ?? null;
  }

  async get(assetId: number): Promise<TemplateAsset | null> {
    const row = await this.prisma.document_template_assets.findUnique({
      where: { asset_id: assetId },
      select: { asset_id: true, content_type: true, data: true },
    });
    return row ? { asset_id: row.asset_id, content_type: row.content_type, data: Buffer.from(row.data) } : null;
  }
}
