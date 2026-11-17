import { Inject, Injectable, Logger } from '@nestjs/common';
import { BundledImageName, DocumentLayout, LayoutCatalog, TemplateImageKind, defaultLayout } from '../../domain/layout';
import { TEMPLATE_TOKENS } from '../ports/tokens';
import { BundledAssetsPort, ImageOptimizerPort, TemplateAssetStorePort } from '../ports/template-asset.port';
import { prepareImage } from './image-preparation';

/**
 * Images that ship with the code (official letterhead, company logo, default cover photo).
 * The first time one is needed it is stored like an uploaded image, so every environment (local,
 * QA, production) has it without an upload; the Admin can replace or remove it in any template.
 */
const BUNDLED: Record<BundledImageName, { purpose: string; fileName: string; kind: TemplateImageKind }> = {
  // Purpose kept from the first version, so an already stored letterhead is reused.
  'company-letterhead': { purpose: 'company_letterhead', fileName: 'company-letterhead.jpg', kind: 'letterhead' },
  'company-logo': { purpose: 'company_logo', fileName: 'company-logo.png', kind: 'logo' },
  'quotation-cover-photo': { purpose: 'quotation_cover_photo', fileName: 'quotation-cover-photo.jpg', kind: 'photo' },
};

@Injectable()
export class BundledImages {
  private readonly logger = new Logger(BundledImages.name);
  private readonly cached = new Map<BundledImageName, number>();
  private readonly pending = new Map<BundledImageName, Promise<number | null>>();

  constructor(
    @Inject(TEMPLATE_TOKENS.Assets) private readonly store: TemplateAssetStorePort,
    @Inject(TEMPLATE_TOKENS.BundledAssets) private readonly bundled: BundledAssetsPort,
    @Inject(TEMPLATE_TOKENS.ImageOptimizer) private readonly optimizer: ImageOptimizerPort,
  ) {}

  /**
   * The defaults of a kind that has never been saved: its catalog defaults, on the company letterhead
   * when the kind uses one, with the bundled image in each of its image slots.
   */
  async startingLayout(catalog: LayoutCatalog): Promise<DocumentLayout> {
    const layout = defaultLayout(catalog);
    if (catalog.uses_letterhead) layout.letterhead_asset_id = await this.assetId('company-letterhead');
    for (const slot of catalog.images ?? []) {
      if (slot.bundled) layout.images[slot.key] = await this.assetId(slot.bundled);
    }
    return layout;
  }

  /** Asset id of a bundled image, or null when its file is not available. */
  async assetId(name: BundledImageName): Promise<number | null> {
    const hit = this.cached.get(name);
    if (hit) return hit;
    // One request stores it; others started meanwhile wait for the same result.
    let p = this.pending.get(name);
    if (!p) {
      p = this.findOrStore(name).finally(() => this.pending.delete(name));
      this.pending.set(name, p);
    }
    return p;
  }

  private async findOrStore(name: BundledImageName): Promise<number | null> {
    const spec = BUNDLED[name];
    const existing = await this.store.findLatestId(spec.purpose);
    if (existing) {
      this.cached.set(name, existing);
      return existing;
    }
    const image = await this.bundled.read(name);
    if (!image) return null;
    const prepared = await prepareImage(this.optimizer, spec.kind, image);
    const id = await this.store.save({ purpose: spec.purpose, fileName: spec.fileName, contentType: prepared.contentType, data: prepared.data, actorId: null });
    this.logger.log(`Stored the bundled image "${name}" as template asset ${id}.`);
    this.cached.set(name, id);
    return id;
  }
}
