import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ImageOptimizerPort } from '../../application/ports/template-asset.port';

/** A4 at 150 dpi (1240 × 1754 px): sharp in print, small enough to sit behind every page. */
const A4_WIDTH_PX = 1240;

@Injectable()
export class SharpImageOptimizer implements ImageOptimizerPort {
  async optimizePageBackground(data: Buffer): Promise<{ data: Buffer; contentType: string }> {
    const out = await sharp(data)
      .rotate()
      .resize({ width: A4_WIDTH_PX, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    return { data: out, contentType: 'image/jpeg' };
  }

  async optimizeSignature(data: Buffer): Promise<{ data: Buffer; contentType: string }> {
    return this.trimmedPng(data, SIGNATURE_MAX_WIDTH_PX, SIGNATURE_MAX_HEIGHT_PX);
  }

  async optimizeLogo(data: Buffer): Promise<{ data: Buffer; contentType: string }> {
    return this.trimmedPng(data, LOGO_MAX_WIDTH_PX, LOGO_MAX_HEIGHT_PX);
  }

  async optimizePhoto(data: Buffer): Promise<{ data: Buffer; contentType: string }> {
    const out = await sharp(data)
      .rotate()
      .resize({ width: PHOTO_MAX_WIDTH_PX, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { data: out, contentType: 'image/jpeg' };
  }

  /** Empty margins trimmed (kept as is when the image is all one colour), transparency kept, PNG. */
  private async trimmedPng(data: Buffer, maxWidth: number, maxHeight: number): Promise<{ data: Buffer; contentType: string }> {
    const rotated = await sharp(data).rotate().toBuffer();
    let trimmed = rotated;
    try {
      trimmed = await sharp(rotated).trim({ threshold: 20 }).toBuffer();
    } catch {
      trimmed = rotated;
    }
    const out = await sharp(trimmed)
      .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    return { data: out, contentType: 'image/png' };
  }
}

/** A logo prints up to about 100 × 30 mm; 1200 × 400 px keeps it sharp. */
const LOGO_MAX_WIDTH_PX = 1200;
const LOGO_MAX_HEIGHT_PX = 400;
/** A cover photo covers about half an A4 page; 1600 px wide is print quality for that. */
const PHOTO_MAX_WIDTH_PX = 1600;

/** A signature prints about 45 × 18 mm; 600 × 240 px is sharp at that size. */
const SIGNATURE_MAX_WIDTH_PX = 600;
const SIGNATURE_MAX_HEIGHT_PX = 240;
