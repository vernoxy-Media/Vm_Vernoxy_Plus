import { BundledImageName, TemplateImageKind } from '../../domain/layout';

export type { BundledImageName, TemplateImageKind };

export interface TemplateAsset {
  asset_id: number;
  content_type: string;
  data: Buffer;
}

/** Images used by templates (the letterhead). Database today; S3/Cloudinary later without other changes. */
export interface TemplateAssetStorePort {
  /** actorId is null for assets the system adds itself (the company default letterhead). */
  save(input: { purpose: string; fileName: string | null; contentType: string; data: Buffer; actorId: number | null }): Promise<number>;
  get(assetId: number): Promise<TemplateAsset | null>;
  /** Newest asset stored for this purpose, if any. */
  findLatestId(purpose: string): Promise<number | null>;
}

/** Images shipped with the code (the official letterhead, logo, default cover photo), by name. */
export interface BundledAssetsPort {
  read(name: BundledImageName): Promise<Buffer | null>;
}

/** Public link of an asset, as documents print it (it must also work inside an emailed document). */
export interface AssetUrlPort {
  urlFor(assetId: number): string;
}

/** Makes an uploaded letterhead small enough to sit behind every page of every document. */
export interface ImageOptimizerPort {
  /** A4 page background at print quality; returns the new bytes and their content type. */
  optimizePageBackground(data: Buffer): Promise<{ data: Buffer; contentType: string }>;
  /** Signature image: empty margins trimmed, transparency kept, sized for print. */
  optimizeSignature(data: Buffer): Promise<{ data: Buffer; contentType: string }>;
  /** Logo: empty margins trimmed, transparency kept, sharp at the size a cover page prints it. */
  optimizeLogo(data: Buffer): Promise<{ data: Buffer; contentType: string }>;
  /** Photo: print quality at about half a page, as JPEG. */
  optimizePhoto(data: Buffer): Promise<{ data: Buffer; contentType: string }>;
}
