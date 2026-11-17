import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { BundledAssetsPort, BundledImageName } from '../application/ports/template-asset.port';

/**
 * Images shipped with the code, in ./assets next to this file. nest-cli.json copies that folder into
 * dist on build, so the same relative path works when running from src or from dist.
 */
const FILES: Record<BundledImageName, string> = {
  'company-letterhead': join(__dirname, 'assets', 'company-letterhead.jpg'),
  'company-logo': join(__dirname, 'assets', 'company-logo.png'),
  'quotation-cover-photo': join(__dirname, 'assets', 'quotation-cover-photo.jpg'),
};

@Injectable()
export class FileBundledAssets implements BundledAssetsPort {
  private readonly logger = new Logger(FileBundledAssets.name);

  async read(name: BundledImageName): Promise<Buffer | null> {
    try {
      return await readFile(FILES[name]);
    } catch (err: any) {
      this.logger.warn(`Bundled asset "${name}" is missing (${err?.code ?? err?.message}). Templates start without it.`);
      return null;
    }
  }
}
