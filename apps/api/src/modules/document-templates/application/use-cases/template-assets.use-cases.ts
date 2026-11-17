import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TEMPLATE_TOKENS } from '../ports/tokens';
import { AssetUrlPort, ImageOptimizerPort, TemplateAsset, TemplateAssetStorePort, TemplateImageKind } from '../ports/template-asset.port';
import { TEMPLATE_IMAGE_KINDS, prepareImage } from '../services/image-preparation';

export const MAX_TEMPLATE_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg']);

const NAMES: Record<TemplateImageKind, string> = { letterhead: 'letterhead', signature: 'signature', logo: 'logo', photo: 'photo' };

type UploadedFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

/** Letterhead and signature uploads (Admin), and the public image link documents print. */
@Injectable()
export class TemplateAssetUseCases {
  constructor(
    @Inject(TEMPLATE_TOKENS.Assets) private readonly store: TemplateAssetStorePort,
    @Inject(TEMPLATE_TOKENS.ImageOptimizer) private readonly optimizer: ImageOptimizerPort,
    @Inject(TEMPLATE_TOKENS.AssetUrls) private readonly urls: AssetUrlPort,
  ) {}

  async upload(kindInput: string, file: UploadedFile | undefined, actorId: number) {
    if (!TEMPLATE_IMAGE_KINDS.includes(kindInput as TemplateImageKind)) {
      throw new BadRequestException(`Unknown image type "${kindInput}". Use one of: ${TEMPLATE_IMAGE_KINDS.join(', ')}.`);
    }
    const kind = kindInput as TemplateImageKind;
    const name = NAMES[kind];
    if (!file?.buffer?.length) throw new BadRequestException(`Choose the ${name} image (PNG or JPG).`);
    if (!IMAGE_TYPES.has(file.mimetype)) throw new BadRequestException(`The ${name} must be a PNG or JPG image.`);
    if (file.size > MAX_TEMPLATE_IMAGE_BYTES) throw new BadRequestException(`The ${name} can be up to 10 MB.`);
    let optimized: { data: Buffer; contentType: string };
    try {
      optimized = await prepareImage(this.optimizer, kind, file.buffer);
    } catch {
      throw new BadRequestException(`This image could not be read. Export the ${name} again as PNG or JPG.`);
    }
    const assetId = await this.store.save({
      purpose: kind,
      fileName: file.originalname.slice(0, 200),
      contentType: optimized.contentType,
      data: optimized.data,
      actorId,
    });
    return { asset_id: assetId, url: this.urls.urlFor(assetId) };
  }

  async get(assetId: number): Promise<TemplateAsset> {
    const asset = await this.store.get(assetId);
    if (!asset) throw new NotFoundException('Image not found.');
    return asset;
  }
}
