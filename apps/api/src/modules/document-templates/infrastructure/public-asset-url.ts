import { Injectable } from '@nestjs/common';
import { AssetUrlPort } from '../application/ports/template-asset.port';

/**
 * Asset links go through the web app's address (WEB_ORIGIN), which forwards /api to the API, so the
 * same link works in the preview, in a printed document and inside an emailed one.
 */
@Injectable()
export class PublicAssetUrl implements AssetUrlPort {
  urlFor(assetId: number): string {
    const origin = (process.env.WEB_ORIGIN || '').split(',')[0].trim().replace(/\/+$/, '');
    return `${origin}/api/v1/document-templates/assets/${assetId}`;
  }
}
