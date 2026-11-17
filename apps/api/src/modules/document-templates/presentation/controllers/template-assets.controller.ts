import { Controller, Get, Param, ParseIntPipe, Post, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/public-api';
import { MAX_TEMPLATE_IMAGE_BYTES, TemplateAssetUseCases } from '../../application/use-cases/template-assets.use-cases';
import { TemplateAdminGuard } from '../guards/template-admin.guard';

/**
 * Template images. Reading is public on purpose: a document shows its letterhead and signature
 * inside the app's preview frame and inside emails, where no login header can be sent. Assets never
 * change (a new upload gets a new id), so they are cached for a year.
 */
@ApiTags('Document Templates')
@Controller('document-templates/assets')
export class TemplateAssetsController {
  constructor(private readonly assets: TemplateAssetUseCases) {}

  @Post(':kind')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TemplateAdminGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a template image: letterhead (A4), signature, logo (PNG with transparency is best) or photo. PNG or JPG, up to 10 MB.',
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_TEMPLATE_IMAGE_BYTES } }))
  upload(@Req() req: any, @Param('kind') kind: string, @UploadedFile() file: any) {
    return this.assets.upload(kind, file, Number(req.user?.emp_id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Template image (public, cached)' })
  async get(@Param('id', ParseIntPipe) id: number, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const asset = await this.assets.get(id);
    res.set({
      'Content-Type': asset.content_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    return new StreamableFile(asset.data);
  }
}
